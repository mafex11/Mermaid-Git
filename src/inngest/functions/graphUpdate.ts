import { inngest } from "../client";

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
    ref: string;
    before: string;
    after: string;
  };
};

export const graphUpdate = inngest.createFunction(
  { id: "graph-update", name: "Graph update" },
  { event: "graph/update.requested" },
  async ({ event }: { event: GraphUpdateEvent }) => {
    return {
      status: "queued",
      repository: event.data.repository.fullName,
    };
  },
);
