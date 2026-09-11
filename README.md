# Resumide

Resumide is a candidate-focused resume analyzer that combines deterministic ATS compatibility checks with schema-validated qualitative AI feedback.

> **Current status:** Phase 7 implementation and local acceptance evidence are complete through the security, privacy, observability, recovery, and synthetic capacity slices. Hosted schema migration, tenant/RLS, private-storage, and Phase 4 persistence smoke checks also pass. Gate A4 remains open for hosted restore/staging evidence, notification-sink tests, rollback rehearsal, policy approval, human security/operations sign-off, and deployment-owned controls. Use [`ARCHITECTURE.md`](ARCHITECTURE.md), [`tasks/plan.md`](tasks/plan.md), and [`tasks/todo.md`](tasks/todo.md) as the canonical architecture, implementation sequence, and verification status.

## Current capabilities

- React Router SSR application with a server-side `/api/analyze` resource action.
- PDF signature, MIME, and size validation before analysis.
- Multi-page PDF text extraction with `unpdf`.
- Deterministic parse simulation, ATS rules, keyword evidence, and score trace.
- OpenAI Structured Outputs for qualitative feedback and grounded writing suggestions.
- Existing summary, ATS, detail, parse-view, keyword, and resume-writer UI surfaces.
- Supabase-backed authentication, private resume storage, durable analysis/job state, ownership checks, consent, audit events, and idempotent queued analysis creation.
- Leased analysis and privacy workers with retry/failure states, retention cleanup, export manifests, and deletion execution.
- Security headers, same-origin enforcement, bounded session cookies, PII-safe structured telemetry, RED/job/provider metrics, and a protected metrics endpoint.
- Threat-model, privacy data-map, SLO/runbook, backup/restore, load/recovery, and Phase 7 decision documentation.

Resumide provides **ATS compatibility guidance and parse simulation**. It does not emulate or guarantee acceptance by a proprietary ATS, and it must not be used for automatic hiring decisions.

## Stack

- Node.js 22 LTS
- React 19
- React Router 7.18.3 in framework/SSR mode
- TypeScript 5
- Vite 6
- Tailwind CSS 4
- Zustand
- OpenAI SDK with Zod Structured Outputs
- Supabase PostgreSQL 17, Auth, and private Storage

## Local development

### Prerequisites

- Node.js 22 LTS
- npm
- OpenAI API credentials
- Supabase credentials when exercising readiness, auth, storage, or persistence code
- Docker Desktop only for local Supabase execution and container verification

### Install

```bash
npm ci
```

Installation copies `pdf.worker.min.mjs` from `pdfjs-dist` into `public/` through the `postinstall` script.

### Environment

Create a local `.env` from `.env.example`. Required server values are validated by `app/lib/server/config.ts`:

```dotenv
NODE_ENV=development
APP_ORIGIN=http://localhost:5173

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_RESUME_BUCKET=resumes
ANALYZE_INVITE_TOKEN=<temporary invite token, at least 16 random characters>
ANALYZE_RATE_LIMIT=5
ANALYZE_RATE_WINDOW_SECONDS=60

OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
OPENAI_TIMEOUT_MS=20000
OPENAI_MAX_OUTPUT_TOKENS=1200
QUALITATIVE_MAX_ATTEMPTS=1
MAX_UPLOAD_BYTES=10485760
CSP_MODE=report-only
SESSION_MAX_AGE_SECONDS=3600
RETENTION_DAYS=30
```

Never commit `.env` or expose `SUPABASE_SECRET_KEY`/`OPENAI_API_KEY` to browser code.

### Run

```bash
npm run dev
```

Open `http://localhost:5173`.

## Commands

```bash
npm run dev          # React Router development server
npm run build        # Production client and SSR build
npm run start        # Serve the production build on port 3000 by default
npm run typecheck    # Generate route types and run TypeScript
npm run test         # Unit and integration tests
npm run test:security # Focused security, privacy, observability, and recovery tests
npm run test:e2e     # Production-build browser and accessibility tests
npm run test:a11y    # Dedicated axe accessibility checks
npm run test:load    # Deterministic Phase 7 load/recovery acceptance report
npm run test:restore # Deterministic ownership/checksum restore verification
npm run check:alerts  # Validate the checked-in Prometheus SLO rules
npm run check:container # Validate runtime image hardening invariants
npm run worker:privacy:once # Process one queued export/deletion request
npm run worker:retention:once # Process one retention cleanup sweep
npm run verify       # Format, lint, test, typecheck, and build
npm run verify:ci    # Reproduce all CI quality and browser gates locally
npm run copy-worker  # Refresh the public PDF.js worker
```

## Current data flow

1. The authenticated upload page sends a PDF, consent, and optional job details to `/api/analyze`.
2. The server validates origin, rate limit, request/file boundaries, consent, and tenant ownership, then uploads the private PDF and creates an idempotent durable analysis/job record.
3. The analysis worker claims the job with a lease, extracts text from all PDF pages, runs deterministic ATS rules, and obtains schema-validated grounded qualitative feedback.
4. Results, stage status, audit events, and signed private-file access are persisted in Supabase; the browser polls status and renders only owned terminal results.
5. Privacy requests are handled asynchronously by a leased worker, while retention cleanup removes expired private objects with retryable failure state.
6. Request IDs, PII-safe logs, RED/job/provider metrics, and content-free client telemetry support operations without putting resume text or prompt content into telemetry.

## Supabase

The hosted Resumide project is in `ap-south-1`. Database changes are owned by SQL files in `supabase/migrations/` and applied through the managed migration workflow.

The current schema includes profiles, organizations, jobs, resumes, resume versions, analyses, analysis results, and writer drafts. Application tables have RLS enabled, and resume PDFs use a private 10 MiB PDF-only Storage bucket.

Do not mutate the remote schema manually without a corresponding forward migration and recovery notes.

## Docker and deployment

For a local production run, inject configuration explicitly rather than relying on ambient development settings:

```bash
npm run build
NODE_ENV=production APP_ORIGIN=http://localhost:3000 \
  SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SECRET_KEY=... \
  OPENAI_API_KEY=... npm run start
```

Container runs must also inject secrets rather than copying them into the image:

```bash
docker run --env-file .env -p 3000:3000 resume-ats
```

Fly.io in Mumbai is the approved target, with separate web and worker process groups from one tested artifact. The Dockerfile, runtime-user checks, image build, and container health/readiness smoke pass locally; deployment readiness still depends on the A4 staging, policy, rollback, and deployment-owned security evidence listed above.

## Architecture and contribution workflow

Before changing implementation code, read:

1. [`ARCHITECTURE.md`](ARCHITECTURE.md)
2. [`tasks/plan.md`](tasks/plan.md)
3. [`tasks/todo.md`](tasks/todo.md)
4. Relevant ADRs in [`docs/decisions/`](docs/decisions/)

For the complete documentation map, see [`docs/README.md`](docs/README.md).

Follow numeric task dependencies, preserve unrelated work, and do not mark phases or gates complete without their named automated evidence and human approval.

## License

MIT. The project license is declared in [`package.json`](package.json).
