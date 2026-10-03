import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { extractPdfTextLayers } from "../../app/lib/server/ocr/pdf-detection";
import { NativeLayoutSchema } from "../../app/lib/native-layout-schema";
import { inferNativeStructure } from "../../app/lib/native-layout-structure";
import {
  readingOrderFixtures,
  readingOrderPdf,
} from "../fixtures/native-reading-order";

describe("AA011 frozen synthetic reading-order gate", () => {
  it("pins PDF bytes and expected labels against silent corpus drift", () => {
    const hash = createHash("sha256");
    for (const fixture of readingOrderFixtures) {
      hash.update(JSON.stringify(fixture));
      hash.update(readingOrderPdf(fixture));
    }
    expect(hash.digest("hex")).toBe(
      "8e1d89daeeda299b24b5467727b50f29957c9760e12b9bd1d6d2e75b5f8bfac1",
    );
  });
  it("meets 98% single/95% multi positional line agreement with full coverage", async () => {
    const counts = {
      single: { correct: 0, total: 0 },
      multi: { correct: 0, total: 0 },
    };
    for (const fixture of readingOrderFixtures) {
      const extracted = await extractPdfTextLayers(readingOrderPdf(fixture), {
        maxPages: 2,
        maxCharacters: 10000,
        includeLayout: true,
      });
      const page = NativeLayoutSchema.parse(extracted.nativeLayout).pages[0];
      const structure = inferNativeStructure(page);
      const lines = new Map(
        structure.lines.map((line) => [line.id, line.text]),
      );
      if (fixture.segment === "unsupported") {
        expect(structure.state, fixture.id).toBe("unsupported");
        expect(structure.inferredLineIds, fixture.id).toEqual([]);
        continue;
      }
      if (fixture.segment === "table") {
        expect(structure.state, fixture.id).toBe("ambiguous_table_or_columns");
        expect(
          structure.tables[0].rows.flat().map((id) => lines.get(id)),
          fixture.id,
        ).toEqual(fixture.expected);
        continue;
      }
      const actual = structure.inferredLineIds.map((id) => lines.get(id));
      expect(actual.length, fixture.id).toBe(fixture.expected.length);
      expect(new Set(structure.inferredLineIds).size, fixture.id).toBe(
        structure.lines.length,
      );
      counts[fixture.segment].total += fixture.expected.length;
      counts[fixture.segment].correct += fixture.expected.filter(
        (label, index) => actual[index] === label,
      ).length;
      // Per-fixture exact equality prevents a good aggregate masking a failure.
      expect(actual, fixture.id).toEqual(fixture.expected);
      for (const line of structure.lines)
        for (const word of line.words)
          expect(
            Array.from(page.text).slice(word.start, word.end).join(""),
          ).toBe(word.text);
    }
    expect(counts.single.total).toBe(12);
    expect(counts.multi.total).toBe(19);
    expect(counts.single.correct / counts.single.total).toBeGreaterThanOrEqual(
      0.98,
    );
    expect(counts.multi.correct / counts.multi.total).toBeGreaterThanOrEqual(
      0.95,
    );
  });
});
