export type NativeTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  dir: string;
  hasEOL: boolean;
  fontName: string;
};

type Viewport = {
  width: number;
  height: number;
  rotation: number;
  convertToViewportPoint: (x: number, y: number) => number[];
};

// Font-em rectangles are approximate text-run bounds, not glyph/word boxes.
// Keep PDF source order and offsets authoritative; never infer table cells.
export function normalizeNativePageLayout(
  pageNumber: number,
  viewport: Viewport,
  items: readonly NativeTextItem[],
  styles: Record<string, { ascent?: number }>,
) {
  if (
    !Number.isFinite(viewport.width) ||
    !Number.isFinite(viewport.height) ||
    viewport.width <= 0 ||
    viewport.height <= 0
  )
    throw new Error("Invalid native page dimensions.");
  const pageId = `page-${pageNumber}`;
  const warnings = new Set<string>();
  let offset = 0;
  const blocks = items.map((item, index) => {
    const start = offset;
    offset += Array.from(item.str).length + (item.hasEOL ? 1 : 0);
    const [a, b, c, d, x, y] = item.transform;
    const ascent = styles[item.fontName]?.ascent ?? 1;
    const advance = Math.hypot(a, b);
    let box: { x: number; y: number; width: number; height: number } | null =
      null;
    if (
      item.transform.length !== 6 ||
      ![a, b, c, d, x, y, item.width, item.height, ascent].every(
        Number.isFinite,
      ) ||
      advance <= 0 ||
      Math.hypot(c, d) <= 0 ||
      item.width < 0 ||
      item.height < 0
    ) {
      warnings.add("invalid_geometry");
    } else {
      const dx = (a / advance) * item.width;
      const dy = (b / advance) * item.width;
      const points = [ascent - 1, ascent].flatMap((height) =>
        [0, 1].map((edge) =>
          viewport.convertToViewportPoint(
            x + c * height + dx * edge,
            y + d * height + dy * edge,
          ),
        ),
      );
      if (
        points.every(
          (point) => point.length === 2 && point.every(Number.isFinite),
        )
      ) {
        const left =
          Math.min(...points.map((point) => point[0])) / viewport.width;
        const top =
          Math.min(...points.map((point) => point[1])) / viewport.height;
        const right =
          Math.max(...points.map((point) => point[0])) / viewport.width;
        const bottom =
          Math.max(...points.map((point) => point[1])) / viewport.height;
        if (left < 0 || top < 0 || right > 1 || bottom > 1)
          warnings.add("out_of_page_geometry");
        // Do not clip: evidence outside a crop box must remain observable.
        box = { x: left, y: top, width: right - left, height: bottom - top };
      } else warnings.add("invalid_geometry");
      if (
        item.dir !== "ltr" ||
        b !== 0 ||
        c !== 0 ||
        a <= 0 ||
        d <= 0 ||
        viewport.rotation !== 0
      ) {
        warnings.add("unsupported_reading_direction");
      }
    }
    return {
      id: `${pageId}-run-${index + 1}`,
      pageId,
      text: item.str,
      start,
      end: start + Array.from(item.str).length,
      sourceOrder: index,
      box,
      geometry: "approximate_font_em" as const,
    };
  });
  const visible = blocks.filter((block) => block.text.trim() && block.box);
  // Separate runs at the same baseline can be columns, table cells, or labels.
  // Flag ambiguity rather than guessing which interpretation is correct.
  for (let index = 0; index < visible.length; index++) {
    const current = visible[index].box!;
    if (index > 0 && current.y + current.height < visible[index - 1].box!.y) {
      warnings.add("source_order_not_top_to_bottom");
    }
  }
  // Group visual rows and inspect adjacent boxes, avoiding pairwise work on
  // untrusted documents. This detects ambiguity, not a calibrated layout type.
  const rows: (typeof visible)[] = [];
  for (const block of [...visible].sort(
    (left, right) => left.box!.y - right.box!.y,
  )) {
    const row = rows.at(-1);
    const anchor = row?.[0].box;
    if (
      anchor &&
      Math.abs(block.box!.y - anchor.y) <=
        Math.min(block.box!.height, anchor.height) / 2
    )
      row!.push(block);
    else rows.push([block]);
  }
  for (const row of rows) {
    row.sort((left, right) => left.box!.x - right.box!.x);
    if (
      row.some(
        (block, index) =>
          index > 0 &&
          block.box!.x - row[index - 1].box!.x - row[index - 1].box!.width >
            0.08,
      )
    ) {
      warnings.add("ambiguous_columns_or_table");
    }
  }
  return {
    pageId,
    pageNumber,
    width: viewport.width,
    height: viewport.height,
    rotation: viewport.rotation,
    coordinateSystem: "normalized_top_left" as const,
    readingOrder: "pdf_source_order" as const,
    state: warnings.size
      ? ("review_required" as const)
      : ("uncalibrated" as const),
    warnings: [...warnings],
    blocks,
  };
}

export type NativePageLayout = ReturnType<typeof normalizeNativePageLayout>;
