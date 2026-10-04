import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createOcrPrintFixture,
  createOcrPrintPilot,
  PRINT_FAMILIES,
} from "../../fixtures/ocr-print-pilot";
import { extractPdfTextLayers } from "../../../app/lib/server/ocr/pdf-detection";

describe("normal-font synthetic OCR sources", () => {
  it("declares six authored content/layout families and immutable partitions", () => {
    expect(PRINT_FAMILIES).toHaveLength(6);
    expect(PRINT_FAMILIES.map((family) => family.partition)).toEqual([
      "development",
      "development",
      "development",
      "calibration",
      "locked",
      "locked",
    ]);
    expect(
      new Set(PRINT_FAMILIES.map((family) => JSON.stringify(family.lines)))
        .size,
    ).toBe(6);
    // Authored source lock independent of platform-specific rasterization.
    expect(
      PRINT_FAMILIES.map((family) =>
        createHash("sha256").update(JSON.stringify(family)).digest("hex"),
      ),
    ).toMatchInlineSnapshot(`
      [
        "d0f847d3669d10391151914dd29206a7c976fd8553f2014eb3dc8a012705e16a",
        "245687701c6f0b9f68dbdb332f366b7ecbfd8cc4a5b8c729542edac03b5f72f3",
        "8a36f915a2d3de5e295f84ef73d78f1ec0307fef0d530e132b0f4d6a5bb86937",
        "6bcfe5c0cd3ba0500fb3e897bcf1228205f6c2332e42178c60ff634d3ea5da41",
        "843b0723cf069b392cf4fce0bf4b10932891b0b83f05d74e107239f1baf6f9e3",
        "83a4183c4ba53c8089711b3c3767606e41ebe6e2ada725862428607caa5c3beb",
      ]
    `);
  });
  it("renders deterministic image-only clean source with eight preauthored fields", async () => {
    const first = await createOcrPrintFixture(0, "clean");
    const second = await createOcrPrintFixture(0, "clean");
    expect(first.bytes).toEqual(second.bytes);
    expect(first.bytes.length).toBeLessThanOrEqual(10 * 1024 * 1024);
    expect(first.manifest.sourceSha256).toBe(
      createHash("sha256").update(first.bytes).digest("hex"),
    );
    expect(first.manifest.fontSha256).toBe(
      "f8ace1f892b2bd9dc1792ba7f097fa7588f84fed48321480e04de5390828221f",
    );
    expect(first.labels).toHaveLength(8);
    for (const label of first.labels)
      expect(
        Array.from(first.expectedPageTexts![label.pageNumber - 1])
          .slice(label.start, label.end)
          .join(""),
      ).toBe(label.value);
    const native = await extractPdfTextLayers(first.bytes, {
      maxPages: 3,
      maxCharacters: 10000,
    });
    expect(native.pageTexts).toEqual([""]);
    expect(first.sourceImageDpi).toBe(300);
    for (const page of first.rasterDiagnostics) {
      expect(page.darkPixelCount).toBeGreaterThan(100);
      expect(page.inkBounds.left).toBeGreaterThan(10);
      expect(page.inkBounds.top).toBeGreaterThan(10);
      expect(page.inkBounds.right).toBeLessThan(page.widthPixels - 10);
      expect(page.inkBounds.bottom).toBeLessThan(page.heightPixels - 10);
    }
  });
  it("actually applies declared 150 DPI challenge transformations", async () => {
    const fixture = await createOcrPrintFixture(1, "challenging");
    expect(fixture.sourceImageDpi).toBe(150);
    expect(fixture.declaredSkewDegrees).not.toBe(0);
    expect(fixture.challenge).toEqual({ blurPixels: 0.3, jpegQuality: 85 });
    const native = await extractPdfTextLayers(fixture.bytes, {
      maxPages: 3,
      maxCharacters: 10000,
    });
    expect(native.pageTexts).toEqual([""]);
  });
  it("retains exact native middle-page text without a hidden scanned text layer", async () => {
    const fixture = await createOcrPrintFixture(2, "mixed");
    const native = await extractPdfTextLayers(fixture.bytes, {
      maxPages: 3,
      maxCharacters: 10000,
    });
    expect(native.pageTexts).toEqual(["", fixture.expectedPageTexts![1], ""]);
    expect(fixture.labels).toHaveLength(8);
    for (const lines of fixture.expectedLineOrder)
      for (const line of lines) {
        expect(
          Array.from(fixture.expectedPageTexts[line.pageNumber - 1])
            .slice(line.start, line.end)
            .join(""),
        ).toBe(line.text);
      }
  });
  it("keeps every source family in one partition and counts controls honestly", async () => {
    const pilot = await createOcrPrintPilot();
    expect(pilot).toHaveLength(24);
    expect(
      pilot.filter((fixture) => fixture.manifest.partition === "development"),
    ).toHaveLength(15);
    expect(
      pilot.filter((fixture) => fixture.manifest.partition === "calibration"),
    ).toHaveLength(3);
    expect(
      pilot.filter((fixture) => fixture.manifest.partition === "locked"),
    ).toHaveLength(6);
    for (const family of PRINT_FAMILIES) {
      const members = pilot.filter(
        (fixture) => fixture.manifest.sourceFamily === family.id,
      );
      expect(members).toHaveLength(3);
      expect(
        new Set(members.map((fixture) => fixture.manifest.partition)).size,
      ).toBe(1);
      for (const fixture of members) {
        expect(fixture.labels).toHaveLength(8);
        expect(fixture.bytes.length).toBeLessThanOrEqual(10 * 1024 * 1024);
      }
    }
  }, 15000);
});
