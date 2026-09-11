# Phase 7 incident and rollback runbooks

All actions are recorded against the incident ID. Do not paste resume text,
emails, cookies, tokens, or provider payloads into incident systems.

## Provider outage or throttling

1. Confirm `provider` errors, token/cost metrics, and queue age.
2. Disable qualitative AI through the approved configuration kill switch or
   set `AI_ENABLED=false`; deterministic analysis must continue to a partial
   result where possible.
3. Stop repeated retries if provider errors are persistent. Preserve the
   analysis ID and request ID only.
4. Verify one synthetic analysis reaches a terminal state, then re-enable under
   the approved rollout window.

## Worker backlog or stalled lease

1. Check readiness, worker process health, queue age, lease age, and dead letters.
2. Restart or scale the worker within the approved five-concurrent-analysis
   baseline. Do not increase concurrency during a cost incident.
3. Confirm expired leases are reclaimed once and no duplicate AI run is stored.
4. If the queue remains unhealthy, pause new analysis acceptance and communicate
   the degraded state.

## Corrupt or abusive upload

1. Use the request ID and analysis ID, not the uploaded filename, to locate the
   event.
2. Confirm signature, MIME, size, page, extraction, and timeout outcomes.
3. Keep the upload rejected/quarantined and remove any orphan object through the
   scoped cleanup path. Never broaden a delete path.
4. Add a synthetic regression fixture if the boundary allowed unsafe input.

## Compromised key

1. Disable the affected key in the provider immediately.
2. Rotate it in the secret manager, restart web and worker processes, and verify
   readiness with the new value.
3. Review audit events and provider usage for the exposure window.
4. Do not place the old or new key in logs, tickets, commits, or screenshots.

## Failed migration

1. Stop rollout and preserve the migration error plus release ID.
2. Check whether the migration is expand-only and whether the application can
   continue on the prior artifact.
3. Restore only in the isolated drill environment first. Never run destructive
   repair SQL manually against production without a reviewed forward migration.
4. Roll back the application artifact if safe, then ship a forward-compatible
   repair migration after review.

## Rollback rehearsal

The release owner records the current artifact, prior artifact, migration state,
start/end times, health/readiness results, and user-flow result. Rollback is
blocked if a migration has removed data or columns without a compatible contract.
The concrete deployment command is provider-owned; a staging rehearsal and
human release approval are required for A4.
