# Native layout evidence (AA011)

Status: **AA010/AA011 NATIVE SCOPE ACCEPTED; AA1 RELEASE GATE OPEN**. The earlier sequencing error remains recorded in [`tasks/todo.md`](../../tasks/todo.md). Gate AA0 subsequently passed through explicit [ADR-0009](../decisions/0009-aa0-truth-contract-and-evaluation-design.md) approval; the 2026-10-04 conformity review below accepts the retained native formats for their scoped tasks, not representative accuracy or full AA1.

Post-AA0 review (2026-10-04): native source invariants and fixture/browser behavior were reverified, and native contact evidence now has a strict worker-side runtime validator. The persisted formats remain `native-evidence-v1` / `native-layout-v1`, with uncalibrated states and approximate geometry; they are not silently upgraded to the v2 envelope. Full local regression passes with 248 tests and 45 browser tests. OCR runtime isolation, independent corpus annotation and representative extraction validity remain pending; see the AA1 progress/prerequisite record in the todo. No schema, authoritative score, production flag or native source text changed.

## Contract and supported scope

### Post-AA0 conformity record (2026-10-04)

ADR-0009 permits retaining validated native v1 formats. The following contextual bindings satisfy that native scope; duplicating them into a runtime v2 envelope is not an additional AA010/AA011 gate.

| Concern | Implemented binding and verification | Qualification |
| --- | --- | --- |
| Owner, analysis and source | Service RPC derives owner/organization from locked analysis; analysis links immutable `resume_versions`; SQL verifier tests atomic writes, retries and denied client roles | Graph-local page IDs are not globally unique record IDs |
| Input/text hashes and time | Upload SHA-256 in source version, text SHA-256 beside extraction, server-created timestamps | Download is not rehashed; SQL checks hash shape, not independent cryptographic equality |
| Source provenance | Strict `native-evidence-v1`, `unpdf-v1`, `native-layout-v1`; grounded Unicode spans and explicit uncalibrated contact states | Contact-only scope; other critical fields remain AA1 work |
| Geometry/order | Qualified approximate font-em boxes, immutable source order, `native-xy-cut-v1` hypotheses; pinned real synthetic PDFs and accessible Parse View | No precise word polygons, universal ordering or calibrated probabilities |
| Private access | Private bucket; owner-filtered analysis/layout reads; validated JSON; cross-owner unit/browser tests | No new public raw-evidence access |
| Export/deletion/retention | Existing owner-filtered extraction export; analysis deletion cascade; parent resume retention sweep | Inherited lifecycle, not a per-object frozen retention-policy ID; production scheduling remains A4 |

Implementation references: `app/lib/server/storage.ts`, `analysis-ingestion.ts`, `native-evidence-schema.ts`, `layout-read-model.ts`, `privacy-worker.ts`, `retention.ts`; extraction/page/evidence/layout migrations; `scripts/verify-native-evidence.sql`. Fresh native hardening revision `db9c1abce96c1ab218a91f5080f0d7ea82336a22` passed all four [GitHub CI jobs](https://github.com/vsuman00/ai_resume_checker/actions/runs/37186856623), including full migrated Supabase SQL checks, with local 248 tests and 45 browser tests. This is scoped conformity/regression evidence, not representative extraction accuracy.

The experimental pure `native-evidence-v2.ts` adapter separately projects immutable v1 sources into a strict, scoring-ineligible envelope. It performs no authentication, download/hash verification, persistence or pipeline integration; callers must supply authorized server context. Unknown coverage/calibration/line geometry stay null with reasons. This helper does not fix AA013: the current worker scoring path still requires an explicit unsafe-evidence no-score gate.

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
