import { type FileSnapshot } from "@/lib/analysis/types";
import { getLanguageFromPath, normalizePath } from "@/lib/analysis/utils/path";
import { createInstallationToken } from "@/lib/github/app";
import { fetchGitHubJson } from "@/lib/github/api";

type GitTreeItem = {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
};

type GitTreeResponse = {
  tree: GitTreeItem[];
  truncated: boolean;
};

type GitBlobResponse = {
  content: string;
  encoding: "base64";
  size: number;
};

type GitCommitResponse = {
  sha: string;
};

type GitCompareFile = {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  sha?: string;
  previous_filename?: string;
};

type GitCompareResponse = {
  files: GitCompareFile[];
};

type RepoSnapshotOptions = {
  maxFileSize?: number;
  concurrency?: number;
};

export type RepoSnapshotResult = {
  commitSha: string;
  files: FileSnapshot[];
  knownPaths: string[];
  removedPaths: string[];
};

const defaultMaxFileSize = 512 * 1024;
const defaultConcurrency = 6;

const decodeBase64 = (value: string): string =>
  Buffer.from(value, "base64").toString("utf8");

const isSupportedFile = (filePath: string): boolean =>
  getLanguageFromPath(filePath) !== "unknown";

const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  handler: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) {
        return;
      }
      results[current] = await handler(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
};

const fetchRepoTree = async (
  token: string,
  owner: string,
  repo: string,
  ref: string,
): Promise<GitTreeItem[]> => {
  const response = await fetchGitHubJson<GitTreeResponse>(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    token,
  );
  if (response.truncated) {
    throw new Error("Repository tree is too large to fetch");
  }
  return response.tree;
};

const fetchCommitSha = async (
  token: string,
  owner: string,
  repo: string,
  ref: string,
): Promise<string> => {
  const response = await fetchGitHubJson<GitCommitResponse>(
    `/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`,
    token,
  );
  return response.sha;
};

const fetchCompare = async (
  token: string,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<GitCompareResponse> =>
  fetchGitHubJson<GitCompareResponse>(
    `/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(
      head,
    )}`,
    token,
  );

const fetchBlob = async (
  token: string,
  owner: string,
  repo: string,
  sha: string,
): Promise<GitBlobResponse> =>
  fetchGitHubJson<GitBlobResponse>(
    `/repos/${owner}/${repo}/git/blobs/${encodeURIComponent(sha)}`,
    token,
  );

const toFileSnapshot = (
  filePath: string,
  content: string,
): FileSnapshot => ({
  path: normalizePath(filePath),
  content,
  language: getLanguageFromPath(filePath),
});

export const getInstallationAccessToken = async (
  installationId: number,
): Promise<string> => {
  const response = await createInstallationToken(installationId);
  return response.token;
};

export const buildFullRepoSnapshot = async (
  installationId: number,
  owner: string,
  repo: string,
  ref: string,
  options: RepoSnapshotOptions = {},
): Promise<RepoSnapshotResult> => {
  const token = await getInstallationAccessToken(installationId);
  const commitSha = await fetchCommitSha(token, owner, repo, ref);
  const tree = await fetchRepoTree(token, owner, repo, commitSha);
  const maxFileSize = options.maxFileSize ?? defaultMaxFileSize;
  const concurrency = options.concurrency ?? defaultConcurrency;

  const fileEntries = tree.filter((entry) => entry.type === "blob");
  const knownPaths = fileEntries
    .map((entry) => normalizePath(entry.path))
    .filter(isSupportedFile);

  const supportedEntries = fileEntries.filter((entry) => isSupportedFile(entry.path));
  const snapshots = await mapWithConcurrency(
    supportedEntries,
    concurrency,
    async (entry) => {
      try {
        const blob = await fetchBlob(token, owner, repo, entry.sha);
        if (blob.size > maxFileSize) {
          return null;
        }
        if (blob.encoding !== "base64") {
          return null;
        }
        return toFileSnapshot(entry.path, decodeBase64(blob.content));
      } catch {
        return null;
      }
    },
  );

  return {
    commitSha,
    files: snapshots.filter((item): item is FileSnapshot => Boolean(item)),
    knownPaths,
    removedPaths: [],
  };
};

export const buildDiffRepoSnapshot = async (
  installationId: number,
  owner: string,
  repo: string,
  base: string,
  head: string,
  options: RepoSnapshotOptions = {},
): Promise<RepoSnapshotResult> => {
  const token = await getInstallationAccessToken(installationId);
  const compare = await fetchCompare(token, owner, repo, base, head);
  const maxFileSize = options.maxFileSize ?? defaultMaxFileSize;
  const concurrency = options.concurrency ?? defaultConcurrency;

  const removedPaths = compare.files.flatMap((file) => {
    if (file.status === "removed") {
      return [normalizePath(file.filename)];
    }
    if (file.status === "renamed" && file.previous_filename) {
      return [normalizePath(file.previous_filename)];
    }
    return [];
  });
  const changedFiles = compare.files.filter(
    (file) => file.status !== "removed" && isSupportedFile(file.filename),
  );

  const tree = await fetchRepoTree(token, owner, repo, head);
  const knownPaths = tree
    .filter((entry) => entry.type === "blob")
    .map((entry) => normalizePath(entry.path))
    .filter(isSupportedFile);

  const snapshots = await mapWithConcurrency(
    changedFiles,
    concurrency,
    async (file) => {
      if (!file.sha) {
        return null;
      }
      try {
        const blob = await fetchBlob(token, owner, repo, file.sha);
        if (blob.size > maxFileSize) {
          return null;
        }
        if (blob.encoding !== "base64") {
          return null;
        }
        return toFileSnapshot(file.filename, decodeBase64(blob.content));
      } catch {
        return null;
      }
    },
  );

  return {
    commitSha: head,
    files: snapshots.filter((item): item is FileSnapshot => Boolean(item)),
    knownPaths,
    removedPaths,
  };
};
