# Research: Evidence-grounded ATS scoring and resume authoring

Status: **RESEARCH COMPLETE FOR ARCHITECTURE DRAFT; EXTERNAL VALIDATION NOT YET RUN**
Research date: 2026-09-11
Product scope: candidate/student resume analysis, job-specific authoring, verified export, and later recruiter calibration

## 1. Research question

How can Resumide help a candidate create and improve a job-specific resume, report a useful market-level score, and remain honest about what an employer ATS or recruiter may do?

The answer has four parts:

1. Treat document extraction as a measured evidence pipeline, not a hidden preprocessing step.
2. Separate cross-ATS parse compatibility from job-specific alignment and qualitative writing advice.
3. Use the LLM to structure, explain, and draft from verified facts; do not let it own the numeric score or invent candidate evidence.
4. Prove generated PDF/DOCX/LaTeX exports by parsing them again and comparing them with the approved structured resume.

## 2. Method and evidence tiers

This review used:

- Current repository code, architecture, ADRs, synthetic benchmark reports, and task state.
- Official ATS-vendor documentation for observable matching behavior.
- Official occupation/skill taxonomies for cross-industry vocabulary.
- Official document-extraction interfaces for geometry and confidence capabilities.
- NIST and EEOC material for validity, uncertainty, human oversight, and employment-risk boundaries.
- First-party competitor pages only to identify advertised category features. Competitor claims are not treated as independent proof of effectiveness.

Evidence is classified as:

- `IMPLEMENTED`: present in this checkout.
- `SYNTHETICALLY VERIFIED`: exercised only against synthetic fixtures.
- `EXTERNALLY VERIFIED`: tested against a real provider, representative corpus, or controlled ATS environment.
- `TARGET`: architecture or planned behavior with no implementation proof.

## 3. Current Resumide baseline

### What is useful today

- Numeric rule results are deterministic and preserve a rule trace.
- Provider output is schema-validated and can fail without destroying deterministic results.
- Resume-writing suggestions pass a conservative lexical grounding filter.
- Analysis state, versions, ownership, privacy operations, and worker leases have explicit boundaries.
- The product already says it is a parse simulation rather than an exact proprietary ATS emulator.

### What prevents an industry-level accuracy claim

| Finding                                                                                        | Repository evidence                                                                                | Consequence                                                                      |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| The deterministic score uses nine fixed rules and hand-authored weights.                       | `app/lib/server/atsRules.ts`                                                                       | Repeatable does not mean calibrated to recruiter or ATS behavior.                |
| Keyword coverage becomes a full pass at 50% coverage.                                          | `app/lib/server/atsRules.ts`                                                                       | A resume matching half and all extracted terms can receive the same rule credit. |
| The prominent overall score is 30% ATS rules and 70% LLM category scores.                      | `app/lib/server/qualitative-stage.ts`                                                              | Model opinion is conflated with ATS compatibility.                               |
| OCR is disabled and the default adapter is unsupported.                                        | `app/lib/server/ocr/adapter.ts`                                                                    | Scanned and mixed PDFs cannot be scored comprehensively.                         |
| Matching is capped at 20 terms and the v1 taxonomy is mostly technology terms.                 | `app/lib/server/matching/`                                                                         | Cross-industry coverage is not present.                                          |
| The parser is a transparent heuristic simulation without page geometry reconstruction.         | `app/lib/server/parseSim.ts`                                                                       | Complex columns, tables, and visual reading order remain uncertain.              |
| Parser and matcher reports use 7 and 10 fully synthetic fixtures respectively.                 | `tests/fixtures/parsing/T051_PRECISION_RECALL.md`, `tests/fixtures/matching/T052_MATCH_QUALITY.md` | These are regression tests, not representative validity evidence.                |
| The writer displays up to four copyable suggestions rather than editing the structured resume. | `app/components/ResumeWriter.tsx`, `app/lib/server/schema.ts`                                      | The diagnose-to-edit-to-export loop is incomplete.                               |

The existing A3 pass is therefore a **synthetic regression gate**. It must not be interpreted as real-world scoring validity or employer-ATS equivalence.

## 4. What actual ATS-vendor behavior implies

There is no published universal numeric score shared by major ATS products. This is an inference from vendor-specific official documentation, not a claim that no ATS ever computes internal rankings.

- Greenhouse Talent Matching uses employer calibration, match categories (`Strong`, `Good`, `Partial`, `Limited`, and `Needs manual review`), matched skills/experience/industry explanations, and human overrides. Resume parsing and calibration must be enabled. Sources: [Greenhouse Talent Matching](https://support.greenhouse.io/hc/en-us/articles/41396009937307-Talent-Matching), [Greenhouse data-processing FAQ](https://support.greenhouse.io/hc/en-us/articles/41131616864283-Talent-Matching-Data-Processing-FAQ), and [Greenhouse operational-readiness guide](https://support.greenhouse.io/hc/en-us/articles/44682413339675-Operational-readiness-guide-Talent-Matching-policy).
- Oracle Recruiting exposes separate 0-to-5 ratings for education, experience, skills, and profile, and lets administrators define relative importance. Source: [Oracle AI matching ratings](https://docs.oracle.com/en/cloud/saas/talent-management/farqa/evaluate-candidate-applications-using-ai-matching-ratings.html).

Implications for Resumide:

1. A candidate-facing score can measure compatibility and public-JD alignment, but it cannot claim to reproduce an unknown employer configuration.
2. Vendor-specific claims require controlled evidence for that vendor and version.
3. Recruiter-aligned scoring requires an explicit calibration authored by the recruiter, not an LLM guess about hidden preferences.
4. Low-confidence or unprocessable documents require a manual-verification state rather than a forced score.

## 5. Cross-industry knowledge sources

- [O*NET 31.0](https://www.onetcenter.org/database.html) provides occupation titles, tasks, skills, knowledge, abilities, education, experience, work activities, and numeric ratings across the US economy. It is a baseline occupation taxonomy, not an ATS scoring standard.
- [ESCO](https://esco.ec.europa.eu/en/use-esco) provides versioned occupation and skill concepts, occupation-to-skill relationships, stable identifiers, APIs, downloads, and 28 language packs. It is useful for multilingual normalization, not a substitute for the exact job description.

Recommended hierarchy:

1. The exact supplied job description is the primary source for job-specific requirements.
2. Recruiter calibration, when present, overrides inferred importance.
3. O*NET/ESCO and approved regional/domain packs normalize terminology and expose related concepts.
4. A dated, licensed or permissioned job-posting corpus may provide trend/frequency evidence.
5. The LLM may propose mappings, but deterministic evidence and candidate confirmation decide whether a resume satisfies them.

No frequency statement such as “80% of current postings require X” may be shown without corpus size, date range, region, seniority, source, and reproducible query.

## 6. Document extraction research

Modern document services expose word/line coordinates and confidence, which are required for a defensible parse view:

- [Google Document AI](https://docs.cloud.google.com/document-ai/docs/reference/rest/v1/Document) exposes text anchors, confidence, bounding polygons, page anchors, orientation, and document quality signals. It also supports native-PDF parsing options.
- [Azure Document Intelligence Read](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/read?view=doc-intel-4.0.0) exposes words, lines, spans, polygons, and word confidence and recommends human review when confidence is insufficient.
- [Amazon Textract](https://docs.aws.amazon.com/textract/latest/APIReference/API_Geometry.html) exposes bounding boxes, polygons, and rotation for detected document elements.

No provider is selected by this research. The architecture requires an adapter and a benchmark bake-off using the same consented/anonymized corpus. Selection must consider field accuracy, character/word error, reading order, supported languages, region, retention, cost, latency, failure behavior, and deletion guarantees.

## 7. Resume-authoring market baseline

First-party product pages show that the market already advertises:

- Match rates, keyword gaps, formatting checks, and optimization ([Jobscan](https://www.jobscan.co/resume-matcher)). Jobscan also states that its match rate is a visualization and not a score directly assigned by the employer ATS.
- A resume builder, job matching, content selection, bullet generation, and PDF/DOCX export ([Teal Job Matcher](https://help.tealhq.com/en/articles/9923251-using-job-matching-resume-curation)).
- Line-by-line suggestions, accept/reject, reversible edits, and questions for unverifiable facts ([Resume Worded AI Resume Editor](https://www.resumeworded.com/ai-resume-editor)).

These establish category parity, not independent proof of accuracy. Resumide must differentiate through evidence provenance, measured uncertainty, fact verification, projected rule deltas, and export round-trip proof.

## 8. Evaluation science and governance

[NIST AI RMF Measure](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) calls for documented test sets and methods, representative evaluation, uncertainty, deployment-context testing, independent/domain-expert input, regular monitoring, validity, reliability, and documented generalization limits. [NIST validity guidance](https://airc.nist.gov/airmf-resources/airmf/3-sec-characteristics/) also emphasizes false positives/negatives, realistic test sets, external validity, and human intervention when errors cannot be detected or corrected.

If Resumide later becomes an employer selection tool, employment-risk governance becomes mandatory. The [EEOC](https://www.eeoc.gov/2023-annual-performance-report) states that Title VII applies when automated systems make or inform employment selection decisions and that the four-fifths rule alone does not guarantee absence of disparate impact.

Consequences:

- Interview callbacks are not a clean ground truth because they are affected by candidate history, employer, labor market, referrals, timing, and discrimination.
- Scoring construct validity must be tested against defined concepts: parseability, public-JD coverage, evidence strength, and reviewer assessment. “Hireability” must not be smuggled in as an unvalidated proxy.
- Candidate mode and employer mode require separate claims, evaluation, notices, oversight, and legal gates.

## 9. Recommended product position

Resumide should promise:

> We verify what your document contains, what our extraction pipeline could read, which public job requirements your verified experience supports, what remains uncertain, and how each truthful edit changes the result.

It must not promise:

- A guaranteed interview or screening outcome.
- The exact hidden score used by an unknown employer.
- Universal accuracy across industries not present in the released evaluation corpus.
- Current-market frequency without current, cited market data.
- That an LLM-generated claim is true merely because it is fluent or schema-valid.

## 10. Research conclusions

1. Keep a useful candidate-facing score, but split it into `ATS Compatibility` and `Job Alignment`; expose `Evidence Confidence` as a gate.
2. Remove LLM category scores from the numeric ATS score.
3. Store a canonical structured resume whose facts are candidate-confirmed and source-linked.
4. Implement line-level editing on the result page with accept/reject/undo and deterministic rescoring.
5. Treat XYZ as one writing pattern, not a universal ATS rule; never require fabricated metrics.
6. Generate documents from the canonical resume and parse every export again before calling it verified.
7. Release occupation/domain packs only after per-segment evaluation passes.
8. Treat the existing synthetic benchmark as a regression gate and add a separate real-world validity gate.
9. Add recruiter calibration only after the candidate system passes privacy, fairness, and accuracy review.
