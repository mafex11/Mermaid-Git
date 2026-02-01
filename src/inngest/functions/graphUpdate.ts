import { inngest } from "../client";
import { updateGraphForFiles } from "@/lib/analysis/updateGraph";
import { buildMermaidFromGraph } from "@/lib/graph/mermaid";
import {
  ensureGraphIndexes,
  getGraphSlice,
  deleteGraphForRepo,
  setRepoBuildStatus,
  upsertRepoDiagram,
} from "@/lib/graph/store";
import {
  buildDiffRepoSnapshot,
  buildFullRepoSnapshot,
  type RepoSnapshotResult,
} from "@/lib/github/repo";

type GraphUpdateEvent = {
  name: "graph/update.requested";
  data: {
    installationId: number;
    repository: {
      id: number;
      name: string;
      fullName: string;
      defaultBranch: string;
    };
    mode?: "full" | "diff";
    ref: string;
    before: string;
    after: string;
  };
};

export const graphUpdate = inngest.createFunction(
  { id: "graph-update", name: "Graph update" },
  { event: "graph/update.requested" },
  async ({ event }: { event: GraphUpdateEvent }) => {
    await ensureGraphIndexes();

    const [owner, repoName] = event.data.repository.fullName.split("/");
    if (!owner || !repoName) {
      throw new Error("Invalid repository name");
    }

    await setRepoBuildStatus({
      repoId: event.data.repository.id,
      status: "running",
    });

    try {
      const zeroSha = event.data.before && /^0+$/.test(event.data.before);
      const mode = event.data.mode ?? "diff";
      const useDiff =
        mode !== "full" &&
        Boolean(event.data.before) &&
        Boolean(event.data.after) &&
        !zeroSha;
      let snapshot: RepoSnapshotResult;
      if (useDiff) {
        try {
          snapshot = await buildDiffRepoSnapshot(
            event.data.installationId,
            owner,
            repoName,
            event.data.before,
            event.data.after,
          );
        } catch {
          snapshot = await buildFullRepoSnapshot(
            event.data.installationId,
            owner,
            repoName,
            event.data.repository.defaultBranch,
          );
        }
      } else {
        await deleteGraphForRepo(event.data.repository.id);
        snapshot = await buildFullRepoSnapshot(
          event.data.installationId,
          owner,
          repoName,
          event.data.repository.defaultBranch,
        );
      }

      const { nodes, edges } = await updateGraphForFiles({
        repo: {
          repoId: event.data.repository.id,
          installationId: event.data.installationId,
          name: event.data.repository.name,
          fullName: event.data.repository.fullName,
          owner,
          defaultBranch: event.data.repository.defaultBranch,
        },
        commitSha: snapshot.commitSha,
        files: snapshot.files,
        removedPaths: snapshot.removedPaths,
        knownPaths: snapshot.knownPaths,
      });

      const slice = await getGraphSlice({
        repoId: event.data.repository.id,
        nodeLimit: 4000,
        edgeLimit: 12000,
      });
      const mermaidResult = buildMermaidFromGraph(slice);
      await upsertRepoDiagram({
        repoId: event.data.repository.id,
        diagramMermaid: mermaidResult.mermaid,
        diagramNodeCount: mermaidResult.nodeCount,
        diagramEdgeCount: mermaidResult.edgeCount,
        diagramTruncated: mermaidResult.truncated,
      });

      await setRepoBuildStatus({
        repoId: event.data.repository.id,
        status: "succeeded",
      });

      return {
        status: "completed",
        repository: event.data.repository.fullName,
        nodes,
        edges,
      };
    } catch (error) {
      await setRepoBuildStatus({
        repoId: event.data.repository.id,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
);
