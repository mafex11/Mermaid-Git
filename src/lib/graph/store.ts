import { type Collection } from "mongodb";

import { getMongoDb } from "@/lib/db/mongo";

import {
  type AnalysisRun,
  type GraphEdge,
  type GraphNode,
  type GraphSlice,
  type RepoRecord,
} from "./types";

const repoCollectionName = "repos";
const nodeCollectionName = "graph_nodes";
const edgeCollectionName = "graph_edges";
const runCollectionName = "analysis_runs";

type GraphCollections = {
  repos: Collection<RepoRecord>;
  nodes: Collection<GraphNode>;
  edges: Collection<GraphEdge>;
  runs: Collection<AnalysisRun>;
};

const getGraphCollections = (): GraphCollections => {
  const db = getMongoDb();
  return {
    repos: db.collection<RepoRecord>(repoCollectionName),
    nodes: db.collection<GraphNode>(nodeCollectionName),
    edges: db.collection<GraphEdge>(edgeCollectionName),
    runs: db.collection<AnalysisRun>(runCollectionName),
  };
};

export const ensureGraphIndexes = async (): Promise<void> => {
  const { repos, nodes, edges, runs } = getGraphCollections();
  await Promise.all([
    repos.createIndex({ repoId: 1 }, { unique: true }),
    nodes.createIndex({ repoId: 1, nodeId: 1 }, { unique: true }),
    nodes.createIndex({ repoId: 1, path: 1 }),
    nodes.createIndex({ repoId: 1, symbolId: 1 }),
    edges.createIndex({ repoId: 1, edgeId: 1 }, { unique: true }),
    edges.createIndex({ repoId: 1, fromNodeId: 1 }),
    edges.createIndex({ repoId: 1, toNodeId: 1 }),
    runs.createIndex({ repoId: 1, commitSha: 1 }, { unique: true }),
    runs.createIndex({ repoId: 1, status: 1 }),
  ]);
};

type RepoRecordInput = Omit<RepoRecord, "createdAt" | "updatedAt">;

export const upsertRepo = async (repo: RepoRecordInput): Promise<void> => {
  const { repos } = getGraphCollections();
  const now = new Date();
  await repos.updateOne(
    { repoId: repo.repoId },
    { $set: { ...repo, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
};

type GraphNodeInput = Omit<GraphNode, "createdAt" | "updatedAt">;
type GraphEdgeInput = Omit<GraphEdge, "createdAt">;
type AnalysisRunInput = Omit<AnalysisRun, "createdAt" | "updatedAt">;

export const upsertGraphNodes = async (
  nodes: GraphNodeInput[],
): Promise<void> => {
  if (nodes.length === 0) {
    return;
  }

  const { nodes: nodeCollection } = getGraphCollections();
  const now = new Date();
  await nodeCollection.bulkWrite(
    nodes.map((node) => ({
      updateOne: {
        filter: { repoId: node.repoId, nodeId: node.nodeId },
        update: {
          $set: { ...node, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      },
    })),
  );
};

export const upsertGraphEdges = async (
  edges: GraphEdgeInput[],
): Promise<void> => {
  if (edges.length === 0) {
    return;
  }

  const { edges: edgeCollection } = getGraphCollections();
  const now = new Date();
  await edgeCollection.bulkWrite(
    edges.map((edge) => ({
      updateOne: {
        filter: { repoId: edge.repoId, edgeId: edge.edgeId },
        update: {
          $set: { ...edge },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      },
    })),
  );
};

export const upsertAnalysisRun = async (
  run: AnalysisRunInput,
): Promise<void> => {
  const { runs } = getGraphCollections();
  const now = new Date();
  await runs.updateOne(
    { repoId: run.repoId, commitSha: run.commitSha },
    { $set: { ...run, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
};

export const deleteGraphNodesByPath = async (
  repoId: number,
  path: string,
): Promise<void> => {
  const { nodes, edges } = getGraphCollections();
  const nodeIds = await nodes
    .find({ repoId, path }, { projection: { nodeId: 1 } })
    .map((node) => node.nodeId)
    .toArray();

  if (nodeIds.length > 0) {
    await edges.deleteMany({
      repoId,
      $or: [{ fromNodeId: { $in: nodeIds } }, { toNodeId: { $in: nodeIds } }],
    });
  }

  await nodes.deleteMany({ repoId, path });
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type GraphSliceQuery = {
  repoId: number;
  pathPrefix?: string;
  nodeIds?: string[];
  nodeLimit?: number;
  edgeLimit?: number;
};

const defaultNodeLimit = 1000;
const defaultEdgeLimit = 5000;

export const getGraphSlice = async (
  query: GraphSliceQuery,
): Promise<GraphSlice> => {
  const { nodes, edges } = getGraphCollections();
  const nodeQuery: Record<string, unknown> = { repoId: query.repoId };
  if (query.pathPrefix) {
    nodeQuery.path = { $regex: `^${escapeRegex(query.pathPrefix)}` };
  }
  if (query.nodeIds && query.nodeIds.length > 0) {
    nodeQuery.nodeId = { $in: query.nodeIds };
  }

  const nodeLimit = query.nodeLimit ?? defaultNodeLimit;
  const edgeLimit = query.edgeLimit ?? defaultEdgeLimit;

  const nodesResult = await nodes.find(nodeQuery).limit(nodeLimit).toArray();
  if (nodesResult.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodeIds = nodesResult.map((node) => node.nodeId);
  const edgesResult = await edges
    .find({
      repoId: query.repoId,
      $or: [
        { fromNodeId: { $in: nodeIds } },
        { toNodeId: { $in: nodeIds } },
      ],
    })
    .limit(edgeLimit)
    .toArray();

  return { nodes: nodesResult, edges: edgesResult };
};
