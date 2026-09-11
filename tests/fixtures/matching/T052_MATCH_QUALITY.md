# T052 JD phrase and skill match-quality snapshot

Date: 2026-09-10
Taxonomy: `skills-taxonomy-v1`
Corpus: `t052-labeled.json` (10 fully synthetic fixtures; no real-person PII)
Command: `npx vitest run tests/unit/jd-matching.test.ts tests/unit/scoring-stage.test.ts`

## Method

Labels are evaluated per canonical JD term. A predicted match for an expected match is a true positive; a predicted miss for an expected match is a false negative; a predicted match for an expected miss is a false positive. Repeated occurrences and multiple aliases of one canonical term receive one coverage credit. Evidence offsets are checked against the exact source substring.

- Precision = `TP / (TP + FP)`
- Recall = `TP / (TP + FN)`
- Negative false-positive rate = `FP / expected negative terms`

## Results

| Metric                       | Count / result |
| ---------------------------- | -------------: |
| Canonical term labels        |             22 |
| Expected positive terms      |             13 |
| Expected negative terms      |              9 |
| True positives               |             13 |
| False positives              |              0 |
| False negatives              |              0 |
| Precision                    |         100.0% |
| Recall                       |         100.0% |
| Negative false-positive rate |           0.0% |

## Covered behavior

- Multi-word canonical phrases and punctuation-bearing skills.
- Cross-alias JD/resume matches and canonical alias deduplication.
- Unicode-aware whole-term boundaries that reject larger-word and concatenated stuffing matches.
- Exact, zero-based, end-exclusive evidence spans for JD and resume text.
- One coverage credit per canonical term; repeated text only affects occurrence metadata.
- URL-only and email-only adversarial mentions excluded as skill evidence.
- Deterministic generic fallback for non-taxonomy terms.

## Limits

This is a small synthetic regression corpus, not a representative production benchmark or proof of employer ATS behavior. It does not infer proficiency, recency, duration, negation, visual hiding, or whether a Skills-section list is truthful. Phase 5 has approved regression thresholds for this corpus, while a larger anonymized corpus remains necessary for broader matching claims.
