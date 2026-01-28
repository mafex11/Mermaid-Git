import { createHash } from "crypto";

import { type GraphEdgeKind, type GraphNodeKind } from "@/lib/graph/types";

const hash = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export const createNodeId = (
  repoId: number,
  kind: GraphNodeKind,
  path: string,
  symbolId: string,
): string => hash(`${repoId}:${kind}:${path}:${symbolId}`);

export const createEdgeId = (
  repoId: number,
  kind: GraphEdgeKind,
  fromNodeId: string,
  toNodeId: string,
): string => hash(`${repoId}:${kind}:${fromNodeId}:${toNodeId}`);

export const createRunId = (repoId: number, commitSha: string): string =>
  hash(`${repoId}:${commitSha}`);
