# ADR-0005: Durable privacy work and low-cardinality operations telemetry

## Status

Proposed for A4 review

## Date

2026-09-11

## Context

Phase 7 needs privacy requests and retention cleanup to survive process restarts,
while operators need request/job/provider signals without collecting resume PII.
The product is still a small modular monolith with a PostgreSQL-backed worker;
adding a separate queue or analytics platform would increase operational scope
before measured need exists.

## Decision

Use PostgreSQL rows and leases for export/deletion requests and retention items.
Workers claim work with bounded attempts, process storage cleanup separately,
and complete only after all scoped steps succeed. Use an in-process registry for
low-cardinality counters/histograms and expose it only through a token-protected
metrics route. Send browser telemetry as an allowlisted, content-free event
contract.

## Alternatives considered

- **Managed queue:** deferred until queue volume or multi-region operation
  justifies another durable system; PostgreSQL already owns analysis leases.
- **Third-party analytics:** rejected for this phase because it adds a PII
  sharing boundary and is not required for core SLOs.
- **Raw structured logs:** rejected because request bodies and provider payloads
  could leak resume content; only bounded IDs, statuses, and timings are logged.

## Consequences

- Privacy operations are inspectable, retryable, and idempotent with the current
  database boundary.
- In-process metrics reset on restart and must be scraped frequently or replaced
  by a durable/managed backend when scale requires it.
- Real restore, hosted alert delivery, staging load, and security-owner review
  remain explicit A4 evidence rather than being implied by local tests.
