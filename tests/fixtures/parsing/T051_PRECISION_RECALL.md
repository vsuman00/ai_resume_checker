# T051 parser precision/recall snapshot

Date: 2026-09-10
Corpus: `t051-labeled.json` (7 fully synthetic fixtures; no real-person PII)
Command: `npx vitest run tests/unit/parsing`

## Method

Contact fields use exact raw-text equality. Links, section types, and layout-warning categories are compared as label sets. A wrong non-null contact value counts as both a false positive and a false negative. True negatives are not included in precision or recall.

- Precision = `TP / (TP + FP)`
- Recall = `TP / (TP + FN)`

## Results

| Field / label         |  TP |  FP |  FN | Precision | Recall |
| --------------------- | --: | --: | --: | --------: | -----: |
| Name                  |   6 |   0 |   0 |    100.0% | 100.0% |
| Email                 |   6 |   0 |   0 |    100.0% | 100.0% |
| Phone                 |   5 |   0 |   0 |    100.0% | 100.0% |
| Location              |   6 |   0 |   0 |    100.0% | 100.0% |
| Links                 |   1 |   0 |   0 |    100.0% | 100.0% |
| Section type          |  20 |   0 |   2 |    100.0% |  90.9% |
| Multi-column warning  |   1 |   0 |   0 |    100.0% | 100.0% |
| Reading-order warning |   2 |   0 |   0 |    100.0% | 100.0% |

Section F1 on this corpus is 95.2%. The two section false negatives are intentional and documented: when PDF extraction places `EXPERIENCE` and `SKILLS` on the same tab-separated line, the parser warns about columns/order but does not claim it can reconstruct the two independent column flows.

## Targeted parser checks

The same focused run separately checks:

- English, French, German, numeric month/year, and Unicode-dash date ranges.
- Unicode, numbered, and dash bullet markers, plus non-bullet negatives.
- Accented names, international dialing prefixes (`+91`, `+33`, `0049`, `+44`), and international city/region/country forms.
- Localized and common section aliases after Unicode normalization.
- Clean single-column negatives for layout warnings.

## Limits

This is a small synthetic regression corpus, not a representative production benchmark. It does not establish demographic or locale-wide accuracy, PDF geometric column reconstruction, OCR performance, or a launch threshold. The Phase 5 gate has approved regression thresholds for this corpus; larger anonymized corpora are still required before making broader accuracy or launch claims.
