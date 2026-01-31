export type RepoRecord = {
  repoId: number;
  installationId: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  diagramMermaid?: string;
  diagramUpdatedAt?: Date;
  diagramNodeCount?: number;
  diagramEdgeCount?: number;
  diagramTruncated?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SourceLanguage = "ts" | "tsx" | "js" | "jsx" | "py" | "unknown";

export type GraphNodeKind = "file" | "function" | "class" | "method";

export type GraphEdgeKind = "imports" | "calls" | "references";

export type GraphNode = {
  nodeId: string;
  repoId: number;
  kind: GraphNodeKind;
  path: string;
  name: string;
  symbolId?: string;
  language: SourceLanguage;
  startLine?: number;
  endLine?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type GraphEdge = {
  edgeId: string;
  repoId: number;
  kind: GraphEdgeKind;
  fromNodeId: string;
  toNodeId: string;
  createdAt: Date;
};

export type AnalysisRunStatus = "queued" | "running" | "succeeded" | "failed";

export type AnalysisRun = {
  runId: string;
  repoId: number;
  commitSha: string;
  status: AnalysisRunStatus;
  error?: string;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type GraphSlice = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};
