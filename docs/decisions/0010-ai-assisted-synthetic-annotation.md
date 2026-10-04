# ADR-0010: AI-assisted annotation for local synthetic AA1 tests

## Status

**Accepted by the workspace owner on 2026-10-04.** Narrow amendment to ADR-0009 AA003/AA004 annotation prerequisites. Independent-human validation remains unverified and required for representative release validity. No numeric threshold, production gate or real-data permission changes.

## Context

The owner has no human annotators available and assigned annotation work to the assistant. The assistant explained that its labels must be identified as AI-assisted, not independent human review, and proposed synthetic documents with known ground truth, AI annotations and deterministic checks for local AA1 testing. The owner approved that amendment with “Ok” and then “yes.” This records that specific approval; it does not treat the assistant or its subagents as human annotators.

The original [ADR-0009](0009-aa0-truth-contract-and-evaluation-design.md) approval remains valid except for the local synthetic annotation prerequisite amended here. [CONSTRAINTS.md](../../CONSTRAINTS.md), privacy controls, source provenance, immutable originals, fail-closed scoring and phase dependencies remain governing requirements.

## Decision

1. Local AA1 engineering tests may use synthetic English / India-focused software-engineering resumes with known generator ground truth and AI-assisted labels. Human annotation assignments are not a prerequisite for that synthetic test collection. No real resume/JD reuse, third-party disclosures, managed OCR or paid infrastructure is authorized.
2. The assistant may annotate exact source text, critical fields/spans, pages, reading order and ambiguity. Subagents may check labels, but multiple model passes are **not** independent humans and cannot establish human agreement.
3. Ground truth must come from the synthetic document's authored source/template before extraction. Never copy the extractor's output into expected labels or use a model's guess as a verified candidate fact. Preserve source hash, generator/template version, original labels, proposed changes and disagreement reasons. Uncertain labels stay unresolved and are excluded from authoritative calibration, with their exclusions counted.
4. Preserve development/calibration/locked-test separation by source family/template/near-duplicate group. AI-assisted regression partitions must be labelled engineering-only, not an independently annotated representative release corpus. Lock hashes before evaluating, record access/tuning, and invalidate a lock after leakage.
5. Annotation records must identify `annotatorType: ai`, producer/model identifier when known (explicit unknown otherwise), source document hash, label revision and source references. Record `humanValidation: not_evaluated`, `adjudication: ai_review_only`, and human-agreement statistic as null with reason `independent_human_labels_unavailable`. Do not invent model/version metadata or a kappa score.
6. Deterministic tests may measure transcription, fields, coverage, order, provenance and safe failure against known synthetic truth. Report dataset type, sample, segment, failures, abstentions, versions and cost/latency limitations. Statistical intervals on such fixtures do not imply representative external validity or human agreement. All existing metric thresholds remain unchanged.
7. Local test results may establish implementation/regression behavior only. AA013 production confidence calibration, AA015 representative validity, the full AA1 release gate and any domain/vendor/outcome claim remain unverified until their original evidence requirements pass. Completing an engineering slice cannot silently close those gates.
8. Existing local synthetic purpose, 30-day evaluation retention, access/deletion controls and transient scratch cleanup apply. OCR engine execution still requires host, isolation, resource/cost/deadline and dependency checks under ADR-0008/0009. This amendment does not repair Docker, install Tesseract, authorize runtime changes or assert measured engine support.

## Alternatives considered

- **Pretend AI passes are independent human annotation:** rejected; would falsify provenance and gate evidence.
- **Stop all implementation until humans are recruited:** unnecessary for controlled synthetic engineering checks, but appropriate for human-validity claims.
- **Replace every release gate with synthetic tests:** rejected; regression correctness cannot establish representative accuracy, calibration or product claims.

## Consequences

Local engineering work can continue without falsely recording human reviewers. The implementation and representative-validity milestones remain separate. Review and correction work may be prepared/tested, but confidence remains uncalibrated and unsafe evidence cannot receive an authoritative score. Independent-human review is deferred, not completed or waived for release.

## Approval and boundary record

- Approver: workspace owner, product/scoring/privacy/evaluation roles.
- Date: 2026-10-04.
- Authorization: “Ok” and “yes” in direct response to the proposed AA0 annotation-protocol amendment for local AA1 synthetic testing.
- Scoped exception: [E-002](../../CONSTRAINTS.md), local AI-assisted synthetic labels only; expires before representative release evaluation or any human-validated/domain-validity claim.
- Unchanged: AA0 contract/claim decisions, score semantics, numeric thresholds, real-data permissions, external-provider prohibition and production Gate A4.
- Actual annotation/corpus/OCR execution evidence: **not yet produced by this decision record**. Task completion requires subsequent implementation and verification evidence in [the todo](../../tasks/todo.md).
