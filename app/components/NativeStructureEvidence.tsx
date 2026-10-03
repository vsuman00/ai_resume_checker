import { useMemo, useState } from "react";
import { inferNativeStructure } from "~/lib/native-layout-structure";
import type { LayoutPage } from "~/lib/native-layout-schema";

export default function NativeStructureEvidence({
  page,
  selectedRun,
  onSelectRun,
}: {
  page: LayoutPage;
  selectedRun: string | null;
  onSelectRun: (id: string) => void;
}) {
  const structure = useMemo(() => inferNativeStructure(page), [page]);
  const byId = useMemo(
    () => new Map(structure.lines.map((line) => [line.id, line])),
    [structure],
  );
  const [offset, setOffset] = useState(0);
  return (
    <details>
      <summary>Geometric lines, columns and table candidates</summary>
      <p>
        {structure.algorithm}: {structure.lines.length} visual lines;{" "}
        {structure.columns.length} column regions; {structure.tables.length}{" "}
        table candidates. Derived geometry is approximate and does not replace
        source text or scoring evidence.
      </p>
      {structure.state === "unsupported" ? (
        <p>
          No inferred order is available for empty, rotated or invalid-geometry
          pages. Use source runs for manual review.
        </p>
      ) : (
        <>
          <p>
            Inferred reading order: top-to-bottom within each left-to-right
            column, with wide spanning headings between column bands.
          </p>
          {structure.state === "ambiguous_table_or_columns" && (
            <p>
              Table or columns: manual review required. Row-major cells below
              are an alternative to the inferred column order, not confirmed
              table semantics.
            </p>
          )}
          <details>
            <summary>Column regions ({structure.columns.length})</summary>
            <ul>
              {structure.columns.slice(0, 20).map((column) => (
                <li key={column.id}>
                  {column.id}: {column.lineIds.length} lines; normalized bounds{" "}
                  {[
                    column.box.x,
                    column.box.y,
                    column.box.width,
                    column.box.height,
                  ]
                    .map((value) => value.toFixed(3))
                    .join(", ")}{" "}
                  (x, y, width, height).
                </li>
              ))}
            </ul>
            {structure.columns.length > 20 && (
              <p>
                Showing the first 20 regions; every line is available in the
                paginated inferred order.
              </p>
            )}
          </details>
          <ol start={offset + 1} aria-label="Inferred visual reading order">
            {structure.inferredLineIds.slice(offset, offset + 20).map((id) => {
              const line = byId.get(id)!;
              return (
                <li key={id}>
                  <p>{line.text}</p>
                  {line.runIds.map((runId) => (
                    <button
                      key={runId}
                      type="button"
                      aria-controls="native-source-preview"
                      aria-pressed={selectedRun === runId}
                      onClick={() => onSelectRun(runId)}
                    >
                      Show visual line source {runId}
                    </button>
                  ))}
                  <p>
                    Grounded words:{" "}
                    {line.words
                      .map((word) => `${word.text}: ${word.start}–${word.end}`)
                      .join("; ")}
                  </p>
                </li>
              );
            })}
          </ol>
          {structure.inferredLineIds.length > 20 && (
            <div>
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(offset - 20)}
              >
                Previous visual lines
              </button>
              <span>
                {" "}
                Lines {offset + 1}–
                {Math.min(offset + 20, structure.inferredLineIds.length)} of{" "}
                {structure.inferredLineIds.length}{" "}
              </span>
              <button
                type="button"
                disabled={offset + 20 >= structure.inferredLineIds.length}
                onClick={() => setOffset(offset + 20)}
              >
                Next visual lines
              </button>
            </div>
          )}
          {structure.tables.slice(0, 20).map((table) => (
            <details key={table.id}>
              <summary>
                {table.id}: {table.rows.length} candidate rows
              </summary>
              <ol aria-label="Candidate table rows">
                {table.rows.slice(0, 20).map((row, index) => (
                  <li key={index}>
                    {row.map((id) => byId.get(id)!.text).join(" | ")}
                  </li>
                ))}
              </ol>
              {table.rows.length > 20 && (
                <p>
                  Showing the first 20 rows; all cells remain available through
                  source runs.
                </p>
              )}
            </details>
          ))}
          {structure.tables.length > 20 && (
            <p>
              Showing the first 20 candidates; all cells remain available
              through source runs.
            </p>
          )}
        </>
      )}
    </details>
  );
}
