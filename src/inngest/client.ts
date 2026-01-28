import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "repo-graph-platform",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
