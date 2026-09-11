# ADR-0002: Use managed PostgreSQL, managed identity, and private object storage

## Status

Accepted for the candidate B2C product by the workspace owner on 2026-09-09.

## Date

2026-09-09

## Context

The current in-memory Zustand store loses every result on refresh and cannot enforce ownership, retention, audit, backup, billing, or tenant isolation. Resumes contain dense personal data and must not be placed in public storage. The project needs a small operational footprint while preserving an enterprise SSO path.

## Decision

- Use managed PostgreSQL as the source of truth for users, organizations, memberships, jobs, resumes, versions, analyses, attempts, results, consent, audit, entitlements, and usage.
- Use Supabase Auth with secure cookie sessions. Enterprise OIDC/SAML remains deferred with enterprise administration.
- Store PDFs in a private Supabase Storage bucket under server-generated keys. Use authenticated streaming or short-lived signed URLs.
- Enforce authorization in application services and, where supported, complementary row-level policies. Neither layer substitutes for the other.

Supabase is selected because it combines PostgreSQL, Auth, and Storage with a low operating burden.

Approved operating baseline:

- Use the Resumide Supabase project in `ap-south-1` (Mumbai) for PostgreSQL 17, Auth, and private Storage.
- Use Supabase Auth cookie sessions for the candidate product. Enterprise OIDC/SAML remains behind the enterprise gate and adapter boundary.
- Retain active resume data for 30 days by default. Deletion immediately removes active access; provider backup copies expire under the documented backup-retention window.
- The MVP targets a 24-hour RPO, a 4-hour RTO, and 99.5% monthly availability.
- Keep schema in portable SQL migrations, storage keys behind an adapter, and identity mapping behind an auth adapter so data and objects can be exported during vendor exit.
- The workspace owner is the cost, privacy-risk, operations, and recovery owner until responsibility is explicitly delegated.

## Alternatives considered

### Browser storage

Fast for a demo but cannot provide durable cross-device access, authorization, audit, retention, or recovery. Rejected.

### Document database

Analysis payloads are JSON-heavy, but ownership, membership, versions, entitlements, audit, and transactional jobs are relational. PostgreSQL JSONB covers flexible result payloads without losing relational integrity. Rejected as primary store.

### Custom identity and password storage

Adds high-risk security work with no product differentiation. Rejected.

## Consequences

- Schema and migration discipline become mandatory.
- Tenant isolation, backup/restore, export/deletion, and signed URL expiry require automated tests.
- Vendor-specific calls stay behind narrow adapters.
- Provider region and data-processing terms become release inputs.

## Approval criteria

- Provider/region, SSO path, retention, backup, RPO/RTO, cost, and exit plan are documented.
- Threat model and tenant ownership model are accepted.

These approval criteria were accepted with the operating baseline above. Restore drills and tenant-isolation tests remain implementation evidence required by later gates; this ADR does not claim they have passed.
