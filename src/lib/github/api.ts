const githubApiBaseUrl = "https://api.github.com";

const defaultHeaders = {
  Accept: "application/vnd.github+json",
  "User-Agent": "repo-graph-platform",
  "X-GitHub-Api-Version": "2022-11-28",
};

type GitHubRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

export const fetchGitHubJson = async <T>(
  path: string,
  token: string,
  options: GitHubRequestOptions = {},
): Promise<T> => {
  const response = await fetch(`${githubApiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...defaultHeaders,
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    body: options.body,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub API ${response.status}: ${message}`);
  }

  return (await response.json()) as T;
};
