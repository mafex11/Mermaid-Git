import path from "path";
import ts from "typescript";

import { type FileSnapshot } from "@/lib/analysis/types";
import { type PathAlias, type TsconfigOptions, normalizePath } from "@/lib/analysis/utils/path";

const parseTsconfig = (content: string): Record<string, unknown> | null => {
  const parsed = ts.parseConfigFileTextToJson("tsconfig.json", content);
  if (parsed.error || !parsed.config) {
    return null;
  }
  return parsed.config as Record<string, unknown>;
};

const pickConfig = (files: FileSnapshot[]): FileSnapshot | null => {
  const candidates = files.filter(
    (file) => file.path.endsWith("tsconfig.json") || file.path.endsWith("jsconfig.json"),
  );
  if (candidates.length === 0) {
    return null;
  }
  const sorted = [...candidates].sort(
    (a, b) => a.path.split("/").length - b.path.split("/").length,
  );
  return sorted[0] ?? null;
};

export const extractTsconfigOptions = (
  files: FileSnapshot[],
): TsconfigOptions => {
  const configFile = pickConfig(files);
  if (!configFile) {
    return {};
  }
  const parsed = parseTsconfig(configFile.content);
  if (!parsed) {
    return {};
  }

  const baseDir = path.posix.dirname(normalizePath(configFile.path));
  const compilerOptions = (parsed.compilerOptions ?? {}) as Record<string, unknown>;
  const baseUrlRaw = (compilerOptions.baseUrl as string | undefined) ?? ".";
  const baseUrl = normalizePath(path.posix.join(baseDir, baseUrlRaw));

  const rawPaths = (compilerOptions.paths ?? {}) as Record<string, string[]>;
  const pathAliases = Object.entries(rawPaths).map(([pattern, targets]) => ({
    pattern,
    targets: targets.map((target) => normalizePath(target)),
  }));

  return {
    baseUrl,
    pathAliases: pathAliases.length > 0 ? pathAliases : undefined,
  };
};
