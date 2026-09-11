# Resumide privacy data map

Status: **DRAFT FOR USER-FACING POLICY APPROVAL**
Policy owner: workspace owner
Default active resume retention: 30 days

## Purpose and data inventory

| Data                                  | Purpose                                                    | Access                                            | Retention/deletion                                                                                              |
| ------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Account email and provider identity   | Password-free sign-in and account ownership                | Auth provider and owner-scoped server routes      | Provider account policy; deletion request removes application profile and may require provider account deletion |
| Uploaded PDF and extracted text       | Parse simulation and candidate feedback                    | Owner-scoped worker and private storage           | Active retention policy; deletion removes active records and queues objects                                     |
| Job title/description                 | Compare resume evidence to a target role                   | Owner-scoped worker and results                   | Deleted with the related analysis                                                                               |
| Deterministic result and writer draft | Show evidence, score, and candidate review suggestions     | Owner-scoped result routes                        | Deleted with the related analysis                                                                               |
| AI consent record                     | Prove purpose and policy version before transfer           | Owner and privacy worker                          | Retained as an audit/privacy record until account deletion policy permits removal                               |
| Audit events                          | Security, consent, request, and operational accountability | Owner for own events; service role for operations | Retention-bound, never raw resume content                                                                       |
| Operational metrics/logs              | Availability, latency, queue, cost, and incident response  | Operators                                         | Aggregated; no resume body or direct identifiers; provider retention policy applies                             |

## User controls

- AI processing is blocked until the user accepts the versioned candidate AI
  consent policy.
- Export requests create a durable, owner-scoped request and a versioned JSON
  manifest. The download response is `no-store` and is never a public object.
- Deletion requests are queued, audited, retryable, and visible. Database data
  is removed before object deletion is finalized; failed object deletion remains
  retryable.
- Retention sweeps remove active access first, then delete storage objects and
  dependent records after successful cleanup.
- Correction is supported by a new upload/version; the prior source can be
  deleted through the privacy workflow.

## Subprocessors and transfer boundary

- Supabase: managed PostgreSQL, Auth, and private Storage. Region and provider
  retention settings require production confirmation.
- OpenAI: qualitative feedback only after explicit consent. Input/output token
  bounds, schema validation, and cost signals are enforced in the worker.

The product does not enable advertising, employer integrations, automatic
ranking, or third-party analytics in this phase. Legal/privacy approval of this
draft and provider data-processing terms remain A4 gates.
