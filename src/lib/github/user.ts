import { fetchGitHubJson } from "@/lib/github/api";

export type GitHubInstallation = {
  id: number;
  account: {
    login: string;
    type: "User" | "Organization";
  };
};

export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  owner: {
    login: string;
  };
};

type InstallationListResponse = {
  installations: GitHubInstallation[];
};

type InstallationReposResponse = {
  repositories: GitHubRepository[];
};

export const listUserInstallations = async (
  accessToken: string,
): Promise<GitHubInstallation[]> => {
  const response = await fetchGitHubJson<InstallationListResponse>(
    "/user/installations",
    accessToken,
  );
  return response.installations;
};

export const listInstallationRepositories = async (
  accessToken: string,
  installationId: number,
): Promise<GitHubRepository[]> => {
  const response = await fetchGitHubJson<InstallationReposResponse>(
    `/user/installations/${installationId}/repositories`,
    accessToken,
  );
  return response.repositories;
};
