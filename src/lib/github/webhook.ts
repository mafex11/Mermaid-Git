import { createHmac, timingSafeEqual } from "crypto";

import { requireEnv } from "@/lib/env";

export const verifyGitHubWebhook = (
  signatureHeader: string | null,
  payload: string,
): boolean => {
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const secret = requireEnv("GITHUB_WEBHOOK_SECRET");
  const digest = createHmac("sha256", secret).update(payload).digest("hex");
  const expected = `sha256=${digest}`;
  const signatureBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
};
