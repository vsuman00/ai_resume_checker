import { describe, expect, it, vi } from "vitest";
import {
  extractPdfForAnalysis,
  OcrRequiredError,
} from "../../../app/lib/server/extraction-stage";
import {
  defineOcrPolicy,
  type OcrRuntime,
} from "../../../app/lib/server/ocr/adapter";

const limits = {
  bytes: new Uint8Array([37, 80, 68, 70, 45]),
  maxBytes: 100,
  maxPages: 10,
  maxCharacters: 100_000,
  timeoutMs: 100,
};

const unsupportedRuntime = {
  adapter: {
    id: "unsupported",
    version: "none",
    capabilities: {
      processingRegions: [],
      retentionDays: 0,
      maxCostMicrosPerPage: 0,
    },
    recognize: vi.fn(),
  },
  policy: defineOcrPolicy({
    approval: "not_approved",
    enabled: false,
    allowThirdPartyProcessing: false,
    processingRegion: "ap-south-1",
    maxRetentionDays: 0,
    timeoutMs: 100,
    maxCostMicros: 0,
    minimumConfidence: 0.85,
  }),
  privacy: {
    consentGranted: false,
    thirdPartyProcessingAllowed: false,
    purpose: "resume_text_extraction" as const,
  },
} satisfies OcrRuntime;

describe("OCR extraction router", () => {
  it("persists text PDFs without calling OCR", async () => {
    const result = await extractPdfForAnalysis(
      limits,
      vi.fn().mockResolvedValue({
        totalPages: 1,
        text: "Text resume",
        pageTexts: ["Text resume"],
      }),
      unsupportedRuntime,
    );
    expect(result.text).toBe("Text resume");
    expect(result.warnings).toEqual([]);
    expect(unsupportedRuntime.adapter.recognize).not.toHaveBeenCalled();
  });

  it.each([
    ["scanned", ["   "]],
    ["mixed", ["Text resume", "   "]],
  ])(
    "routes %s PDFs to an explicit unsupported OCR state",
    async (_, pageTexts) => {
      await expect(
        extractPdfForAnalysis(
          limits,
          vi.fn().mockResolvedValue({
            totalPages: pageTexts.length,
            text: pageTexts.join("\n"),
            pageTexts,
          }),
          unsupportedRuntime,
        ),
      ).rejects.toMatchObject({
        reason: "unsupported",
      } satisfies Partial<OcrRequiredError>);
    },
  );
});
