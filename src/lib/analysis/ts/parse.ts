import path from "path";
import ts from "typescript";

import { type AnalysisResult, type GraphEdgeInput, type GraphNodeInput } from "@/lib/analysis/types";
import { normalizePath, resolveTsModulePath } from "@/lib/analysis/utils/path";
import { createEdgeId, createNodeId } from "@/lib/graph/ids";
import { type GraphEdgeKind, type GraphNodeKind } from "@/lib/graph/types";

type AnalyzeOptions = {
  repoId: number;
  filePath: string;
  content: string;
  knownPaths?: Set<string>;
};

type FunctionContext = {
  nodeId: string;
  name: string;
};

const getLineRange = (sourceFile: ts.SourceFile, node: ts.Node) => {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return { startLine: start.line + 1, endLine: end.line + 1 };
};

const createFileNode = (
  repoId: number,
  filePath: string,
  language: GraphNodeInput["language"],
): GraphNodeInput => {
  const normalizedPath = normalizePath(filePath);
  return {
    nodeId: createNodeId(repoId, "file", normalizedPath, normalizedPath),
    repoId,
    kind: "file",
    path: normalizedPath,
    name: path.posix.basename(normalizedPath),
    symbolId: normalizedPath,
    language,
  };
};

const createFunctionNode = (
  repoId: number,
  filePath: string,
  language: GraphNodeInput["language"],
  kind: GraphNodeKind,
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
    language,
    startLine,
    endLine,
  };
};

const addEdge = (
  edges: Map<string, GraphEdgeInput>,
  repoId: number,
  kind: GraphEdgeKind,
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

export const analyzeTypeScriptFile = ({
  repoId,
  filePath,
  content,
  knownPaths,
}: AnalyzeOptions): AnalysisResult => {
  const normalizedPath = normalizePath(filePath);
  const language = normalizedPath.endsWith(".tsx")
    ? "tsx"
    : normalizedPath.endsWith(".jsx")
      ? "jsx"
      : normalizedPath.endsWith(".mjs") || normalizedPath.endsWith(".cjs")
        ? "js"
        : normalizedPath.endsWith(".js")
          ? "js"
          : "ts";

  const sourceFile = ts.createSourceFile(
    normalizedPath,
    content,
    ts.ScriptTarget.Latest,
    true,
    language === "tsx" || language === "jsx"
      ? ts.ScriptKind.TSX
      : language === "js"
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS,
  );

  const nodes = new Map<string, GraphNodeInput>();
  const edges = new Map<string, GraphEdgeInput>();
  const localFunctions = new Map<string, string>();
  const importMap = new Map<string, string>();
  const namespaceImports = new Map<string, string>();

  const fileNode = createFileNode(repoId, normalizedPath, language);
  nodes.set(fileNode.nodeId, fileNode);

  const ensureFileNode = (targetPath: string): GraphNodeInput => {
    const normalizedTarget = normalizePath(targetPath);
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

  const addImport = (localName: string, modulePath: string) => {
    importMap.set(localName, modulePath);
  };

  const registerImports = (node: ts.ImportDeclaration) => {
    if (!ts.isStringLiteral(node.moduleSpecifier)) {
      return;
    }
    const resolvedPath = resolveTsModulePath(
      normalizedPath,
      node.moduleSpecifier.text,
      { knownPaths },
    );
    if (!resolvedPath) {
      return;
    }
    const targetFile = ensureFileNode(resolvedPath);
    addEdge(edges, repoId, "imports", fileNode.nodeId, targetFile.nodeId);

    const clause = node.importClause;
    if (!clause) {
      return;
    }
    if (clause.name) {
      addImport(clause.name.text, resolvedPath);
    }
    if (clause.namedBindings) {
      if (ts.isNamespaceImport(clause.namedBindings)) {
        namespaceImports.set(clause.namedBindings.name.text, resolvedPath);
      } else if (ts.isNamedImports(clause.namedBindings)) {
        clause.namedBindings.elements.forEach((element) => {
          addImport(element.name.text, resolvedPath);
        });
      }
    }
  };

  const handleVariableFunction = (node: ts.VariableDeclaration) => {
    if (!ts.isIdentifier(node.name)) {
      return;
    }
    const initializer = node.initializer;
    if (!initializer) {
      return;
    }
    if (!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer)) {
      return;
    }
    const { startLine, endLine } = getLineRange(sourceFile, node);
    const name = node.name.text;
    const functionNode = createFunctionNode(
      repoId,
      normalizedPath,
      language,
      "function",
      name,
      startLine,
      endLine,
    );
    nodes.set(functionNode.nodeId, functionNode);
    localFunctions.set(name, functionNode.nodeId);
  };

  const functionStack: FunctionContext[] = [];
  const classStack: string[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) {
      registerImports(node);
      return;
    }

    if (ts.isClassDeclaration(node)) {
      const name = node.name?.text ?? "AnonymousClass";
      const { startLine, endLine } = getLineRange(sourceFile, node);
      const classNode = createFunctionNode(
        repoId,
        normalizedPath,
        language,
        "class",
        name,
        startLine,
        endLine,
      );
      nodes.set(classNode.nodeId, classNode);
      classStack.push(name);
      node.members.forEach((member) => visit(member));
      classStack.pop();
      return;
    }

    if (ts.isMethodDeclaration(node)) {
      const className = classStack[classStack.length - 1] ?? "AnonymousClass";
      const methodName = node.name && ts.isIdentifier(node.name) ? node.name.text : "method";
      const name = `${className}.${methodName}`;
      const { startLine, endLine } = getLineRange(sourceFile, node);
      const methodNode = createFunctionNode(
        repoId,
        normalizedPath,
        language,
        "method",
        name,
        startLine,
        endLine,
      );
      nodes.set(methodNode.nodeId, methodNode);
      functionStack.push({ nodeId: methodNode.nodeId, name });
      ts.forEachChild(node, visit);
      functionStack.pop();
      return;
    }

    if (ts.isFunctionDeclaration(node)) {
      const name = node.name?.text ?? "anonymous";
      const { startLine, endLine } = getLineRange(sourceFile, node);
      const functionNode = createFunctionNode(
        repoId,
        normalizedPath,
        language,
        "function",
        name,
        startLine,
        endLine,
      );
      nodes.set(functionNode.nodeId, functionNode);
      localFunctions.set(name, functionNode.nodeId);
      functionStack.push({ nodeId: functionNode.nodeId, name });
      ts.forEachChild(node, visit);
      functionStack.pop();
      return;
    }

    if (ts.isVariableDeclaration(node)) {
      handleVariableFunction(node);
    }

    if (ts.isCallExpression(node)) {
      const current = functionStack[functionStack.length - 1];
      if (!current) {
        ts.forEachChild(node, visit);
        return;
      }
      const targetNodeId = (() => {
        const expression = node.expression;
        if (ts.isIdentifier(expression)) {
          const importedPath = importMap.get(expression.text);
          if (importedPath) {
            return ensureFileNode(importedPath).nodeId;
          }
          return localFunctions.get(expression.text) ?? null;
        }
        if (ts.isPropertyAccessExpression(expression)) {
          const base = expression.expression;
          if (ts.isIdentifier(base)) {
            const importedPath = namespaceImports.get(base.text);
            if (importedPath) {
              return ensureFileNode(importedPath).nodeId;
            }
          }
        }
        return null;
      })();
      if (targetNodeId) {
        addEdge(edges, repoId, "calls", current.nodeId, targetNodeId);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return { nodes: Array.from(nodes.values()), edges: Array.from(edges.values()) };
};
