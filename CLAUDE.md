# Resumide agent guide

Resumide is a React Router SSR application that combines deterministic ATS compatibility checks with schema-validated qualitative feedback. The current product uses Supabase for authentication, private storage, and durable job state, plus leased workers for analysis and privacy operations.

## Read first

Before changing implementation, read these files in order:

1. [`ARCHITECTURE.md`](ARCHITECTURE.md) for system boundaries and invariants.
2. [`tasks/plan.md`](tasks/plan.md) for the gated implementation sequence.
3. [`tasks/todo.md`](tasks/todo.md) for executable task status and evidence.
4. [`docs/README.md`](docs/README.md) for the documentation map and verification sources.
5. The relevant ADR in [`docs/decisions/`](docs/decisions/).

Preserve the status vocabulary used by the project: `IMPLEMENTED`, `VERIFIED`, `PARTIAL`, `TARGET`, `DEFERRED`, and `BLOCKED`. Documentation is not evidence by itself. Do not mark a phase or gate complete without its named automated evidence and required human approval. Hosted deployment, restore, notification sink, rollback, policy, and deployment-owned security controls remain separate external gates where noted.

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
