import { inngest } from "../client";

export const graphUpdate = inngest.createFunction(
  { id: "graph-update", name: "Graph update" },
  { event: "graph/update.requested" },
  async () => {
    return { status: "queued" };
  },
);
