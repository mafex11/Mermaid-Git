import { existsSync } from "node:fs";
import path from "node:path";

const getEnvDebugInfo = (): { cwd: string; nodeEnv: string; loadedFiles: string[] } => {
  const cwd = process.cwd();
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const candidates = [
    ".env",
    ".env.local",
    `.env.${nodeEnv}`,
    `.env.${nodeEnv}.local`,
  ];
  const loadedFiles = candidates.filter((file) => existsSync(path.join(cwd, file)));

  return { cwd, nodeEnv, loadedFiles };
};

export const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    const debugInfo = getEnvDebugInfo();
    console.error(`[env] Missing required environment variable: ${key}`, debugInfo);
    throw new Error(`Missing required environment variable: ${key}`);
  }
  if (process.env.DEBUG_ENV === "1") {
    console.log(`[env] ${key} loaded (${value.length} chars)`);
  }
  return value;
};
