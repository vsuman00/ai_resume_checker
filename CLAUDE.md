# Resumide agent guide

Resumide is a React Router SSR application that combines deterministic ATS compatibility checks with schema-validated qualitative feedback. The current product uses Supabase for authentication, private storage, and durable job state, plus leased workers for analysis and privacy operations.

## Read first

Before changing implementation, read these files in order:

1. [`CONSTRAINTS.md`](CONSTRAINTS.md) for the quality floor and proposed Accuracy-v2 gates. Do not weaken it to make a change pass.
2. [`ARCHITECTURE.md`](ARCHITECTURE.md) for system boundaries and invariants.
3. [`tasks/plan.md`](tasks/plan.md) for the gated implementation sequence.
4. [`tasks/todo.md`](tasks/todo.md) for executable task status and evidence.
5. [`docs/README.md`](docs/README.md) for the documentation map and verification sources.
6. The relevant ADR in [`docs/decisions/`](docs/decisions/).
7. Applicable design documents in [`docs/design/`](docs/design/), including the blueprint and feature contract for the surface being changed.

Standing workspace-owner instruction (2026-10-04): before building anything, follow the applicable plan, todo, architecture, constraints, design and decision documents. Identify the active task and verify its dependencies/approval gates before editing implementation. Resolve contradictions or missing decisions with the owner; do not silently substitute your own sequence, scope or architecture. A request to continue is not permission to skip a documented prerequisite. Update status with implementation, verification and approval evidence kept distinct.

Preserve the status vocabulary used by the project: `IMPLEMENTED`, `VERIFIED`, `PARTIAL`, `TARGET`, `DEFERRED`, and `BLOCKED`. Documentation is not evidence by itself. Do not mark a phase or gate complete without its named automated evidence and required human approval. Hosted deployment, restore, notification sink, rollback, policy, and deployment-owned security controls remain separate external gates where noted.

### Accuracy-v2 sequencing guard

Gate AA0 passed on 2026-10-04 through explicit workspace-owner approval of ADR-0009 candidate 1 at `e629a2882b3cc14a63771ae400f4f67a7e4f3f62`. AA000–AA005 logical design contracts are frozen. AA010/AA011 scoped native conformity is accepted; next is AA012 selective local OCR after its host/resource/isolation/cost prerequisites. ADR-0010 permits disclosed AI-assisted synthetic engineering labels, not independent human or representative validation. AA1, calibration and production Gate A4 remain open. Real-data access and external providers remain unauthorized. Read the sequencing correction and later acceptance in `tasks/todo.md`; never infer other gate sign-off from “continue” or green CI. Preserve existing implementation/migrations; do not reset history or roll back schema without a scoped recovery decision.

## Stack and layout

- Node.js 22, React 19, React Router 7 framework/SSR mode, TypeScript 5, Vite 6, and Tailwind CSS 4.
- Supabase PostgreSQL, Auth, and private Storage.
- OpenAI Structured Outputs with Zod for qualitative feedback.
- Application code lives in `app/`; server workers and scripts live in `scripts/`; SQL migrations live in `supabase/migrations/`.
- `~/*` resolves to `./app/*`. Generated route types must not be edited by hand.

## Common commands

```bash
npm ci
npm run dev
npm run verify:ci
npm run test:db
npm run test:e2e
npm run test:hosted:phase4
npm run test:hosted:rls
```

Use the focused command that matches the change, then run `npm run verify:ci` before handoff when the environment permits it. Keep `.env` and all secret values local; never commit credentials or place server secrets in browser code.

## Engineering rules

- Keep migrations forward-only and pair schema changes with recovery notes.
- Enforce tenant ownership, consent, private storage, same-origin checks, and bounded inputs at the server boundary.
- Keep resume text, prompts, tokens, and other PII out of logs, metrics, and client telemetry.
- Treat deterministic scoring and parse evidence as the source of truth; AI feedback is bounded and schema-validated.
- Preserve unrelated dirty work. Use `apply_patch` for focused edits and do not reset or clean user-owned files.
- Update the appropriate plan, task, ADR, or runbook when behavior or an operational decision changes.
- Review links and status claims whenever documentation moves.
