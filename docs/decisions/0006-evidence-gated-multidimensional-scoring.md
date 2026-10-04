# ADR-0006: Use evidence-gated multidimensional scoring

## Status

Accepted for AA0 design by the workspace owner on 2026-10-04 through [ADR-0009](0009-aa0-truth-contract-and-evaluation-design.md), following architectural-direction approval on 2026-10-03. Separate scores/no aggregate, unknown-state gates, weights-as-hypotheses, claim boundaries and legacy treatment are approved. Corpus calibration, implementation/migration verification and release claims remain later gates. ADR-0003 remains the deployed score contract until the scored migration is implemented and verified.

## Date

2026-09-11

## Context

Resumide currently has a reproducible deterministic rule score, but the rules are small and hand-weighted, the benchmark corpus is fully synthetic, and the prominent overall score mixes deterministic ATS rules with LLM category ratings. The product goal now includes cross-industry job alignment, genuine evidence, same-page authoring, and later recruiter calibration.

Official ATS-vendor documentation demonstrates different scoring and calibration behavior. Greenhouse uses employer calibration and categorical match strength with manual review/override. Oracle exposes separate education, experience, skills, and profile ratings with administrator-controlled relative importance. A universal employer ATS score is therefore not an observable standard Resumide can truthfully reproduce.

The product still needs a simple and useful progress signal for candidates. That signal must not hide extraction uncertainty, unsupported requirements, or model opinion.

## Decision

1. Replace the single ATS-score concept with three contracts:
   - `Evidence Confidence`: a non-merit gate determining whether scoring is safe.
   - `ATS Compatibility`: a deterministic document/parse compatibility index.
   - `Job Alignment`: a deterministic index of verified evidence against the supplied job description and approved occupation/domain profile.
2. Remove LLM-generated category scores from authoritative numeric ATS or job-alignment results.
3. Permit an optional deterministic `Application Readiness` summary only after comprehension research and scoring-owner approval. It is not an employer score or interview probability.
4. Store an evidence path, ruleset/taxonomy/parser versions, and evaluation state for every scored item.
5. Withhold scores when critical evidence is incomplete, unsupported, or below the calibrated confidence policy.
6. Treat required, preferred, unknown, and not-applicable job requirements separately. Do not reduce job alignment to keyword frequency.
7. Use O*NET/ESCO as versioned normalization sources and the exact job description as the primary job-specific source. Market-frequency claims require a dated, permissioned corpus and reproducible query.
8. Calibrate dimensions/weights from representative labeled corpora and domain-expert review. Synthetic fixtures remain regression evidence only.
9. Require named vendor/version testing before any vendor-specific compatibility claim.
10. Keep recruiter calibration behind the enterprise/legal/fairness gate and require human oversight and override.

## Alternatives considered

### Keep one blended 0–100 score

Simple to display, but it conflates document parseability, qualification alignment, and model writing opinion. A candidate cannot tell whether a low number means the PDF failed, a mandatory qualification is absent, or the model disliked the prose. Rejected.

### Let an LLM simulate a senior recruiter and assign the score

Fast to prototype, but non-reproducible, weakly calibrated, vulnerable to prompt/context changes, and unable to observe hidden employer configuration. Rejected for authoritative scoring.

### Provide findings without any numeric score

Most defensible, but removes an understandable progress indicator candidates use while iterating. Retained as the fallback when evidence is insufficient; rejected as the only product mode.

### Reverse-engineer one universal ATS formula

No public cross-vendor standard or stable hidden configuration is available. Vendor behavior and employer calibration differ. Rejected.

## Consequences

- Existing score history needs explicit legacy semantics and cannot be silently compared with scoring v2.
- The home/result UI and exported reports must stop labelling the LLM-heavy overall score as the ATS score.
- New schemas are required for evidence, dimensions, requirements, confidence, and score policies.
- A larger evaluation program and domain-expert annotation are prerequisites for broader claims.
- The UI becomes slightly more complex but materially more explainable.
- The low-cost model can be changed without changing deterministic numeric results, provided its structured extraction/drafting performance passes evaluation.
- Product copy must follow the claim ladder in the scoring/authoring spec.

## Approval criteria

- Product owner approves the three score contracts and user-facing names.
- Scoring owner approves dimensions, skipped/unknown semantics, confidence gating, and legacy-score treatment.
- Evaluation owner approves corpus design, segment gates, statistical reporting, and claim ladder.
- Legal/privacy owner approves candidate-mode claims and the separate employer-mode boundary.
- UX research confirms candidates understand that Job Alignment is not an employer decision probability.

## References

- [Evidence-grounded scoring and authoring spec](../ATS_SCORING_AND_AUTHORING_SPEC.md)
- [Research report](../ATS_SCORING_AND_AUTHORING_RESEARCH.md)
- [Greenhouse Talent Matching](https://support.greenhouse.io/hc/en-us/articles/41396009937307-Talent-Matching)
- [Oracle AI matching ratings](https://docs.oracle.com/en/cloud/saas/talent-management/farqa/evaluate-candidate-applications-using-ai-matching-ratings.html)
- [NIST AI RMF Measure](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
