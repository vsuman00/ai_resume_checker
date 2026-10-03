import { describe, expect, it } from "vitest";
import {
  normalizeNativePageLayout,
  type NativeTextItem,
} from "../../app/lib/server/native-layout";

const viewport = {
  width: 600,
  height: 800,
  rotation: 0,
  convertToViewportPoint: (x: number, y: number) => [x, 800 - y],
};
const item = (str: string, x = 60, y = 720): NativeTextItem => ({
  str,
  transform: [12, 0, 0, 12, x, y],
  width: 120,
  height: 12,
  dir: "ltr",
  hasEOL: true,
  fontName: "font",
});

describe("native layout normalization", () => {
  it("normalizes approximate bounds and links Unicode offsets to source text", () => {
    const page = normalizeNativePageLayout(
      2,
      viewport,
      [item("😀 Notes"), item("Email", 60, 700)],
      { font: { ascent: 0.8 } },
    );
    expect(page.pageId).toBe("page-2");
    expect(page.blocks[0].box?.x).toBeCloseTo(0.1);
    expect(page.blocks[0].box?.y).toBeCloseTo(0.088);
    expect(page.blocks[0].box?.width).toBeCloseTo(0.2);
    expect(page.blocks[0].box?.height).toBeCloseTo(0.015);
    expect(page.blocks[1]).toMatchObject({ start: 8, end: 13, sourceOrder: 1 });
    expect(page.warnings).toEqual([]);
    expect(page.state).toBe("uncalibrated");
  });

  it("preserves source order and flags columns/table ambiguity", () => {
    const page = normalizeNativePageLayout(
      1,
      viewport,
      [item("Right", 360), item("Left", 60)],
      {},
    );
    expect(page.blocks.map((block) => block.text)).toEqual(["Right", "Left"]);
    expect(page.warnings).toContain("ambiguous_columns_or_table");
    expect(page.state).toBe("review_required");
  });

  it("flags reversed vertical source order", () => {
    expect(
      normalizeNativePageLayout(
        1,
        viewport,
        [item("Bottom", 60, 600), item("Top")],
        {},
      ).warnings,
    ).toContain("source_order_not_top_to_bottom");
  });

  it("keeps invalid geometry unavailable and does not clip out-of-page evidence", () => {
    const invalid = { ...item("Invalid"), transform: [NaN, 0, 0, 12, 60, 720] };
    const page = normalizeNativePageLayout(
      1,
      viewport,
      [invalid, item("Outside", -60)],
      {},
    );
    expect(page.blocks[0].box).toBeNull();
    expect(page.blocks[1].box?.x).toBe(-0.1);
    expect(page.warnings).toEqual(
      expect.arrayContaining(["invalid_geometry", "out_of_page_geometry"]),
    );
  });

  it("warns on unsupported direction and rejects invalid page dimensions", () => {
    expect(
      normalizeNativePageLayout(
        1,
        viewport,
        [{ ...item("RTL"), dir: "rtl" }],
        {},
      ).warnings,
    ).toContain("unsupported_reading_direction");
    expect(() =>
      normalizeNativePageLayout(1, { ...viewport, width: 0 }, [], {}),
    ).toThrow("Invalid native page dimensions");
  });
});
