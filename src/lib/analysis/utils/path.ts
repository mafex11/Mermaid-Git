import path from "path";

import { type SourceLanguage } from "@/lib/graph/types";

const normalizeSlashes = (value: string): string => value.replace(/\\/g, "/");

export const normalizePath = (value: string): string =>
  normalizeSlashes(path.posix.normalize(normalizeSlashes(value)));

export const getLanguageFromPath = (value: string): SourceLanguage => {
  const ext = path.posix.extname(value).toLowerCase();
  switch (ext) {
    case ".ts":
    case ".mts":
    case ".cts":
      return "ts";
    case ".tsx":
      return "tsx";
    case ".js":
    case ".mjs":
    case ".cjs":
      return "js";
    case ".jsx":
      return "jsx";
    case ".py":
      return "py";
    default:
      return "unknown";
  }
};

export type PathAlias = {
  pattern: string;
  targets: string[];
};

export type TsconfigOptions = {
  baseUrl?: string;
  pathAliases?: PathAlias[];
};

type ResolveOptions = {
  knownPaths?: Set<string>;
  baseUrl?: string;
  pathAliases?: PathAlias[];
};

const resolveFromCandidates = (
  candidates: string[],
  knownPaths?: Set<string>,
): string | null => {
  if (!knownPaths) {
    return candidates[0] ?? null;
  }
  const normalized = candidates.map((candidate) => normalizePath(candidate));
  const match = normalized.find((candidate) => knownPaths.has(candidate));
  return match ?? null;
};

const resolveWithExtensions = (
  base: string,
  options: ResolveOptions,
): string | null => {
  const normalizedBase = normalizePath(base);
  const hasExtension = Boolean(path.posix.extname(normalizedBase));
  if (hasExtension) {
    return resolveFromCandidates([normalizedBase], options.knownPaths);
  }
  const extensions = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mts",
    ".cts",
    ".mjs",
    ".cjs",
    ".json",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".svg",
  ];
  const candidates = extensions.flatMap((ext) => [
    `${normalizedBase}${ext}`,
    `${normalizedBase}/index${ext}`,
  ]);
  return resolveFromCandidates(candidates, options.knownPaths);
};

const resolveAlias = (
  moduleSpecifier: string,
  options: ResolveOptions,
): string | null => {
  if (!options.pathAliases || options.pathAliases.length === 0) {
    return null;
  }
  for (const alias of options.pathAliases) {
    const wildcardIndex = alias.pattern.indexOf("*");
    if (wildcardIndex >= 0) {
      const prefix = alias.pattern.slice(0, wildcardIndex);
      const suffix = alias.pattern.slice(wildcardIndex + 1);
      if (!moduleSpecifier.startsWith(prefix) || !moduleSpecifier.endsWith(suffix)) {
        continue;
      }
      const match = moduleSpecifier.slice(prefix.length, moduleSpecifier.length - suffix.length);
      for (const target of alias.targets) {
        const replaced = target.replace("*", match);
        const resolved = resolveWithExtensions(
          options.baseUrl ? path.posix.join(options.baseUrl, replaced) : replaced,
          options,
        );
        if (resolved) {
          return resolved;
        }
      }
      continue;
    }
    if (moduleSpecifier === alias.pattern) {
      for (const target of alias.targets) {
        const resolved = resolveWithExtensions(
          options.baseUrl ? path.posix.join(options.baseUrl, target) : target,
          options,
        );
        if (resolved) {
          return resolved;
        }
      }
    }
  }
  return null;
};

export const buildResolveOptions = (
  options?: TsconfigOptions,
  knownPaths?: Set<string>,
): ResolveOptions => ({
  knownPaths,
  baseUrl: options?.baseUrl,
  pathAliases: options?.pathAliases,
});

export const resolveTsModulePath = (
  fromPath: string,
  moduleSpecifier: string,
  options: ResolveOptions = {},
): string | null => {
  const cleanSpecifier = moduleSpecifier.split(/[?#]/)[0]?.trim() ?? "";
  if (!cleanSpecifier) {
    return null;
  }

  // Try configured path aliases first
  const aliasResolved = resolveAlias(cleanSpecifier, options);
  if (aliasResolved) {
    return aliasResolved;
  }

  // Handle relative imports
  if (cleanSpecifier.startsWith(".")) {
    const base = path.posix.join(
      path.posix.dirname(normalizePath(fromPath)),
      cleanSpecifier,
    );
    return resolveWithExtensions(base, options);
  }

  // Handle common alias patterns as fallback (when no tsconfig paths configured)
  const commonAliasResult = resolveCommonAliases(cleanSpecifier, options);
  if (commonAliasResult) {
    return commonAliasResult;
  }

  // Try baseUrl resolution
  if (options.baseUrl) {
    const resolved = resolveWithExtensions(
      path.posix.join(options.baseUrl, cleanSpecifier),
      options,
    );
    if (resolved) {
      return resolved;
    }
  }

  // Fallback: try common project structures
  if (options.knownPaths) {
    const fallbackPrefixes = ["src", "lib", "app", ""];
    for (const prefix of fallbackPrefixes) {
      const candidate = prefix ? path.posix.join(prefix, cleanSpecifier) : cleanSpecifier;
      const resolved = resolveWithExtensions(candidate, options);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
};

const resolveCommonAliases = (
  specifier: string,
  options: ResolveOptions,
): string | null => {
  // Common alias patterns used in projects
  const commonAliases: Array<{ prefix: string; replacements: string[] }> = [
    { prefix: "@/", replacements: ["src/", ""] },
    { prefix: "~/", replacements: ["src/", ""] },
    { prefix: "@components/", replacements: ["src/components/", "components/"] },
    { prefix: "@lib/", replacements: ["src/lib/", "lib/"] },
    { prefix: "@utils/", replacements: ["src/utils/", "utils/"] },
    { prefix: "@hooks/", replacements: ["src/hooks/", "hooks/"] },
    { prefix: "@app/", replacements: ["src/app/", "app/"] },
  ];

  for (const alias of commonAliases) {
    if (!specifier.startsWith(alias.prefix)) {
      continue;
    }
    const remainder = specifier.slice(alias.prefix.length);
    for (const replacement of alias.replacements) {
      const candidate = replacement + remainder;
      const resolved = resolveWithExtensions(candidate, options);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
};

export const resolvePythonModulePath = (
  fromPath: string,
  moduleName: string,
  options: ResolveOptions = {},
): string | null => {
  const normalizedFrom = normalizePath(fromPath);
  let baseDir = path.posix.dirname(normalizedFrom);
  let modulePath = moduleName;

  if (moduleName.startsWith(".")) {
    const match = moduleName.match(/^(\.+)(.*)$/);
    const dots = match?.[1] ?? "";
    modulePath = match?.[2] ?? "";
    // In Python: 1 dot = current dir, 2 dots = parent, N dots = N-1 levels up
    // So we go up (dots.length - 1) times
    for (let i = 1; i < dots.length; i += 1) {
      baseDir = path.posix.dirname(baseDir);
    }
  } else {
    baseDir = "";
  }

  const normalizedModule = modulePath
    ? modulePath.replace(/\./g, "/")
    : "";
  const resolvedBase = normalizePath(
    normalizedModule ? path.posix.join(baseDir, normalizedModule) : baseDir,
  );

  const candidates = [`${resolvedBase}.py`, `${resolvedBase}/__init__.py`];
  const resolved = resolveFromCandidates(candidates, options.knownPaths);
  if (resolved) {
    return resolved;
  }

  if (options.knownPaths) {
    const srcCandidates = candidates.map((candidate) =>
      normalizePath(path.posix.join("src", candidate)),
    );
    const srcResolved = resolveFromCandidates(srcCandidates, options.knownPaths);
    if (srcResolved) {
      return srcResolved;
    }
  }

  return null;
};
