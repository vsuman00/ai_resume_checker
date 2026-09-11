import { describe, expect, it, vi } from "vitest";
import {
  extractBoundedInput,
  extractionFailureStatus,
} from "../../app/lib/server/extraction-stage";
import { ResumeExtractionError } from "../../app/lib/server/extract";

const limits = {
  bytes: new Uint8Array([37, 80, 68, 70, 45]),
  maxBytes: 100,
  maxPages: 10,
  maxCharacters: 100_000,
  timeoutMs: 100,
};

describe("bounded extraction fixture matrix", () => {
  it("records clean extraction evidence", async () => {
    const result = await extractBoundedInput(
      limits,
      vi.fn().mockResolvedValue({ totalPages: 1, text: "Clean resume" }),
    );
    expect(result.totalPages).toBe(1);
    expect(result.textChecksum).toHaveLength(64);
    expect(result.warnings).toEqual([]);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("records multi-page warnings", async () => {
    const result = await extractBoundedInput(
      limits,
      vi.fn().mockResolvedValue({ totalPages: 3, text: "Multi page" }),
    );
    expect(result.warnings).toEqual(["Resume exceeds two pages."]);
  });

  it.each(["malformed", "encrypted"])(
    "rejects %s PDF fixtures before scoring",
    async () => {
      const error = new ResumeExtractionError("INVALID_PDF");
      await expect(
        extractBoundedInput(limits, vi.fn().mockRejectedValue(error)),
      ).rejects.toBe(error);
      expect(extractionFailureStatus(error)).toBe("failed");
    },
  );

  it.each(["empty", "scanned"])(
    "routes %s text fixtures to OCR-required state",
    async () => {
      const error = new ResumeExtractionError("EMPTY_TEXT");
      await expect(
        extractBoundedInput(limits, vi.fn().mockRejectedValue(error)),
      ).rejects.toBe(error);
      expect(extractionFailureStatus(error)).toBe("needs_ocr");
    },
  );

  it("rejects oversized bytes before invoking the extractor", async () => {
    const extractor = vi.fn();
    await expect(
      extractBoundedInput(
        { ...limits, bytes: new Uint8Array(101), maxBytes: 100 },
        extractor,
      ),
    ).rejects.toMatchObject({ code: "OVERSIZED" });
    expect(extractor).not.toHaveBeenCalled();
  });

  it("bounds extraction duration", async () => {
    const neverFinishes = vi.fn(
      () => new Promise<{ totalPages: number; text: string }>(() => undefined),
    );
    await expect(
      extractBoundedInput({ ...limits, timeoutMs: 10 }, neverFinishes),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });
});
