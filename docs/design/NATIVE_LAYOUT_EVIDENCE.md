# Native layout evidence (AA011)

Status: **IMPLEMENTATION/FIXTURE VERIFIED; PHASE ACCEPTANCE PENDING CONFORMITY REVIEW**. The 2026-10-04 sequencing correction in [`tasks/todo.md`](../../tasks/todo.md) supersedes the earlier claim of AA011 completion. Gate AA0 subsequently passed through explicit [ADR-0009](../decisions/0009-aa0-truth-contract-and-evaluation-design.md) approval. Existing opt-in code/tests are preserved; conformity with the frozen contracts and AA1 release evidence remain separate acceptance requirements.

## Contract and supported scope

The opt-in native-PDF path stores validated `native-layout-v1` source evidence: page dimensions, normalized top-left approximate font-em run boxes, Unicode code-point offsets, original PDF source order, and review warnings. The owner-filtered read model returns this evidence only after schema validation. Legacy analyses and OCR replacements may have no native evidence. No new database schema or privileges are required for structure inference.

`inferNativeStructure` derives `native-xy-cut-v1` hypotheses from those saved runs, identically on replay. It never mutates source text, offsets, checksums, saved boxes, or scoring inputs. Geometric lines join nearby same-baseline runs; words retain their exact original offsets and run identity. A line's display text may insert spaces between runs; it is not a new authoritative source span. Word/glyph boxes are not fabricated from font-em run geometry.

Supported ordering is horizontal left-to-right text in non-overlapping single-column layouts or separated multi-column bands with persistent gutters. Traversal is top-to-bottom inside each column, left column before right column. Wide spanning headings/footers separate bands. Algorithm constants are normalized page units: row tolerance is half the smaller run height; a gap greater than 0.04 separates line groups and column intervals; spanning lines are at least 0.65 wide. These are versioned heuristics, not calibrated probabilities.

Three or more consecutive aligned rows with multiple separated cells produce a table candidate with row-major cell references and normalized bounds. Column starts must align within 0.015; consecutive row spacing must not exceed four line heights. Text geometry alone cannot reliably distinguish a table from aligned columns. Both hypotheses remain inspectable and require review; no candidate becomes a confirmed table or accepted fact.

Empty, rotated/non-LTR, invalid, or out-of-page geometry has no inferred reading order. Overlapping text, narrow gutters, short centered headings, merged cells, nested columns, irregular tables, and vertical/bidirectional text are outside the verified supported subset. They require manual review; an inferred hypothesis must never be treated as a calibrated acceptance signal. The original PDF and source-run order remain available.

## Parse View

Each page exposes source runs, textual lines/word offsets, inferred geometric lines, column bounds, and candidate table rows. Visual-line buttons select their original source runs in the page preview using native keyboard controls. Highlights are approximate, page-linked, and reset on page change. Controls are paginated/bounded: 20 inferred lines at a time, first 20 column/table summaries and table rows, with all underlying runs still accessible. No confidence percentage is shown.

## Reproducible fixture gate

Run `npm run benchmark:native-layout`; no `.env`, database, provider key, or network request is required. CI runs it explicitly, and the regular test suite includes it.

The version-1 **synthetic regression corpus**, in `tests/fixtures/native-reading-order.ts`, contains four single-column PDFs, four multi-column PDFs (including three columns and a spanning heading), one aligned table candidate, and two unsupported cases. PDF bytes and independent expected labels are SHA-256 pinned by the test. Any corpus change requires explicit review and a new pin; thresholds must not be lowered.

The gate counts an ordered line correct only if its text matches the independent label at the exact expected index. Missing/extra/duplicate lines fail; every supported fixture also requires exact sequence equality, so aggregate performance cannot hide a failed fixture. The gate requires at least 98% single-column and 95% multi-column positional agreement. Current results are 12/12 single-column and 19/19 multi-column lines, with all eight supported fixtures covered. The table fixture requires all six row-major cells and an explicit ambiguity state. Rotated/outside-crop fixtures require abstention. Unicode grounding and immutable/deterministic replay are independently unit tested.

This is fixture-level AA011 verification, **not** the representative, independently held-out AA015 release corpus or the `benchmark:extraction-v2` release gate. The sample is too small and synthetic to establish production accuracy or confidence intervals. AA015/AA1 calibration, OCR, domain/locale validation, and production Gate A4 remain separate pending gates.

## Rollout and rollback

`NATIVE_LAYOUT_ENABLED` remains false by default. Enable only after deploying the existing service-only persistence migration and passing its SQL verifier. Structures are derived, so disabling the flag stops new collection without changing saved source evidence. Reverting the UI/normalizer hides derived hypotheses without rewriting database records. Owner-only access, privacy export, and cascading deletion continue to use the existing contracts.
