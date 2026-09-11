# ADR-0004: Start with PostgreSQL-backed leased analysis jobs

## Status

Partially accepted for the candidate B2C product on 2026-09-09. PostgreSQL-backed jobs and initial capacity are approved; maximum job duration, retry count, and dead-letter operating procedure remain unresolved.

## Date

2026-09-09

## Context

Analysis needs durable state, retries, worker recovery, idempotency, and progress. Introducing a separate queue service immediately would add operational and consistency costs. PostgreSQL is already required for durable product data.

## Decision

Use a PostgreSQL-backed job table and transactional claim/lease protocol for the initial product:

- Atomic eligible-job claim using row locking or an approved maintained queue library.
- Lease expiry, heartbeat, bounded attempts, exponential backoff with jitter, and dead-letter state.
- Compare-and-set analysis state transitions.
- Idempotency keys and immutable attempt/usage records.
- Graceful worker shutdown and abandoned-lease recovery.

Move to a managed queue only after measured queue depth, contention, throughput, scheduling, or isolation needs exceed the PostgreSQL design.

Approved operating baseline:

- Plan for 100 analysis arrivals per day and no more than five concurrent analyses.
- Run the worker as a separate Fly.io process group in Mumbai.
- The workspace owner owns queue capacity and dead-letter response until responsibility is delegated.

Implemented provisional defaults awaiting Gate A0 approval:

- A lease lasts 120 seconds and is heartbeated at half that interval.
- A job receives at most three attempts with 10-, 20-, and 40-second retry delays.
- A lease that expires after its final attempt is dead-lettered and transitions the analysis to `failed`; the workspace owner reviews the durable dead-letter record manually.
- Qualitative provider requests carry a stable idempotency key derived from the analysis and input hash, so a reclaimed attempt does not intentionally create a second provider charge.

These are implementation defaults, not evidence that the unresolved maximum-duration, retry, and dead-letter policy has been approved for release.

## Alternatives considered

### In-memory queue

Loses work on restart and cannot coordinate multiple workers. Rejected.

### Redis-backed queue

Mature libraries and good throughput, but adds another stateful dependency and consistency boundary. Deferred until volume justifies it.

### Managed cloud queue

Strong durability and isolation but introduces provider-specific semantics and local-development complexity. Deferred pending deployment selection and load targets.

## Consequences

- Database capacity planning must include job polling and leases.
- Jobs and product records can transition transactionally.
- Long-running work still requires careful lease sizing and heartbeats.
- Queue migration criteria must be observable rather than subjective.

## Approval criteria

- Expected arrival rate, concurrency, maximum job duration, retry policy, and dead-letter ownership are stated.
- Recovery and two-worker claim tests are mandatory before Gate A2/A4.
