import { createHash } from "crypto";

import { type GraphSlice } from "@/lib/graph/types";

type MermaidBuildOptions = {
  maxNodes?: number;
  maxEdges?: number;
};

export type MermaidBuildResult = {
  mermaid: string;
  nodeCount: number;
  edgeCount: number;
  truncated: boolean;
};

const defaultMaxNodes = 500;
const defaultMaxEdges = 2000;

const toMermaidId = (value: string): string =>
  `n${createHash("sha1").update(value).digest("hex").slice(0, 12)}`;

const toLabel = (value: string): string => {
  const cleaned = value.replace(/"/g, "'");
  return cleaned.length > 120 ? `${cleaned.slice(0, 117)}...` : cleaned;
};

export const buildMermaidFromGraph = (
  slice: GraphSlice,
  options: MermaidBuildOptions = {},
): MermaidBuildResult => {
  const maxNodes = options.maxNodes ?? defaultMaxNodes;
  const maxEdges = options.maxEdges ?? defaultMaxEdges;

  const fileNodes = slice.nodes.filter((node) => node.kind === "file");
  const fileNodeMap = new Map(fileNodes.map((node) => [node.nodeId, node]));

  const sortedFileNodes = [...fileNodes].sort((a, b) => a.path.localeCompare(b.path));
  const limitedNodes = sortedFileNodes.slice(0, maxNodes);
  const limitedNodeIds = new Set(limitedNodes.map((node) => node.nodeId));

  const fileEdges = slice.edges.filter(
    (edge) =>
      edge.kind === "imports" &&
      fileNodeMap.has(edge.fromNodeId) &&
      fileNodeMap.has(edge.toNodeId) &&
      limitedNodeIds.has(edge.fromNodeId) &&
      limitedNodeIds.has(edge.toNodeId),
  );
  const limitedEdges = fileEdges.slice(0, maxEdges);

  const truncated =
    fileNodes.length > limitedNodes.length || fileEdges.length > limitedEdges.length;

  const nodeIdMap = new Map(
    limitedNodes.map((node) => [node.nodeId, toMermaidId(node.nodeId)]),
  );

  const lines = ["flowchart TD"];
  if (truncated) {
    lines.push(
      `%% Truncated to ${limitedNodes.length} nodes and ${limitedEdges.length} edges`,
    );
  }

  for (const node of limitedNodes) {
    const id = nodeIdMap.get(node.nodeId);
    if (!id) {
      continue;
    }
    lines.push(`${id}["${toLabel(node.path)}"]`);
  }

  for (const edge of limitedEdges) {
    const fromId = nodeIdMap.get(edge.fromNodeId);
    const toId = nodeIdMap.get(edge.toNodeId);
    if (!fromId || !toId) {
      continue;
    }
    lines.push(`${fromId} --> ${toId}`);
  }

  return {
    mermaid: lines.join("\n"),
    nodeCount: limitedNodes.length,
    edgeCount: limitedEdges.length,
    truncated,
  };
};
