import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createOcrSyntheticFixture } from "../../fixtures/ocr-synthetic";

it("builds a bounded ten-page scan for live process cancellation checks", async () => {
  const fixture = createOcrSyntheticFixture("scanned", 10);
  const native = await extractPdfTextLayers(fixture.bytes, {
    maxPages: 10,
    maxCharacters: 100_000,
  });
  expect(native.totalPages).toBe(10);
  expect(native.pageTexts.every((text) => text === "")).toBe(true);
});
import { extractPdfTextLayers } from "../../../app/lib/server/ocr/pdf-detection";

// Pinned from authored bytes before any extraction; source changes need review.
const LOCKED_SOURCE_HASHES = {
  scanned: "246a98b9d9130382d45cc0d1a9d80c004e2ad77f81acf0623b3ae954e3acf331",
  mixed: "cb8baaeb4a5c888f9b2a0e445a1aceb4c7622577cf3360984a5e53af91fb4436",
  native: "33dfe85cba8a264e301809df670430203aeed29c13daaa70fb2b61eaa9c4d723",
};

describe("authored synthetic OCR fixture provenance", () => {
  it.each(["scanned", "mixed", "native"] as const)(
    "locks reproducible %s source bytes and truth before extraction",
    (kind) => {
      const fixture = createOcrSyntheticFixture(kind);
      const again = createOcrSyntheticFixture(kind);
      expect(fixture.bytes).toEqual(again.bytes);
      expect(fixture.manifest.sourceSha256).toBe(
        createHash("sha256").update(fixture.bytes).digest("hex"),
      );
      expect(fixture.manifest.sourceSha256).toBe(LOCKED_SOURCE_HASHES[kind]);
      expect(fixture.expectedPageTexts).toEqual(again.expectedPageTexts);
      expect(fixture.manifest).toMatchObject({
        datasetType: "synthetic_engineering_only",
        annotatorType: "ai",
        modelIdentifier: "unknown",
        humanValidation: "not_evaluated",
        adjudication: "ai_review_only",
        humanAgreement: null,
        humanAgreementReason: "independent_human_labels_unavailable",
        locale: "en-IN",
        domain: "software_engineering",
        partition: "development",
      });
    },
  );

  it("grounds all mixed critical labels in the authored page source", () => {
    const fixture = createOcrSyntheticFixture("mixed");
    expect(Object.keys(fixture.expectedFields).sort()).toEqual([
      "certification",
      "dates",
      "education",
      "email",
      "employer",
      "name",
      "phone",
      "role",
    ]);
    for (const label of fixture.labels) {
      expect(
        fixture.expectedPageTexts[label.pageNumber - 1].slice(
          label.start,
          label.end,
        ),
      ).toBe(label.value);
      expect(label.sourceReference).toBe(`authored-page-${label.pageNumber}`);
    }
  });

  it("has no hidden text layer on scanned pages", async () => {
    const fixture = createOcrSyntheticFixture("scanned");
    const extracted = await extractPdfTextLayers(fixture.bytes, {
      maxPages: 3,
      maxCharacters: 10_000,
    });
    expect(extracted.pageTexts).toEqual([""]);
    expect(fixture.expectedPageTexts[0]).toContain("DEMO CANDIDATE");
  });

  it("preserves the native middle page between two scanned pages", async () => {
    const fixture = createOcrSyntheticFixture("mixed");
    const extracted = await extractPdfTextLayers(fixture.bytes, {
      maxPages: 3,
      maxCharacters: 10_000,
    });
    expect(extracted.pageTexts).toEqual(["", fixture.expectedPageTexts[1], ""]);
    expect(fixture.pageMethods).toEqual([
      "image_only",
      "native_text",
      "image_only",
    ]);
  });

  it("provides a native control from the same authored content", async () => {
    const fixture = createOcrSyntheticFixture("native");
    const extracted = await extractPdfTextLayers(fixture.bytes, {
      maxPages: 3,
      maxCharacters: 10_000,
    });
    expect(extracted.pageTexts).toEqual(fixture.expectedPageTexts);
  });
});
