import type { LayoutPage } from "./native-layout-schema";

type Box = NonNullable<LayoutPage["blocks"][number]["box"]>;
type Run = LayoutPage["blocks"][number] & { box: Box };
export type VisualLine = {
  id: string;
  box: Box;
  text: string;
  runIds: string[];
  words: { text: string; start: number; end: number; runId: string }[];
};

function bounds(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map((box) => box.x + box.width)) - x,
    height: Math.max(...boxes.map((box) => box.y + box.height)) - y,
  };
}

// Derived, versioned hypotheses over immutable source evidence. Never rewrite
// page.text or use these guesses as scoring facts. Requires schema-validated input.
export function inferNativeStructure(page: LayoutPage) {
  const unsupported = page.warnings.some((warning) =>
    [
      "invalid_geometry",
      "out_of_page_geometry",
      "unsupported_reading_direction",
    ].includes(warning),
  );
  const runs = page.blocks
    .filter((run): run is Run => Boolean(run.text.trim() && run.box))
    .sort(
      (a, b) =>
        a.box.y - b.box.y || a.box.x - b.box.x || a.sourceOrder - b.sourceOrder,
    );
  const rows: Run[][] = [];
  for (const run of runs) {
    const row = rows.at(-1);
    if (
      row &&
      Math.abs(row[0].box.y - run.box.y) <=
        Math.min(row[0].box.height, run.box.height) / 2
    )
      row.push(run);
    else rows.push([run]);
  }
  const visualRows: VisualLine[][] = [];
  const lines: VisualLine[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.box.x - b.box.x || a.sourceOrder - b.sourceOrder);
    const groups: Run[][] = [];
    for (const run of row) {
      const group = groups.at(-1);
      const previous = group?.at(-1);
      if (previous && run.box.x - previous.box.x - previous.box.width <= 0.04)
        group!.push(run);
      else groups.push([run]);
    }
    visualRows.push(
      groups.map((group) => {
        const line: VisualLine = {
          id: `${page.pageId}-visual-line-${lines.length + 1}`,
          box: bounds(group.map((run) => run.box)),
          text: group.map((run) => run.text).join(" "),
          runIds: group.map((run) => run.id),
          words: group.flatMap((run) => {
            let cursor = 0;
            let offset = run.start;
            return [...run.text.matchAll(/\S+/gu)].map((match) => {
              offset += Array.from(run.text.slice(cursor, match.index)).length;
              const start = offset;
              offset += Array.from(match[0]).length;
              cursor = match.index + match[0].length;
              return { text: match[0], start, end: offset, runId: run.id };
            });
          }),
        };
        lines.push(line);
        return line;
      }),
    );
  }
  const columns: { id: string; box: Box; lineIds: string[] }[] = [];
  // XY-cut: disjoint horizontal intervals yield persistent vertical gutters.
  // Wide spanning headings/footers split bands before column-major traversal.
  function orderBand(band: VisualLine[]): string[] {
    if (!band.length) return [];
    const sorted = [...band].sort((a, b) => a.box.x - b.box.x);
    const groups: VisualLine[][] = [];
    let right = -Infinity;
    for (const line of sorted) {
      if (line.box.x - right > 0.04) groups.push([]);
      groups.at(-1)!.push(line);
      right = Math.max(right, line.box.x + line.box.width);
    }
    return groups.flatMap((group) => {
      group.sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
      const lineIds = group.map((line) => line.id);
      columns.push({
        id: `${page.pageId}-column-${columns.length + 1}`,
        box: bounds(group.map((line) => line.box)),
        lineIds,
      });
      return lineIds;
    });
  }
  const inferredLineIds: string[] = [];
  let band: VisualLine[] = [];
  for (const row of visualRows) {
    if (row.length === 1 && row[0].box.width >= 0.65) {
      inferredLineIds.push(...orderBand(band), row[0].id);
      band = [];
    } else band.push(...row);
  }
  inferredLineIds.push(...orderBand(band));
  // Aligned repeated rows are table candidates, not proof of table semantics.
  // Retain row-major cells alongside the competing column-major hypothesis.
  const tables: {
    id: string;
    box: Box;
    rows: string[][];
    state: "candidate";
  }[] = [];
  let grid: VisualLine[][] = [];
  function flushGrid() {
    if (grid.length >= 3)
      tables.push({
        id: `${page.pageId}-table-${tables.length + 1}`,
        box: bounds(grid.flat().map((line) => line.box)),
        rows: grid.map((row) => row.map((line) => line.id)),
        state: "candidate",
      });
    grid = [];
  }
  for (const row of visualRows) {
    const previous = grid.at(-1);
    const aligned =
      !previous ||
      (previous.length === row.length &&
        row.every(
          (line, index) =>
            Math.abs(line.box.x - previous[index].box.x) <= 0.015,
        ) &&
        row[0].box.y - previous[0].box.y <=
          Math.max(row[0].box.height, previous[0].box.height) * 4);
    if (row.length < 2 || !aligned) flushGrid();
    if (row.length >= 2) grid.push(row);
  }
  flushGrid();
  return {
    algorithm: "native-xy-cut-v1" as const,
    state:
      unsupported || !runs.length
        ? ("unsupported" as const)
        : tables.length
          ? ("ambiguous_table_or_columns" as const)
          : ("inferred" as const),
    lines,
    columns: unsupported ? [] : columns,
    tables: unsupported ? [] : tables,
    // Fail closed for unsupported direction/geometry; source order remains available.
    inferredLineIds: unsupported ? [] : inferredLineIds,
  };
}
