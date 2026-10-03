import { z } from "zod";

export const LayoutBoxSchema = z.object({
  x: z.number().finite().min(-100).max(100),
  y: z.number().finite().min(-100).max(100),
  width: z.number().finite().nonnegative().max(100),
  height: z.number().finite().nonnegative().max(100),
});
export const NativeLayoutSchema = z
  .object({
    schemaVersion: z.literal("native-layout-v1"),
    pages: z
      .array(
        z.object({
          pageId: z.string(),
          pageNumber: z.number().int().positive(),
          text: z.string().max(500_000),
          width: z.number().finite().positive().max(100_000),
          height: z.number().finite().positive().max(100_000),
          rotation: z.number().int().min(0).max(359),
          coordinateSystem: z.literal("normalized_top_left"),
          readingOrder: z.literal("pdf_source_order"),
          state: z.enum(["uncalibrated", "review_required"]),
          warnings: z
            .array(
              z.enum([
                "invalid_geometry",
                "out_of_page_geometry",
                "unsupported_reading_direction",
                "ambiguous_columns_or_table",
                "source_order_not_top_to_bottom",
              ]),
            )
            .max(5),
          blocks: z
            .array(
              z.object({
                id: z.string(),
                pageId: z.string(),
                text: z.string(),
                start: z.number().int().nonnegative(),
                end: z.number().int().nonnegative(),
                sourceOrder: z.number().int().nonnegative(),
                box: LayoutBoxSchema.nullable(),
                geometry: z.literal("approximate_font_em"),
              }),
            )
            .max(10_000),
        }),
      )
      .min(1)
      .max(100),
  })
  .superRefine((layout, context) => {
    for (const [pageIndex, page] of layout.pages.entries()) {
      const chars = Array.from(page.text);
      let cursor = 0;
      let valid =
        page.pageNumber === pageIndex + 1 &&
        page.pageId === `page-${pageIndex + 1}` &&
        page.state ===
          (page.warnings.length ? "review_required" : "uncalibrated");
      for (const [index, block] of page.blocks.entries()) {
        valid &&=
          block.pageId === page.pageId &&
          block.id === `${page.pageId}-run-${index + 1}` &&
          block.sourceOrder === index &&
          block.start >= cursor &&
          block.end >= block.start &&
          block.end <= chars.length &&
          ["", "\n"].includes(chars.slice(cursor, block.start).join("")) &&
          chars.slice(block.start, block.end).join("") === block.text;
        if (!block.box) valid &&= page.warnings.includes("invalid_geometry");
        else if (
          block.box.x < 0 ||
          block.box.y < 0 ||
          block.box.x + block.box.width > 1 ||
          block.box.y + block.box.height > 1
        ) {
          valid &&= page.warnings.includes("out_of_page_geometry");
        }
        cursor = block.end;
      }
      valid &&= ["", "\n"].includes(chars.slice(cursor).join(""));
      if (!valid)
        context.addIssue({
          code: "custom",
          path: ["pages", pageIndex],
          message: "Layout evidence is not grounded in its page",
        });
    }
  });
export type NativeLayout = z.infer<typeof NativeLayoutSchema>;
export type LayoutPage = NativeLayout["pages"][number];

// Word boundaries are textual, not measured glyph geometry. Preserve links to
// actual source runs; do not invent per-word rectangles or reorder columns.
export function layoutTextGroups(page: LayoutPage) {
  let offset = 0;
  let runIndex = 0;
  return page.text.split("\n").map((text, index) => {
    const start = offset;
    offset += Array.from(text).length + 1;
    const end = offset - 1;
    while (runIndex < page.blocks.length && page.blocks[runIndex].end <= start)
      runIndex++;
    const runIds: string[] = [];
    for (
      let index = runIndex;
      index < page.blocks.length && page.blocks[index].start < end;
      index++
    ) {
      runIds.push(page.blocks[index].id);
    }
    let textCursor = 0;
    let wordOffset = start;
    const words = [...text.matchAll(/\S+/gu)].map((match) => {
      wordOffset += Array.from(text.slice(textCursor, match.index)).length;
      const wordStart = wordOffset;
      wordOffset += Array.from(match[0]).length;
      textCursor = match.index + match[0].length;
      return {
        text: match[0],
        start: wordStart,
        end: wordStart + Array.from(match[0]).length,
      };
    });
    return {
      id: `${page.pageId}-text-line-${index + 1}`,
      text,
      start,
      end,
      runIds,
      words,
    };
  });
}
