import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_OCR_RUNTIME,
  OcrAdapterFailure,
  defineOcrPolicy,
  resolveOcr,
  type OcrAdapter,
  type OcrRuntime,
} from "../../../app/lib/server/ocr/adapter";

const bytes = new Uint8Array([1, 2, 3]);

function permittedRuntime(
  response: Awaited<ReturnType<OcrAdapter["recognize"]>>,
): OcrRuntime {
  const recognize = vi.fn().mockResolvedValue(response);
  return {
    adapter: {
      id: "test-ocr",
      version: "v1",
      capabilities: {
        processingRegions: ["ap-south-1"],
        retentionDays: 0,
        maxCostMicrosPerPage: 5,
      },
      recognize,
    },
    policy: defineOcrPolicy({
      approval: "approved",
      enabled: true,
      allowThirdPartyProcessing: true,
      processingRegion: "ap-south-1",
      maxRetentionDays: 0,
      timeoutMs: 50,
      maxCostMicros: 10,
      minimumConfidence: 0.85,
    }),
    privacy: {
      consentGranted: true,
      thirdPartyProcessingAllowed: true,
      purpose: "resume_text_extraction",
    },
  };
}

describe("OCR policy boundary", () => {
  it("does not invoke an OCR provider until one is approved", async () => {
    await expect(
      resolveOcr({ bytes, pageCount: 1 }, DEFAULT_OCR_RUNTIME),
    ).resolves.toEqual({ status: "needs_ocr", reason: "unsupported" });
  });

  it("passes only policy-bounded requests to an approved provider", async () => {
    const runtime = permittedRuntime({
      pageTexts: ["OCR text"],
      confidence: 0.9,
      costMicros: 5,
    });

    await expect(resolveOcr({ bytes, pageCount: 1 }, runtime)).resolves.toEqual(
      {
        status: "success",
        text: "OCR text",
        pageTexts: ["OCR text"],
        confidence: 0.9,
        costMicros: 5,
        adapterVersion: "test-ocr:v1",
      },
    );
  });

  it.each([
    ["privacy", "privacy_policy"],
    ["region", "region_policy"],
    ["retention", "retention_policy"],
    ["cost", "cost_policy"],
  ] as const)("blocks %s policy violations", async (kind, reason) => {
    const runtime = permittedRuntime({
      pageTexts: ["OCR text"],
      confidence: 0.9,
      costMicros: 5,
    });
    if (kind === "privacy") runtime.privacy.consentGranted = false;
    if (kind === "region") {
      runtime.policy = defineOcrPolicy({
        ...runtime.policy,
        processingRegion: "eu-west-1",
      });
    }
    if (kind === "retention") {
      runtime.adapter = {
        ...runtime.adapter,
        capabilities: { ...runtime.adapter.capabilities, retentionDays: 1 },
      };
    }
    if (kind === "cost") {
      runtime.policy = defineOcrPolicy({ ...runtime.policy, maxCostMicros: 4 });
    }

    await expect(resolveOcr({ bytes, pageCount: 1 }, runtime)).resolves.toEqual(
      {
        status: "needs_ocr",
        reason,
      },
    );
  });

  it("reports low confidence and an adapter outage without accepting text", async () => {
    await expect(
      resolveOcr(
        { bytes, pageCount: 1 },
        permittedRuntime({
          pageTexts: ["OCR text"],
          confidence: 0.8,
          costMicros: 5,
        }),
      ),
    ).resolves.toEqual({ status: "needs_ocr", reason: "low_confidence" });
    const runtime = permittedRuntime({
      pageTexts: ["OCR text"],
      confidence: 0.9,
      costMicros: 5,
    });
    runtime.adapter.recognize = async () => {
      throw new OcrAdapterFailure("OUTAGE");
    };
    await expect(resolveOcr({ bytes, pageCount: 1 }, runtime)).resolves.toEqual(
      {
        status: "needs_ocr",
        reason: "outage",
      },
    );
  });

  it("aborts an approved OCR request when its timeout expires", async () => {
    const runtime = permittedRuntime({
      pageTexts: ["OCR text"],
      confidence: 0.9,
      costMicros: 5,
    });
    runtime.policy = defineOcrPolicy({ ...runtime.policy, timeoutMs: 10 });
    runtime.adapter.recognize = async () => new Promise<never>(() => undefined);

    await expect(resolveOcr({ bytes, pageCount: 1 }, runtime)).resolves.toEqual(
      {
        status: "needs_ocr",
        reason: "timeout",
      },
    );
  });
});
