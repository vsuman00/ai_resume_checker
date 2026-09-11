# Documentation map

This directory contains the maintained design, decision, security, and operations documentation for Resumide. The root [`README.md`](../README.md) remains the product and developer entry point.

## Start here

- [`../README.md`](../README.md): product overview, local setup, commands, and current capability boundary.
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md): canonical architecture, invariants, and gate definitions.
- [`../tasks/plan.md`](../tasks/plan.md): gated implementation sequence.
- [`../tasks/todo.md`](../tasks/todo.md): executable task list and verification evidence.
- [`../CLAUDE.md`](../CLAUDE.md): concise instructions for implementation agents.

## Maintained documentation

### Decisions

The [`decisions/`](decisions/) directory contains the ADRs that record durable architectural choices and their trade-offs.

### Design

- [`design/README.md`](design/README.md): current design system and experience principles.
- [`design/COMPETITIVE_UX_RESEARCH.md`](design/COMPETITIVE_UX_RESEARCH.md): category research and design implications.
- [`design/PRODUCT_DESIGN_BLUEPRINT.md`](design/PRODUCT_DESIGN_BLUEPRINT.md): page structure, interaction rules, and design verification boundary.

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
