# ADR-0001: Use a modular monolith with a separate analysis worker

## Status

Accepted for the candidate B2C product by the workspace owner on 2026-09-09.

## Date

2026-09-09

## Context

The current React Router action performs PDF extraction and an LLM call inside one HTTP request. It took about nine seconds for a tiny synthetic fixture and has no durable job, cancellation, recovery, or partial-result behavior. The product needs clear domain boundaries and background work, but current scale and team ownership do not justify microservices.

## Decision

Keep one TypeScript codebase and one modular domain model. Produce two processes from the same tested artifact:

1. A React Router web service for SSR, authentication, validation, authorization, durable commands, and reads.
2. An analysis worker for quarantine, extraction, scoring, LLM calls, and retryable jobs.

Modules communicate through typed application interfaces and PostgreSQL-backed durable records. They do not call each other over HTTP inside the same product.

Approved operating baseline:

- Node.js 22 LTS is the supported runtime.
- Fly.io is the initial deployment target, using separate web and worker process groups from the same container artifact.
- Deploy in Fly.io's Mumbai region to align with the data region.
- Initial planning capacity is 100 analyses per day with at most five concurrent analyses.
- The workspace owner owns product, cost, operations, and release decisions until named roles are delegated.

## Alternatives considered

### Keep analysis synchronous

Simplest code, but HTTP timeouts, duplicate submissions, provider outages, worker recovery, progress, and cost accounting remain unreliable. Rejected for production.

### Split into microservices

Provides independent deployment but adds network contracts, service discovery, tracing, more secrets, and distributed failure modes before scale requires them. Deferred until measured constraints justify it.

### Serverless function per stage

Can scale independently but execution limits, cold starts, large PDF handling, job coordination, and provider portability add complexity. Deferred pending deployment-provider evidence.

## Consequences

- Web requests return quickly with durable analysis IDs.
- A worker outage does not make the web application unavailable.
- Shared packages require strict module boundaries to avoid a monolith becoming tangled.
- Web and worker need independent health, scaling, shutdown, and observability controls.

## Approval criteria

- Expected traffic/file-size assumptions are recorded.
- Deployment platform supports separate web and worker processes.
- Job recovery and operational ownership are accepted.
