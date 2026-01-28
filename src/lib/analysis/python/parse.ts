import path from "path";

import { parser } from "@lezer/python";
import { TreeCursor } from "@lezer/common";

import { type AnalysisResult, type GraphEdgeInput, type GraphNodeInput } from "@/lib/analysis/types";
import { normalizePath, resolvePythonModulePath } from "@/lib/analysis/utils/path";
import { createEdgeId, createNodeId } from "@/lib/graph/ids";

type AnalyzeOptions = {
  repoId: number;
  filePath: string;
  content: string;
  knownPaths?: Set<string>;
};

type ImportMaps = {
  moduleImports: Map<string, string>;
  symbolImports: Map<string, string>;
};

const buildLineOffsets = (content: string): number[] => {
  const offsets = [0];
  for (let i = 0; i < content.length; i += 1) {
    if (content[i] === "\n") {
      offsets.push(i + 1);
    }
  }
  return offsets;
};

const getLineNumber = (offsets: number[], position: number): number => {
  let low = 0;
  let high = offsets.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid] <= position) {
      if (mid === offsets.length - 1 || offsets[mid + 1] > position) {
        return mid + 1;
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return 1;
};

const parseImportStatements = (content: string): ImportMaps => {
  const moduleImports = new Map<string, string>();
  const symbolImports = new Map<string, string>();
  const lines = content.split("\n");

  lines.forEach((line) => {
    const importMatch = line.match(/^\s*import\s+(.+)$/);
    if (importMatch) {
      const raw = importMatch[1].split("#")[0]?.trim();
      if (!raw) {
        return;
      }
      raw.split(",").forEach((part) => {
        const trimmed = part.trim();
        if (!trimmed) {
          return;
        }
        const [moduleName, aliasName] = trimmed.split(/\s+as\s+/);
        const moduleAlias = aliasName?.trim() ?? moduleName.trim().split(".").pop() ?? moduleName.trim();
        moduleImports.set(moduleAlias, moduleName.trim());
      });
      return;
    }

    const fromMatch = line.match(/^\s*from\s+([.\w]+)\s+import\s+(.+)$/);
    if (fromMatch) {
      const moduleName = fromMatch[1]?.trim();
      if (!moduleName) {
        return;
      }
      const raw = fromMatch[2].split("#")[0]?.replace(/[()]/g, "").trim();
      if (!raw) {
        return;
      }
      raw.split(",").forEach((part) => {
        const trimmed = part.trim();
        if (!trimmed) {
          return;
        }
        const [symbolName, aliasName] = trimmed.split(/\s+as\s+/);
        const alias = aliasName?.trim() ?? symbolName.trim();
        symbolImports.set(alias, moduleName);
      });
    }
  });

  return { moduleImports, symbolImports };
};

const createFileNode = (
  repoId: number,
  filePath: string,
): GraphNodeInput => {
  const normalizedPath = normalizePath(filePath);
  return {
    nodeId: createNodeId(repoId, "file", normalizedPath, normalizedPath),
    repoId,
    kind: "file",
    path: normalizedPath,
    name: path.posix.basename(normalizedPath),
    symbolId: normalizedPath,
    language: "py",
  };
};

const createSymbolNode = (
  repoId: number,
  filePath: string,
  kind: GraphNodeInput["kind"],
  name: string,
  startLine?: number,
  endLine?: number,
): GraphNodeInput => {
  const normalizedPath = normalizePath(filePath);
  const symbolId = `${normalizedPath}:${kind}:${name}:${startLine ?? 0}`;
  return {
    nodeId: createNodeId(repoId, kind, normalizedPath, symbolId),
    repoId,
    kind,
    path: normalizedPath,
    name,
    symbolId,
    language: "py",
    startLine,
    endLine,
  };
};

const addEdge = (
  edges: Map<string, GraphEdgeInput>,
  repoId: number,
  kind: GraphEdgeInput["kind"],
  fromNodeId: string,
  toNodeId: string,
) => {
  const edgeId = createEdgeId(repoId, kind, fromNodeId, toNodeId);
  edges.set(edgeId, {
    edgeId,
    repoId,
    kind,
    fromNodeId,
    toNodeId,
  });
};

const getNodeText = (content: string, cursor: TreeCursor): string =>
  content.slice(cursor.from, cursor.to);

const findFirstChildText = (content: string, cursor: TreeCursor, name: string): string | null => {
  if (!cursor.firstChild()) {
    return null;
  }
  do {
    if (cursor.type.name === name) {
      const text = getNodeText(content, cursor);
      cursor.parent();
      return text;
    }
  } while (cursor.nextSibling());
  cursor.parent();
  return null;
};

const extractCallTarget = (content: string, cursor: TreeCursor): string | null => {
  if (!cursor.firstChild()) {
    return null;
  }
  const expressionText = getNodeText(content, cursor);
  cursor.parent();
  const identifierMatch = expressionText.match(/^[A-Za-z_][A-Za-z0-9_]*/);
  return identifierMatch ? identifierMatch[0] : null;
};

export const analyzePythonFile = ({
  repoId,
  filePath,
  content,
  knownPaths,
}: AnalyzeOptions): AnalysisResult => {
  const normalizedPath = normalizePath(filePath);
  const fileNode = createFileNode(repoId, normalizedPath);

  const nodes = new Map<string, GraphNodeInput>();
  const edges = new Map<string, GraphEdgeInput>();
  nodes.set(fileNode.nodeId, fileNode);

  const { moduleImports, symbolImports } = parseImportStatements(content);

  const ensureFileNode = (modulePath: string): GraphNodeInput => {
    const resolved = resolvePythonModulePath(normalizedPath, modulePath, { knownPaths }) ?? modulePath;
    const normalizedTarget = normalizePath(resolved);
    const nodeId = createNodeId(repoId, "file", normalizedTarget, normalizedTarget);
    const existing = nodes.get(nodeId);
    if (existing) {
      return existing;
    }
    const node = {
      nodeId,
      repoId,
      kind: "file",
      path: normalizedTarget,
      name: path.posix.basename(normalizedTarget),
      symbolId: normalizedTarget,
      language: "unknown",
    } satisfies GraphNodeInput;
    nodes.set(nodeId, node);
    return node;
  };

  moduleImports.forEach((moduleName) => {
    const target = resolvePythonModulePath(normalizedPath, moduleName, { knownPaths });
    if (target) {
      const targetNode = ensureFileNode(target);
      addEdge(edges, repoId, "imports", fileNode.nodeId, targetNode.nodeId);
    }
  });

  symbolImports.forEach((moduleName) => {
    const target = resolvePythonModulePath(normalizedPath, moduleName, { knownPaths });
    if (target) {
      const targetNode = ensureFileNode(target);
      addEdge(edges, repoId, "imports", fileNode.nodeId, targetNode.nodeId);
    }
  });

  const offsets = buildLineOffsets(content);
  const tree = parser.parse(content);
  const cursor = tree.cursor();
  const functionStack: string[] = [];
  const classStack: string[] = [];

  const walk = (cursorNode: TreeCursor) => {
    do {
      const type = cursorNode.type.name;
      if (type === "ClassDefinition") {
        const className = findFirstChildText(content, cursorNode, "VariableName") ?? "AnonymousClass";
        const startLine = getLineNumber(offsets, cursorNode.from);
        const endLine = getLineNumber(offsets, cursorNode.to);
        const classNode = createSymbolNode(
          repoId,
          normalizedPath,
          "class",
          className,
          startLine,
          endLine,
        );
        nodes.set(classNode.nodeId, classNode);
        classStack.push(className);
        if (cursorNode.firstChild()) {
          walk(cursorNode);
          cursorNode.parent();
        }
        classStack.pop();
        continue;
      }

      if (type === "FunctionDefinition") {
        const functionName = findFirstChildText(content, cursorNode, "VariableName") ?? "function";
        const className = classStack[classStack.length - 1];
        const name = className ? `${className}.${functionName}` : functionName;
        const startLine = getLineNumber(offsets, cursorNode.from);
        const endLine = getLineNumber(offsets, cursorNode.to);
        const kind = className ? "method" : "function";
        const functionNode = createSymbolNode(
          repoId,
          normalizedPath,
          kind,
          name,
          startLine,
          endLine,
        );
        nodes.set(functionNode.nodeId, functionNode);
        functionStack.push(functionNode.nodeId);
        if (cursorNode.firstChild()) {
          walk(cursorNode);
          cursorNode.parent();
        }
        functionStack.pop();
        continue;
      }

      if (type === "CallExpression") {
        const currentFunction = functionStack[functionStack.length - 1];
        if (currentFunction) {
          const targetName = extractCallTarget(content, cursorNode);
          if (targetName) {
            const moduleFromSymbol = symbolImports.get(targetName);
            const moduleFromNamespace = moduleImports.get(targetName);
            const moduleName = moduleFromSymbol ?? moduleFromNamespace ?? null;
            if (moduleName) {
              const targetPath =
                resolvePythonModulePath(normalizedPath, moduleName, { knownPaths }) ??
                moduleName;
              const targetNode = ensureFileNode(targetPath);
              addEdge(edges, repoId, "calls", currentFunction, targetNode.nodeId);
            }
          }
        }
      }

      if (cursorNode.firstChild()) {
        walk(cursorNode);
        cursorNode.parent();
      }
    } while (cursorNode.nextSibling());
  };

  walk(cursor);

  return { nodes: Array.from(nodes.values()), edges: Array.from(edges.values()) };
};
