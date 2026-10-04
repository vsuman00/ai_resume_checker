import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => vi.useRealTimers());

  it("does not invoke an adapter after its enclosing deadline is already aborted", async () => {
    const runtime = permittedRuntime({
      pageTexts: ["OCR text"],
      confidence: 0.9,
      costMicros: 5,
    });
    const controller = new AbortController();
    controller.abort();
    await expect(
      resolveOcr({ bytes, pageCount: 1, signal: controller.signal }, runtime),
    ).resolves.toEqual({ status: "needs_ocr", reason: "timeout" });
    expect(runtime.adapter.recognize).not.toHaveBeenCalled();
  });

  it("aborts recognition and clears timers when an enclosing deadline expires", async () => {
    vi.useFakeTimers();
    const runtime = permittedRuntime({
      pageTexts: ["OCR text"],
      confidence: 0.9,
      costMicros: 5,
    });
    let recognitionSignal: AbortSignal | undefined;
    runtime.adapter.recognize = async (_, signal) => {
      recognitionSignal = signal;
      return new Promise<never>(() => undefined);
    };
    const controller = new AbortController();
    const outcome = resolveOcr(
      { bytes, pageCount: 1, signal: controller.signal },
      runtime,
    );
    controller.abort();
    await expect(outcome).resolves.toEqual({
      status: "needs_ocr",
      reason: "timeout",
    });
    expect(recognitionSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([NaN, Infinity, -Infinity, -0.1, 1.1])(
    "rejects invalid confidence %s without accepting OCR text",
    async (confidence) => {
      const runtime = permittedRuntime({
        pageTexts: ["OCR text"],
        confidence,
        costMicros: 5,
      });
      await expect(
        resolveOcr({ bytes, pageCount: 1 }, runtime),
      ).resolves.toEqual({ status: "needs_ocr", reason: "low_confidence" });
    },
  );

  it.each([NaN, Infinity, -Infinity, -1, 0.5])(
    "rejects invalid charged cost %s without accepting OCR text",
    async (costMicros) => {
      const runtime = permittedRuntime({
        pageTexts: ["OCR text"],
        confidence: 0.9,
        costMicros,
      });
      await expect(
        resolveOcr({ bytes, pageCount: 1 }, runtime),
      ).resolves.toEqual({ status: "needs_ocr", reason: "cost_policy" });
    },
  );

  it.each([NaN, Infinity, -Infinity, -1, 0.5])(
    "rejects invalid projected page cost %s before invoking an adapter",
    async (maxCostMicrosPerPage) => {
      const runtime = permittedRuntime({
        pageTexts: ["OCR text"],
        confidence: 0.9,
        costMicros: 5,
      });
      runtime.adapter = {
        ...runtime.adapter,
        capabilities: { ...runtime.adapter.capabilities, maxCostMicrosPerPage },
      };
      await expect(
        resolveOcr({ bytes, pageCount: 1 }, runtime),
      ).resolves.toEqual({ status: "needs_ocr", reason: "cost_policy" });
      expect(runtime.adapter.recognize).not.toHaveBeenCalled();
    },
  );

  it.each([NaN, Infinity, -1, 0, 1.5])(
    "rejects invalid page count %s before invoking an adapter",
    async (pageCount) => {
      const runtime = permittedRuntime({
        pageTexts: ["OCR text"],
        confidence: 0.9,
        costMicros: 5,
      });
      await expect(resolveOcr({ bytes, pageCount }, runtime)).resolves.toEqual({
        status: "needs_ocr",
        reason: "unsupported",
      });
      expect(runtime.adapter.recognize).not.toHaveBeenCalled();
    },
  );

  it.each([NaN, Infinity, -Infinity])(
    "rejects non-finite confidence policy %s",
    (minimumConfidence) => {
      const runtime = permittedRuntime({
        pageTexts: ["OCR text"],
        confidence: 0.9,
        costMicros: 5,
      });
      expect(() =>
        defineOcrPolicy({ ...runtime.policy, minimumConfidence }),
      ).toThrow("OCR minimum confidence");
    },
  );

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
