import path from "path";

import { type SourceLanguage } from "@/lib/graph/types";

const normalizeSlashes = (value: string): string => value.replace(/\\/g, "/");

export const normalizePath = (value: string): string =>
  normalizeSlashes(path.posix.normalize(normalizeSlashes(value)));

export const getLanguageFromPath = (value: string): SourceLanguage => {
  const ext = path.posix.extname(value).toLowerCase();
  switch (ext) {
    case ".ts":
      return "ts";
    case ".tsx":
      return "tsx";
    case ".js":
      return "js";
    case ".jsx":
      return "jsx";
    case ".py":
      return "py";
    default:
      return "unknown";
  }
};

type ResolveOptions = {
  knownPaths?: Set<string>;
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
  return match ?? normalized[0] ?? null;
};

export const resolveTsModulePath = (
  fromPath: string,
  moduleSpecifier: string,
  options: ResolveOptions = {},
): string | null => {
  if (!moduleSpecifier.startsWith(".")) {
    return null;
  }

  const base = normalizePath(
    path.posix.join(path.posix.dirname(normalizePath(fromPath)), moduleSpecifier),
  );
  const hasExtension = Boolean(path.posix.extname(moduleSpecifier));
  if (hasExtension) {
    return base;
  }

  const extensions = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"];
  const candidates = extensions.flatMap((ext) => [
    `${base}${ext}`,
    `${base}/index${ext}`,
  ]);

  return resolveFromCandidates(candidates, options.knownPaths);
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
    for (let i = 0; i < dots.length; i += 1) {
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
  return resolveFromCandidates(candidates, options.knownPaths);
};
