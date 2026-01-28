"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  type GitHubInstallation,
  type GitHubRepository,
  listInstallationRepositories,
  listUserInstallations,
} from "@/lib/github/user";

export type InstallationSummary = {
  id: number;
  accountLogin: string;
  accountType: "User" | "Organization";
};

export type RepoSummary = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  htmlUrl: string;
  defaultBranch: string;
  installationId: number;
};

export type InstallationsResponse =
  | { ok: true; installations: InstallationSummary[] }
  | { ok: false; error: string };

export type ReposResponse =
  | { ok: true; repos: RepoSummary[] }
  | { ok: false; error: string };

const getGitHubAccessToken = async (): Promise<
  { ok: true; accessToken: string } | { ok: false; error: string }
> => {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const result = await auth.api.getAccessToken({
      body: { providerId: "github" },
      headers: requestHeaders,
    });

    if (!result?.accessToken) {
      return { ok: false, error: "GitHub account not linked" };
    }

    return { ok: true, accessToken: result.accessToken };
  } catch {
    return { ok: false, error: "GitHub account not linked" };
  }
};

const mapInstallations = (
  installations: GitHubInstallation[],
): InstallationSummary[] =>
  installations.map((installation) => ({
    id: installation.id,
    accountLogin: installation.account.login,
    accountType: installation.account.type,
  }));

const buildRepoSummaries = (
  repositories: GitHubRepository[],
  installationId: number,
): RepoSummary[] =>
  repositories.map((repository) => ({
    id: repository.id,
    name: repository.name,
    fullName: repository.full_name,
    owner: repository.owner.login,
    private: repository.private,
    htmlUrl: repository.html_url,
    defaultBranch: repository.default_branch,
    installationId,
  }));

export const listGitHubInstallations = async (): Promise<InstallationsResponse> => {
  const tokenResult = await getGitHubAccessToken();
  if (!tokenResult.ok) {
    return tokenResult;
  }

  const installations = await listUserInstallations(tokenResult.accessToken);
  return { ok: true, installations: mapInstallations(installations) };
};

export const listInstalledRepos = async (): Promise<ReposResponse> => {
  const tokenResult = await getGitHubAccessToken();
  if (!tokenResult.ok) {
    return tokenResult;
  }

  const installations = await listUserInstallations(tokenResult.accessToken);
  const reposByInstallation = await Promise.all(
    installations.map(async (installation) => ({
      installationId: installation.id,
      repositories: await listInstallationRepositories(
        tokenResult.accessToken,
        installation.id,
      ),
    })),
  );

  const repoMap = new Map<number, RepoSummary>();
  for (const entry of reposByInstallation) {
    for (const repo of buildRepoSummaries(
      entry.repositories,
      entry.installationId,
    )) {
      repoMap.set(repo.id, repo);
    }
  }

  return { ok: true, repos: Array.from(repoMap.values()) };
};
