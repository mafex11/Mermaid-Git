import { analyzePythonFile } from "@/lib/analysis/python/parse";
import { analyzeTypeScriptFile } from "@/lib/analysis/ts/parse";
import { type AnalysisResult, type FileSnapshot, type GraphEdgeInput, type GraphNodeInput } from "@/lib/analysis/types";
import { getLanguageFromPath, normalizePath } from "@/lib/analysis/utils/path";
import { createRunId } from "@/lib/graph/ids";
import {
  deleteGraphNodesByPath,
  upsertAnalysisRun,
  upsertGraphEdges,
  upsertGraphNodes,
  upsertRepo,
} from "@/lib/graph/store";

type RepoInfo = {
  repoId: number;
  installationId: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
};

type UpdateGraphInput = {
  repo: RepoInfo;
  commitSha: string;
  files: FileSnapshot[];
  removedPaths?: string[];
  knownPaths?: string[];
};

const mergeResults = (
  targetNodes: Map<string, GraphNodeInput>,
  targetEdges: Map<string, GraphEdgeInput>,
  result: AnalysisResult,
) => {
  result.nodes.forEach((node) => {
    targetNodes.set(node.nodeId, node);
  });
  result.edges.forEach((edge) => {
    targetEdges.set(edge.edgeId, edge);
  });
};

export const updateGraphForFiles = async (
  input: UpdateGraphInput,
): Promise<{ nodes: number; edges: number }> => {
  const normalizedKnownPaths = input.knownPaths
    ? new Set(input.knownPaths.map((item) => normalizePath(item)))
    : undefined;

  const runId = createRunId(input.repo.repoId, input.commitSha);
  const startedAt = new Date();
  await upsertAnalysisRun({
    runId,
    repoId: input.repo.repoId,
    commitSha: input.commitSha,
    status: "running",
    startedAt,
  });

  try {
    await upsertRepo({
      repoId: input.repo.repoId,
      installationId: input.repo.installationId,
      name: input.repo.name,
      fullName: input.repo.fullName,
      owner: input.repo.owner,
      defaultBranch: input.repo.defaultBranch,
    });

    const removed = input.removedPaths ?? [];
    const changedPaths = input.files.map((file) => normalizePath(file.path));
    const uniquePaths = new Set([...removed, ...changedPaths]);
    for (const pathToDelete of uniquePaths) {
      await deleteGraphNodesByPath(input.repo.repoId, normalizePath(pathToDelete));
    }

    const nodes = new Map<string, GraphNodeInput>();
    const edges = new Map<string, GraphEdgeInput>();

    for (const file of input.files) {
      const normalizedPath = normalizePath(file.path);
      const language = file.language ?? getLanguageFromPath(normalizedPath);
      if (language === "py") {
        mergeResults(
          nodes,
          edges,
          analyzePythonFile({
            repoId: input.repo.repoId,
            filePath: normalizedPath,
            content: file.content,
            knownPaths: normalizedKnownPaths,
          }),
        );
        continue;
      }
      if (language === "ts" || language === "tsx" || language === "js" || language === "jsx") {
        mergeResults(
          nodes,
          edges,
          analyzeTypeScriptFile({
            repoId: input.repo.repoId,
            filePath: normalizedPath,
            content: file.content,
            knownPaths: normalizedKnownPaths,
          }),
        );
      }
    }

    await upsertGraphNodes(Array.from(nodes.values()));
    await upsertGraphEdges(Array.from(edges.values()));

    await upsertAnalysisRun({
      runId,
      repoId: input.repo.repoId,
      commitSha: input.commitSha,
      status: "succeeded",
      startedAt,
      finishedAt: new Date(),
    });

    return { nodes: nodes.size, edges: edges.size };
  } catch (error) {
    await upsertAnalysisRun({
      runId,
      repoId: input.repo.repoId,
      commitSha: input.commitSha,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      startedAt,
      finishedAt: new Date(),
    });
    throw error;
  }
};
