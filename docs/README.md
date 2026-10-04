# Documentation map

This directory contains the maintained design, decision, security, and operations documentation for Resumide. The root [`README.md`](../README.md) remains the product and developer entry point.

## Start here

- [`../README.md`](../README.md): product overview, local setup, commands, and current capability boundary.
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md): canonical architecture, invariants, and gate definitions.
- [`../CONSTRAINTS.md`](../CONSTRAINTS.md): non-negotiable quality floors and Accuracy-v2 evidence gates.
- [`../tasks/plan.md`](../tasks/plan.md): gated implementation sequence.
- [`../tasks/todo.md`](../tasks/todo.md): executable task list and verification evidence.
- [`../tasks/accuracy-authoring-plan.md`](../tasks/accuracy-authoring-plan.md): research-to-pilot subplan for evidence-based scoring, editing, and verified artifacts.
- [`../CLAUDE.md`](../CLAUDE.md): concise instructions for implementation agents.

## Maintained documentation

### Decisions

The [`decisions/`](decisions/) directory contains the ADRs that record durable architectural choices and their trade-offs.

- [`decisions/0006-evidence-gated-multidimensional-scoring.md`](decisions/0006-evidence-gated-multidimensional-scoring.md): approved architectural direction for separate evidence confidence, ATS compatibility, and job alignment; calibration and release semantics remain open.
- [`decisions/0007-canonical-resume-and-verified-rendering.md`](decisions/0007-canonical-resume-and-verified-rendering.md): approved direction for canonical content, immutable versions, renderer adapters, and parse-back verification; detailed contracts and artifact gates remain open.
- [`decisions/0008-selective-ocr-evaluation.md`](decisions/0008-selective-ocr-evaluation.md): proposed OCR provider comparison, selective-processing contract, privacy/cost limits and approval-gated bake-off; no provider is accepted yet.
- [`decisions/0009-aa0-truth-contract-and-evaluation-design.md`](decisions/0009-aa0-truth-contract-and-evaluation-design.md): accepted AA000–AA005/Gate AA0 decision, frozen logical contracts, worked scoring cases, corpus handbook, local OCR protocol and dated owner approval; execution/calibration/release gates remain separate.
- [`decisions/0010-ai-assisted-synthetic-annotation.md`](decisions/0010-ai-assisted-synthetic-annotation.md): accepted local synthetic annotation amendment; AI labels are not human validation, and representative release gates remain open.

### Scoring and authoring research

- [`ATS_SCORING_AND_AUTHORING_RESEARCH.md`](ATS_SCORING_AND_AUTHORING_RESEARCH.md): first-party vendor evidence, occupational-taxonomy research, OCR/layout evidence, market comparison, and governance findings.
- [`ATS_SCORING_AND_AUTHORING_SPEC.md`](ATS_SCORING_AND_AUTHORING_SPEC.md): architectural direction and detailed product, evidence, scoring, authoring, rendering, and evaluation contracts with explicit open decisions.

### Design

- [`design/README.md`](design/README.md): current design system and experience principles.
- [`design/COMPETITIVE_UX_RESEARCH.md`](design/COMPETITIVE_UX_RESEARCH.md): category research and design implications.
- [`design/PRODUCT_DESIGN_BLUEPRINT.md`](design/PRODUCT_DESIGN_BLUEPRINT.md): page structure, interaction rules, and design verification boundary.
- [`design/NATIVE_LAYOUT_EVIDENCE.md`](design/NATIVE_LAYOUT_EVIDENCE.md): AA011 native geometry, supported reading-order hypotheses, table review, and pinned fixture gate.

### Operations and security

- [`operations/BACKUP_RESTORE.md`](operations/BACKUP_RESTORE.md)
- [`operations/LOAD_RECOVERY.md`](operations/LOAD_RECOVERY.md)
- [`operations/OBSERVABILITY.md`](operations/OBSERVABILITY.md)
- [`operations/RUNBOOKS.md`](operations/RUNBOOKS.md)
- [`security/EGRESS.md`](security/EGRESS.md)
- [`security/PRIVACY_DATA_MAP.md`](security/PRIVACY_DATA_MAP.md)
- [`security/THREAT_MODEL.md`](security/THREAT_MODEL.md)

### Database and test evidence

- [`../supabase/migrations/README.md`](../supabase/migrations/README.md): migration ownership and deployment notes.
- [`../tests/fixtures/CATALOG.md`](../tests/fixtures/CATALOG.md): deterministic fixture catalog.
- [`../tests/fixtures/parsing/T051_PRECISION_RECALL.md`](../tests/fixtures/parsing/T051_PRECISION_RECALL.md): parsing evaluation snapshot.
- [`../tests/fixtures/matching/T052_MATCH_QUALITY.md`](../tests/fixtures/matching/T052_MATCH_QUALITY.md): matching evaluation snapshot.

## Historical material

Superseded strategy, gap, and design documents are retained in [`archive/`](archive/) for traceability. They are not current implementation or readiness evidence. Use the canonical files above when making decisions.

## Status and evidence

Use the project status vocabulary exactly: `IMPLEMENTED`, `VERIFIED`, `PARTIAL`, `TARGET`, `DEFERRED`, and `BLOCKED`. A documented target is not proof of implementation. Hosted deployment, restore, notification sink, rollback, policy, and deployment-owned security controls remain separate external gates where the architecture and task files say so.
