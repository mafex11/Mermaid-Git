"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { inngest } from "@/inngest/client";
import {
  getLatestAnalysisRun,
  getRepoBuildStatus,
  getRepoDiagram,
  listRepoDiagramSummaries,
  setRepoBuildStatus,
} from "@/lib/graph/store";

import { type RepoSummary, listInstalledRepos } from "./repos";

export type DiagramBuildResponse =
  | { ok: true; queued: true }
  | { ok: false; error: string };

export type DiagramSummary = {
  repoId: number;
  diagramUpdatedAt?: string;
  diagramNodeCount?: number;
  diagramEdgeCount?: number;
  diagramTruncated?: boolean;
};

export type DiagramSummariesResponse =
  | { ok: true; summaries: DiagramSummary[] }
  | { ok: false; error: string };

export type DiagramResponse =
  | {
      ok: true;
      diagram: {
        mermaid: string;
        updatedAt?: string;
        nodeCount?: number;
        edgeCount?: number;
        truncated?: boolean;
      } | null;
    }
  | { ok: false; error: string };

export type DiagramBuildStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "idle";

export type BuildStatusResponse =
  | {
      ok: true;
      status: DiagramBuildStatus;
      updatedAt?: string;
      error?: string;
      progress?: {
        processedFiles: number;
        totalFiles: number;
        percent: number;
      };
    }
  | { ok: false; error: string };

const requireSession = async () => {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    return null;
  }
  return session;
};

const ensureRepoAccess = async (
  repoId: number,
): Promise<{ ok: true; repo: RepoSummary } | { ok: false; error: string }> => {
  const reposResult = await listInstalledRepos();
  if (!reposResult.ok) {
    return { ok: false, error: reposResult.error };
  }
  const repo = reposResult.repos.find((item) => item.id === repoId);
  if (!repo) {
    return { ok: false, error: "Repository not found" };
  }
  return { ok: true, repo };
};

export const startDiagramBuild = async (repoId: number): Promise<DiagramBuildResponse> => {
  const session = await requireSession();
  if (!session) {
    return { ok: false, error: "Unauthorized" };
  }

  const repoResult = await ensureRepoAccess(repoId);
  if (!repoResult.ok) {
    return { ok: false, error: repoResult.error };
  }

  await setRepoBuildStatus({
    repoId,
    status: "queued",
  });

  await inngest.send({
    name: "graph/update.requested",
    id: `manual:${repoResult.repo.id}:${Date.now()}`,
    data: {
      installationId: repoResult.repo.installationId,
      repository: {
        id: repoResult.repo.id,
        name: repoResult.repo.name,
        fullName: repoResult.repo.fullName,
        defaultBranch: repoResult.repo.defaultBranch,
      },
      mode: "full",
      ref: repoResult.repo.defaultBranch,
      before: "0",
      after: repoResult.repo.defaultBranch,
    },
  });

  return { ok: true, queued: true };
};

export const listDiagramSummaries = async (): Promise<DiagramSummariesResponse> => {
  const session = await requireSession();
  if (!session) {
    return { ok: false, error: "Unauthorized" };
  }

  const reposResult = await listInstalledRepos();
  if (!reposResult.ok) {
    return { ok: false, error: reposResult.error };
  }

  const repoIds = reposResult.repos.map((repo) => repo.id);
  const summaries = await listRepoDiagramSummaries(repoIds);
  const normalized = summaries.map((summary) => ({
    repoId: summary.repoId,
    diagramUpdatedAt: summary.diagramUpdatedAt?.toISOString(),
    diagramNodeCount: summary.diagramNodeCount,
    diagramEdgeCount: summary.diagramEdgeCount,
    diagramTruncated: summary.diagramTruncated,
  }));

  return { ok: true, summaries: normalized };
};

export const getDiagramForRepo = async (repoId: number): Promise<DiagramResponse> => {
  const session = await requireSession();
  if (!session) {
    return { ok: false, error: "Unauthorized" };
  }

  const repoResult = await ensureRepoAccess(repoId);
  if (!repoResult.ok) {
    return repoResult;
  }

  const diagram = await getRepoDiagram(repoId);
  if (!diagram?.diagramMermaid) {
    return { ok: true, diagram: null };
  }

  return {
    ok: true,
    diagram: {
      mermaid: diagram.diagramMermaid,
      updatedAt: diagram.diagramUpdatedAt?.toISOString(),
      nodeCount: diagram.diagramNodeCount,
      edgeCount: diagram.diagramEdgeCount,
      truncated: diagram.diagramTruncated,
    },
  };
};

export const getDiagramBuildStatus = async (
  repoId: number,
): Promise<BuildStatusResponse> => {
  const session = await requireSession();
  if (!session) {
    return { ok: false, error: "Unauthorized" };
  }

  const repoResult = await ensureRepoAccess(repoId);
  if (!repoResult.ok) {
    return { ok: false, error: repoResult.error };
  }

  const [buildStatus, latestRun] = await Promise.all([
    getRepoBuildStatus(repoId),
    getLatestAnalysisRun(repoId),
  ]);

  const status =
    buildStatus?.buildStatus ?? latestRun?.status ?? "idle";
  const errorMessage = buildStatus?.buildError ?? latestRun?.error;
  const updatedAt =
    buildStatus?.buildUpdatedAt?.toISOString() ?? latestRun?.updatedAt?.toISOString();

  const totalFiles = latestRun?.totalFiles ?? 0;
  const processedFiles = latestRun?.processedFiles ?? 0;
  const progress =
    totalFiles > 0
      ? {
          processedFiles,
          totalFiles,
          percent: Math.min(100, Math.round((processedFiles / totalFiles) * 100)),
        }
      : undefined;

  return {
    ok: true,
    status,
    updatedAt,
    error: errorMessage,
    progress,
  };
};
