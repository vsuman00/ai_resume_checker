import { describe, expect, it } from "vitest";
import { inferNativeStructure } from "../../app/lib/native-layout-structure";
import { NativeLayoutSchema } from "../../app/lib/native-layout-schema";
import { normalizeNativePageLayout } from "../../app/lib/server/native-layout";

function page(points: [string, number, number, number][]) {
  return NativeLayoutSchema.parse({
    schemaVersion: "native-layout-v1",
    pages: [
      normalizeNativePageLayout(
        1,
        {
          width: 600,
          height: 800,
          rotation: 0,
          convertToViewportPoint: (x, y) => [x, 800 - y],
        },
        points.map(([str, x, y, width]) => ({
          str,
          transform: [12, 0, 0, 12, x, y],
          width,
          height: 12,
          dir: "ltr",
          hasEOL: true,
          fontName: "font",
        })),
        {},
      ),
    ],
  }).pages[0];
}

describe("native XY-cut structure", () => {
  it("orders columns independently of draw order and keeps spanning headings", () => {
    const source = page([
      ["Right2", 350, 640, 100],
      ["Left2", 40, 650, 120],
      ["Title", 40, 750, 480],
      ["Right1", 350, 700, 100],
      ["Left1", 40, 710, 120],
    ]);
    const original = JSON.stringify(source);
    const result = inferNativeStructure(source);
    const byId = new Map(result.lines.map((line) => [line.id, line.text]));
    expect(result.inferredLineIds.map((id) => byId.get(id))).toEqual([
      "Title",
      "Left1",
      "Left2",
      "Right1",
      "Right2",
    ]);
    expect(result.columns).toHaveLength(2);
    expect(JSON.stringify(source)).toBe(original);
    expect(inferNativeStructure(source)).toEqual(result);
  });
  it("retains competing row-major table cells and column order as hypotheses", () => {
    const result = inferNativeStructure(
      page([
        ["A", 40, 700, 30],
        ["1", 350, 700, 30],
        ["B", 40, 680, 30],
        ["2", 350, 680, 30],
        ["C", 40, 660, 30],
        ["3", 350, 660, 30],
      ]),
    );
    expect(result.state).toBe("ambiguous_table_or_columns");
    expect(result.tables[0].rows).toHaveLength(3);
    expect(result.tables[0].rows.flat().sort()).toEqual(
      [...result.inferredLineIds].sort(),
    );
  });
  it("links Unicode words to exact original offsets, never invented word boxes", () => {
    const source = page([
      ["😀 Notes", 40, 700, 100],
      ["email", 145, 700, 40],
    ]);
    const result = inferNativeStructure(source);
    expect(result.lines).toHaveLength(1);
    for (const word of result.lines[0].words)
      expect(Array.from(source.text).slice(word.start, word.end).join("")).toBe(
        word.text,
      );
    expect(result.lines[0].runIds).toHaveLength(2);
  });
  it("fails closed on out-of-page geometry and handles empty pages", () => {
    const result = inferNativeStructure(page([["Outside", -40, 700, 30]]));
    expect(result.state).toBe("unsupported");
    expect(result.inferredLineIds).toEqual([]);
    expect(result.columns).toEqual([]);
    expect(inferNativeStructure(page([])).lines).toEqual([]);
  });
});
