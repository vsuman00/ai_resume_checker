export type OcrFailureReason =
  | "unsupported"
  | "privacy_policy"
  | "region_policy"
  | "retention_policy"
  | "cost_policy"
  | "timeout"
  | "outage"
  | "low_confidence";

export type OcrPolicy = {
  approval: "approved" | "not_approved";
  enabled: boolean;
  allowThirdPartyProcessing: boolean;
  processingRegion: string;
  maxRetentionDays: number;
  timeoutMs: number;
  maxCostMicros: number;
  minimumConfidence: number;
};

export const DEFAULT_OCR_POLICY: Readonly<OcrPolicy> = Object.freeze({
  approval: "not_approved",
  enabled: false,
  allowThirdPartyProcessing: false,
  processingRegion: "ap-south-1",
  maxRetentionDays: 0,
  timeoutMs: 5_000,
  maxCostMicros: 0,
  minimumConfidence: 0.85,
});

export type OcrAdapter = {
  readonly id: string;
  readonly version: string;
  readonly capabilities: {
    readonly processingRegions: readonly string[];
    readonly retentionDays: number;
    readonly maxCostMicrosPerPage: number;
  };
  recognize(
    request: {
      bytes: Uint8Array;
      pageCount: number;
      processingRegion: string;
      maxRetentionDays: number;
      maxCostMicros: number;
    },
    signal: AbortSignal,
  ): Promise<{
    pageTexts: string[];
    confidence: number;
    costMicros: number;
  }>;
};

export type OcrRuntime = {
  adapter: OcrAdapter;
  policy: Readonly<OcrPolicy>;
  privacy: {
    consentGranted: boolean;
    thirdPartyProcessingAllowed: boolean;
    purpose: "resume_text_extraction";
  };
};

export type OcrResolution =
  | {
      status: "success";
      text: string;
      pageTexts: string[];
      confidence: number;
      costMicros: number;
      adapterVersion: string;
    }
  | { status: "needs_ocr"; reason: OcrFailureReason };

export class OcrAdapterFailure extends Error {
  readonly code: "OUTAGE";

  constructor(code: "OUTAGE") {
    super(code);
    this.name = "OcrAdapterFailure";
    this.code = code;
  }
}

export const unsupportedOcrAdapter: OcrAdapter = {
  id: "unsupported",
  version: "none",
  capabilities: {
    processingRegions: [],
    retentionDays: 0,
    maxCostMicrosPerPage: 0,
  },
  async recognize() {
    throw new OcrAdapterFailure("OUTAGE");
  },
};

export const DEFAULT_OCR_RUNTIME: Readonly<OcrRuntime> = Object.freeze({
  adapter: unsupportedOcrAdapter,
  policy: DEFAULT_OCR_POLICY,
  privacy: Object.freeze({
    consentGranted: false,
    thirdPartyProcessingAllowed: false,
    purpose: "resume_text_extraction" as const,
  }),
});

export function defineOcrPolicy(policy: OcrPolicy): Readonly<OcrPolicy> {
  if (policy.enabled && policy.approval !== "approved") {
    throw new Error("Enabled OCR requires explicit approval.");
  }
  if (!policy.processingRegion.trim()) {
    throw new Error("OCR processing region is required.");
  }
  if (
    !Number.isInteger(policy.maxRetentionDays) ||
    policy.maxRetentionDays < 0
  ) {
    throw new Error(
      "OCR retention must be a non-negative whole number of days.",
    );
  }
  if (!Number.isInteger(policy.timeoutMs) || policy.timeoutMs <= 0) {
    throw new Error(
      "OCR timeout must be a positive whole number of milliseconds.",
    );
  }
  if (!Number.isInteger(policy.maxCostMicros) || policy.maxCostMicros < 0) {
    throw new Error("OCR cost limit must be a non-negative whole number.");
  }
  if (policy.minimumConfidence < 0 || policy.minimumConfidence > 1) {
    throw new Error("OCR minimum confidence must be between zero and one.");
  }
  return Object.freeze({ ...policy });
}

function preflightFailure(
  runtime: OcrRuntime,
  pageCount: number,
): OcrFailureReason | null {
  const { adapter, policy, privacy } = runtime;
  if (!policy.enabled || policy.approval !== "approved") return "unsupported";
  if (
    !policy.allowThirdPartyProcessing ||
    !privacy.consentGranted ||
    !privacy.thirdPartyProcessingAllowed ||
    privacy.purpose !== "resume_text_extraction"
  ) {
    return "privacy_policy";
  }
  if (
    !adapter.capabilities.processingRegions.includes(policy.processingRegion)
  ) {
    return "region_policy";
  }
  if (adapter.capabilities.retentionDays > policy.maxRetentionDays) {
    return "retention_policy";
  }
  const maximumProjectedCost =
    adapter.capabilities.maxCostMicrosPerPage * pageCount;
  if (
    policy.maxCostMicros <= 0 ||
    maximumProjectedCost > policy.maxCostMicros
  ) {
    return "cost_policy";
  }
  return null;
}

export async function resolveOcr(
  args: { bytes: Uint8Array; pageCount: number },
  runtime: OcrRuntime = DEFAULT_OCR_RUNTIME,
): Promise<OcrResolution> {
  const blockedBy = preflightFailure(runtime, args.pageCount);
  if (blockedBy) return { status: "needs_ocr", reason: blockedBy };

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      runtime.adapter.recognize(
        {
          bytes: args.bytes,
          pageCount: args.pageCount,
          processingRegion: runtime.policy.processingRegion,
          maxRetentionDays: runtime.policy.maxRetentionDays,
          maxCostMicros: runtime.policy.maxCostMicros,
        },
        controller.signal,
      ),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("OCR_TIMEOUT"));
        }, runtime.policy.timeoutMs);
        timeout.unref?.();
      }),
    ]);

    const minimumPageConfidence = response.pageTexts.length
      ? response.confidence
      : 0;
    if (
      response.pageTexts.length !== args.pageCount ||
      response.pageTexts.some((text) => text.trim().length === 0) ||
      minimumPageConfidence < runtime.policy.minimumConfidence
    ) {
      return { status: "needs_ocr", reason: "low_confidence" };
    }
    if (response.costMicros > runtime.policy.maxCostMicros) {
      return { status: "needs_ocr", reason: "cost_policy" };
    }

    return {
      status: "success",
      text: response.pageTexts.join("\n\n"),
      pageTexts: response.pageTexts,
      confidence: response.confidence,
      costMicros: response.costMicros,
      adapterVersion: `${runtime.adapter.id}:${runtime.adapter.version}`,
    };
  } catch (error) {
    if (error instanceof OcrAdapterFailure && error.code === "OUTAGE") {
      return { status: "needs_ocr", reason: "outage" };
    }
    if (error instanceof Error && error.message === "OCR_TIMEOUT") {
      return { status: "needs_ocr", reason: "timeout" };
    }
    return { status: "needs_ocr", reason: "outage" };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
