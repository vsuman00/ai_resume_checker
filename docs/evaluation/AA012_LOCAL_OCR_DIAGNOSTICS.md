# AA012 local OCR diagnostic report

Status: **PARTIAL — runtime diagnostics verified; transcription screening failed; AA012/AA1 acceptance open.**
Evaluation: 2026-10-04, synthetic-only English / India-focused software-engineering content. Governing protocol: [ADR-0008](../decisions/0008-selective-ocr-evaluation.md), [ADR-0009](../decisions/0009-aa0-truth-contract-and-evaluation-design.md), scoped AI-label permission [ADR-0010](../decisions/0010-ai-assisted-synthetic-annotation.md). No production integration, real data, managed OCR, external fees or threshold changes.

## Reproduction and receipt

Use the reviewed local image built under ADR-0008. Neither checker builds/downloads an image, reads `.env` nor calls application services:

```sh
npm run test:ocr:pilot -- sha256:38e6a126b40ade4bfb6dd189b4bd69a037c672e6bdb25fefa63a698dc61756e0
npm run test:ocr:pilot -- sha256:38e6a126b40ade4bfb6dd189b4bd69a037c672e6bdb25fefa63a698dc61756e0 --require-quality
```

The default command completes diagnostics, not accuracy acceptance. `--require-quality` exits **1** for this corpus; observed live execution confirmed that nonzero result. A green diagnostic CI step cannot close AA012 or AA1. The authoritative extraction-v2 release benchmark remains unimplemented.

Image receipt: Tesseract `5.3.0-2`, English data SHA-256 `7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2`, Poppler `22.12.0-2+deb12u3`; image package-manifest receipt in ADR-0008/todo. Source/label manifest SHA-256 locked before recognition: `793787e16eb83eac77c8da0eb9b09fc1456c922edcc05284bbdab55cf0054b8a`. Every source PDF hash is separately pinned in `tests/unit/ocr/ocr-pilot.test.ts` and original smoke hashes are unchanged. This is a reproducibility receipt, not a held-out test lock.

The measured run completed at `2026-10-04T14:40:08.126Z`; its hypothetical raw expiry is `2026-11-03T14:40:08.126Z`. PDFs, OCR rasters and recovered text were not persisted. Only generators, source hashes, labels and aggregate non-PII evidence remain; container scratch was removed after each attempt.

## Results

CER uses Unicode code points, case-sensitive comparison, whitespace collapsed to one space. Missing/abstained pages contribute their entire reference length as deletions. OCR-only segment denominators exclude native text, so native preservation cannot dilute mixed OCR errors. Ordered-line agreement is exact-line longest-common-subsequence divided by authored line count. Page availability means nonblank recovered pages / nonblank authored pages; it is not full character coverage or factual correctness.

| Diagnostic segment      | Documents | OCR CER |       Unchanged maximum | Abstentions | Observed wall p50 / p95 |
| ----------------------- | --------: | ------: | ----------------------: | ----------: | ----------------------- |
| Clean block-glyph scans |         6 | 17.105% |                      1% |           0 | 591 / 683 ms            |
| Challenging variants    |         6 | 70.833% |                      3% |           2 | 575 / 628 ms            |
| Mixed, OCR pages only   |         6 |  8.333% | 1% clean-scan screening |           0 | 1,026 / 1,042 ms        |

All three screening gates fail. Latencies include native routing and cleanup, on an already-built local image; six correlated observations are not completion SLOs or cold-start measurements. CER on a deliberately simple block-font generator cannot be generalized to ordinary document fonts.

Six controls: native-only correctly avoids OCR; blank returns `insufficient`; corrupt input returns safe engine failure; an over-10-MiB source is refused before container creation; duplicate and missing provider-page outputs are rejected as `invalid_output`. The last two are contract injections, **not real engine failures**. Native text remains immutable; mixed OCR selects original pages 1 and 3 only. All returned OCR evidence is scoring-ineligible and raw confidence remains uncalibrated. Exact-owned containers are absent after every attempt; no unrelated containers are deleted. Runtime isolation/cancellation/deadline checks are separately provided by `test:ocr:local`.

Critical-value substring recovery is diagnostic only: clean scans recover 1/3 authored contact values; mixed documents recover 5/8 values. This is not structured-field precision/recall. The harness never invents field precision, memory peaks, CPU time, calibrated confidence or human agreement; those remain null/not measured. No automatic retries are implemented. External API fees are zero; local compute cost remains unknown under the owner-approved allocation.

## Protocol gaps and exit decision

The 24 diagnostics include six translations of clean and mixed fixtures, actual ±6.84° shears, 90°/180° raster rotations and 72/36-DPI downsampling. All remain one correlated original block-glyph **development** family. They do not satisfy independent development/calibration/locked family partitions, the specified 150-DPI/blur/compression mix, encrypted-input or oversized-raster execution, or the representative corpus. The over-10-MiB PDF control tests the byte boundary, not the image-pixel bound. Expected runtime-attempt counts are declared workload, not observed process/billing accounting. LCS ordering is a diagnostic, not the approved exact-position reading-order gate. Twenty-four unique byte hashes do not establish twenty-four independent samples.

The metric helper supports fixed-seed whole-family bootstrap (10,000 resamples, seed `20261004`), with deterministic regression tests. This dataset has only one family, so a meaningful family-level 95% interval is **null**, reason `fewer_than_two_independent_source_families`, rather than a fabricated narrow interval. Independent human validation and calibration remain not evaluated under ADR-0010.

Exit: **revise and review; no production enablement**. Retain these failing fixtures as regressions. Complete the original independent-family pilot and missing measurements/adverse classes before claiming adapter quality acceptance. AA013 requires immutable reconciliation, persisted review/no-score guards and visible uncertainty; AA014 requires owner-authorized, concurrent-safe audited corrections; AA015 requires its locked benchmark. Their gates remain open. Changing the accepted phase dependencies or redefining completion as engineering-only requires a named owner decision; general continuation is not such a waiver.
