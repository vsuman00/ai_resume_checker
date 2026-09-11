import { describe, expect, it } from "vitest";
import {
  AI_CONSENT_POLICY_VERSION,
  requireAndRecordAiConsent,
} from "../../app/lib/server/privacy";

describe("privacy policy", () => {
  it("uses an explicit versioned AI consent policy", () => {
    expect(AI_CONSENT_POLICY_VERSION).toBe("candidate-ai-v1");
  });

  it("denies AI transfer before any database call when consent is absent", async () => {
    await expect(
      requireAndRecordAiConsent({
        userId: "user-1",
        accepted: false,
        requestId: "request-1",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });
});
