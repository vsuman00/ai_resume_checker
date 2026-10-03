import { layoutTextGroups, type LayoutPage } from "~/lib/native-layout-schema";
import { useMemo, useState } from "react";
import NativeStructureEvidence from "./NativeStructureEvidence";

const warningText: Record<string, string> = {
  invalid_geometry: "Some text has no usable geometry.",
  out_of_page_geometry: "Some text lies outside the rendered page.",
  unsupported_reading_direction:
    "Rotated or non-left-to-right text needs manual reading-order review.",
  ambiguous_columns_or_table:
    "Separated text may be columns or table cells. Source order is preserved; grouping needs review.",
  source_order_not_top_to_bottom:
    "PDF source order differs from top-to-bottom visual order.",
};

export default function NativeLayoutEvidence({
  page,
  selectedRun,
  onSelectRun,
}: {
  page: LayoutPage;
  selectedRun: string | null;
  onSelectRun: (id: string) => void;
}) {
  const lines = useMemo(
    () => layoutTextGroups(page).filter((line) => line.text.trim()),
    [page],
  );
  const runs = page.blocks.filter((block) => block.text.trim());
  const [runOffset, setRunOffset] = useState(0);
  const [lineOffset, setLineOffset] = useState(0);
  return (
    <section
      className="parse-page-evidence native-layout-evidence"
      aria-label={`Page ${page.pageNumber} layout evidence`}
    >
      <h4>Page {page.pageNumber} layout evidence</h4>
      <p>
        Approximate text-run boxes, not measured word or glyph boundaries.
        Confidence is uncalibrated. PDF source order is preserved.
      </p>
      <p>
        {page.state === "review_required"
          ? "Reading order requires review."
          : "No supported-layout warning detected; this is not calibrated accuracy."}
      </p>
      {page.warnings.length > 0 && (
        <ul>
          {page.warnings.map((warning) => (
            <li key={warning}>{warningText[warning]}</li>
          ))}
        </ul>
      )}
      <NativeStructureEvidence
        page={page}
        selectedRun={selectedRun}
        onSelectRun={onSelectRun}
      />
      <details>
        <summary>Source text runs ({page.blocks.length})</summary>
        <ol>
          {runs.slice(runOffset, runOffset + 50).map((block) => (
            <li key={block.id}>
              <button
                type="button"
                aria-pressed={selectedRun === block.id}
                onClick={() => onSelectRun(block.id)}
                aria-controls="native-source-preview"
              >
                Show source run {block.sourceOrder + 1}: {block.text}
              </button>
              <span>
                {" "}
                · page {page.pageNumber}, characters {block.start}–{block.end}
                {block.box ? " · approximate box" : " · geometry unavailable"}
              </span>
            </li>
          ))}
        </ol>
        {runs.length > 50 && (
          <div>
            <button
              type="button"
              disabled={runOffset === 0}
              onClick={() => setRunOffset(runOffset - 50)}
            >
              Previous source runs
            </button>
            <span>
              {" "}
              Runs {runOffset + 1}–{Math.min(runOffset + 50, runs.length)} of{" "}
              {runs.length}{" "}
            </span>
            <button
              type="button"
              disabled={runOffset + 50 >= runs.length}
              onClick={() => setRunOffset(runOffset + 50)}
            >
              Next source runs
            </button>
          </div>
        )}
      </details>
      <details>
        <summary>Text lines and word offsets ({lines.length} lines)</summary>
        <ol>
          {lines.slice(lineOffset, lineOffset + 20).map((line) => (
            <li key={line.id}>
              <p>{line.text}</p>
              <p>
                Source characters {line.start}–{line.end}; {line.runIds.length}{" "}
                linked text runs.
              </p>
              <p>
                Word offsets:{" "}
                {line.words
                  .map((word) => `${word.text}: ${word.start}–${word.end}`)
                  .join("; ")}
              </p>
            </li>
          ))}
        </ol>
        {lines.length > 20 && (
          <div>
            <button
              type="button"
              disabled={lineOffset === 0}
              onClick={() => setLineOffset(lineOffset - 20)}
            >
              Previous text lines
            </button>
            <span>
              {" "}
              Lines {lineOffset + 1}–{Math.min(lineOffset + 20, lines.length)}{" "}
              of {lines.length}{" "}
            </span>
            <button
              type="button"
              disabled={lineOffset + 20 >= lines.length}
              onClick={() => setLineOffset(lineOffset + 20)}
            >
              Next text lines
            </button>
          </div>
        )}
      </details>
    </section>
  );
}
