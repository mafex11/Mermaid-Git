import { type GraphEdge, type GraphNode, type SourceLanguage } from "@/lib/graph/types";

export type FileSnapshot = {
  path: string;
  content: string;
  language?: SourceLanguage;
};

export type GraphNodeInput = Omit<GraphNode, "createdAt" | "updatedAt">;
export type GraphEdgeInput = Omit<GraphEdge, "createdAt">;

export type AnalysisResult = {
  nodes: GraphNodeInput[];
  edges: GraphEdgeInput[];
};
