import { NextResponse } from "next/server";

import { inngest } from "@/inngest/client";
import { verifyGitHubWebhook } from "@/lib/github/webhook";

type GitHubPushEvent = {
  ref: string;
  before: string;
  after: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    default_branch: string;
  };
  installation?: {
    id: number;
  };
};

export const runtime = "nodejs";

export const POST = async (request: Request): Promise<Response> => {
  const event = request.headers.get("x-github-event");
  const delivery = request.headers.get("x-github-delivery");
  const signature = request.headers.get("x-hub-signature-256");
  const payload = await request.text();

  if (!verifyGitHubWebhook(signature, payload)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  if (event === "ping") {
    return NextResponse.json({ ok: true });
  }

  if (event !== "push") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  let data: GitHubPushEvent;
  try {
    data = JSON.parse(payload) as GitHubPushEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const installationId = data.installation?.id;
  if (!installationId) {
    return NextResponse.json(
      { ok: false, error: "Missing installation id" },
      { status: 400 },
    );
  }

  await inngest.send({
    name: "graph/update.requested",
    id: delivery ?? `${data.repository.full_name}:${data.after}`,
    data: {
      installationId,
      repository: {
        id: data.repository.id,
        name: data.repository.name,
        fullName: data.repository.full_name,
        defaultBranch: data.repository.default_branch,
      },
      ref: data.ref,
      before: data.before,
      after: data.after,
    },
  });

  return NextResponse.json({ ok: true });
};
