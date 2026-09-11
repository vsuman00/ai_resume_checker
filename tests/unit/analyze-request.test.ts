import { describe, expect, it } from "vitest";
import {
  analysisRateLimitKey,
  parseBoundedAnalyzeFormData,
} from "../../app/lib/server/analyze-request";

describe("analysis request boundaries", () => {
  it("uses a stable per-user rate-limit bucket", () => {
    expect(analysisRateLimitKey("user-1")).toBe(analysisRateLimitKey("user-1"));
    expect(analysisRateLimitKey("user-1")).not.toBe(
      analysisRateLimitKey("user-2"),
    );
  });

  it("rejects an oversized multipart body without Content-Length", async () => {
    const form = new FormData();
    form.set(
      "file",
      new File([new Uint8Array(257)], "oversized.pdf", {
        type: "application/pdf",
      }),
    );
    form.set("jobTitle", "Engineer");
    const request = new Request("https://resumide.example/api/analyze", {
      method: "POST",
      body: form,
    });

    expect(request.headers.has("Content-Length")).toBe(false);
    await expect(
      parseBoundedAnalyzeFormData(request, 256),
    ).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
      status: 413,
    });
  });

  it("accepts one bounded PDF and the expected text fields", async () => {
    const form = new FormData();
    form.set(
      "file",
      new File([new Uint8Array([37, 80, 68, 70, 45])], "resume.pdf", {
        type: "application/pdf",
      }),
    );
    form.set("jobTitle", "Engineer");
    form.set("jobDescription", "Build reliable systems");
    form.set("idempotencyKey", "request-1");
    form.set("aiConsent", "accepted");

    const parsed = await parseBoundedAnalyzeFormData(
      new Request("https://resumide.example/api/analyze", {
        method: "POST",
        body: form,
      }),
      256,
    );

    expect(parsed.get("file")).toBeInstanceOf(File);
    expect(parsed.get("jobTitle")).toBe("Engineer");
    expect(parsed.get("aiConsent")).toBe("accepted");
  });
});
