import { createSign } from "crypto";

import { requireEnv } from "@/lib/env";
import { fetchGitHubJson } from "@/lib/github/api";

type InstallationTokenResponse = {
  token: string;
  expires_at: string;
};

const getAppId = (): number => {
  const appId = Number(requireEnv("GITHUB_APP_ID"));
  if (Number.isNaN(appId)) {
    throw new Error("GITHUB_APP_ID must be a number");
  }
  return appId;
};

const getPrivateKey = (): string => {
  const raw = requireEnv("GITHUB_APP_PRIVATE_KEY").trim();
  const decoded = raw.includes("BEGIN")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return decoded.replace(/\\n/g, "\n");
};

const toBase64Url = (value: string | Buffer): string =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

export const createAppJwt = (): string => {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      iat: now - 60,
      exp: now + 600,
      iss: getAppId(),
    }),
  );
  const data = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(data);
  signer.end();
  const signature = signer.sign(getPrivateKey());
  return `${data}.${toBase64Url(signature)}`;
};

export const createInstallationToken = async (
  installationId: number,
): Promise<InstallationTokenResponse> => {
  const appJwt = createAppJwt();
  return fetchGitHubJson<InstallationTokenResponse>(
    `/app/installations/${installationId}/access_tokens`,
    appJwt,
    { method: "POST" },
  );
};
