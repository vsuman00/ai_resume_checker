# Migration Discipline

SQL files in this directory are the source of truth for database changes.
Supabase migration history determines execution order; Studio and ad hoc SQL
must not be the only record of a production schema change.

## Compatibility

- Prefer expand-and-contract changes so current and next application builds can
  run during deployment.
- Add nullable columns or defaults before application code depends on them.
  Enforce stricter constraints only after existing rows are backfilled.
- Do not rename or drop a table, column, function, policy, or enum value in the
  same release that stops using it.
- Keep transaction RPCs backward compatible until every calling build is gone.

## Recovery

Applied migrations are forward-only. Repair a faulty non-destructive migration
with a new migration. For destructive or data-corrupting failures, stop writes,
restore the latest verified provider snapshot to an isolated project, validate
row counts and ownership constraints, then promote the recovered database under
the operations runbook. Never rewrite an already-applied migration.

## Verification

Run `npx supabase db reset` against an empty local database, load the tracked
fixture data, restart the stack, and run integration tests. Before a destructive
production migration, restore a recent snapshot to an isolated project and
apply the migration there first. Attach command output and row-count checks to
the change review.

The Phase 7 migration (`20260911110000_phase7_security_privacy_operations.sql`)
adds leased privacy requests, step state, export/deletion execution, and
retryable retention cleanup. Validate it with `npx supabase db lint --local`
and a local reset when Docker/Supabase is available. A successful TypeScript
or synthetic restore test does not substitute for applying this SQL to an
isolated hosted project and attaching measured restore evidence to Gate A4.
