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
  const candidates = files.filter((file) =>
    /(^|\/)(tsconfig|jsconfig)(\..*)?\.json$/.test(file.path),
  );
  if (candidates.length === 0) {
    return null;
  }
  const sorted = [...candidates].sort(
    (a, b) => a.path.split("/").length - b.path.split("/").length,
  );
  return sorted[0] ?? null;
};

type ResolvedConfig = {
  compilerOptions: Record<string, unknown>;
  baseUrl?: string;
  configPath: string;
};

const resolveConfigPath = (basePath: string, extended: string): string | null => {
  if (!extended.startsWith(".")) {
    return null;
  }
  const baseDir = path.posix.dirname(basePath);
  const raw = extended.endsWith(".json") ? extended : `${extended}.json`;
  return normalizePath(path.posix.join(baseDir, raw));
};

const mergeCompilerOptions = (
  baseOptions: Record<string, unknown>,
  overrideOptions: Record<string, unknown>,
): Record<string, unknown> => {
  const basePaths = (baseOptions.paths ?? {}) as Record<string, string[]>;
  const overridePaths = (overrideOptions.paths ?? {}) as Record<string, string[]>;
  return {
    ...baseOptions,
    ...overrideOptions,
    paths: { ...basePaths, ...overridePaths },
  };
};

const resolveBaseUrl = (configPath: string, rawBaseUrl?: string): string | undefined => {
  if (!rawBaseUrl) {
    return undefined;
  }
  const baseDir = path.posix.dirname(normalizePath(configPath));
  return normalizePath(path.posix.join(baseDir, rawBaseUrl));
};

const buildConfigMap = (files: FileSnapshot[]): Map<string, string> => {
  const configs = files.filter((file) =>
    /(^|\/)(tsconfig|jsconfig)(\..*)?\.json$/.test(file.path),
  );
  return new Map(configs.map((file) => [normalizePath(file.path), file.content]));
};

const loadConfig = (
  configPath: string,
  configMap: Map<string, string>,
  depth: number,
  visited: Set<string>,
): ResolvedConfig | null => {
  if (depth > 5 || visited.has(configPath)) {
    return null;
  }
  const content = configMap.get(configPath);
  if (!content) {
    return null;
  }
  const parsed = parseTsconfig(content);
  if (!parsed) {
    return null;
  }

  visited.add(configPath);
  const compilerOptions = (parsed.compilerOptions ?? {}) as Record<string, unknown>;
  const extendsValue = parsed.extends as string | undefined;
  const resolvedExtends = extendsValue ? resolveConfigPath(configPath, extendsValue) : null;
  const baseConfig = resolvedExtends
    ? loadConfig(resolvedExtends, configMap, depth + 1, visited)
    : null;

  const mergedOptions = baseConfig
    ? mergeCompilerOptions(baseConfig.compilerOptions, compilerOptions)
    : compilerOptions;

  const baseUrl = resolveBaseUrl(configPath, compilerOptions.baseUrl as string | undefined)
    ?? baseConfig?.baseUrl;

  return {
    compilerOptions: mergedOptions,
    baseUrl,
    configPath,
  };
};

export const extractTsconfigOptions = (
  files: FileSnapshot[],
): TsconfigOptions => {
  const configFile = pickConfig(files);
  if (!configFile) {
    return {};
  }
  const configMap = buildConfigMap(files);
  const resolved = loadConfig(normalizePath(configFile.path), configMap, 0, new Set());
  if (!resolved) {
    return {};
  }

  const compilerOptions = resolved.compilerOptions;
  const rawPaths = (compilerOptions.paths ?? {}) as Record<string, string[]>;
  const pathAliases = Object.entries(rawPaths).map(([pattern, targets]) => ({
    pattern,
    targets: targets.map((target) => normalizePath(target)),
  }));
  const baseUrl =
    resolved.baseUrl ??
    (pathAliases.length > 0
      ? normalizePath(path.posix.dirname(resolved.configPath))
      : undefined);

  return {
    baseUrl,
    pathAliases: pathAliases.length > 0 ? pathAliases : undefined,
  };
};
