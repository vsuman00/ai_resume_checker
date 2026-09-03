# Resumide — Build Plan: Phases 2–4 (the rest)

*Continuation of PLAN.md. Phases 1 (the wedge: extract → parseSim → rules → parse view + heatmap) is shipped. This plan covers what comes after.*

---

## 0. Where we are

**Shipped (Phase 1 — the wedge):**

- Server-side analysis pipeline: `unpdf` text extraction (all pages) → `parseSim` (section/contact/date heuristic parser) → `atsRules` (9 deterministic rules, reproducible, weighted, with rule trace) → OpenAI Structured Outputs (4 qualitative categories, schema-validated).
- Two new UI differentiators: `ParseView` (original vs what the ATS extracts) + `Heatmap` (coverage bar + keyword chips + rule trace).
- Existing UI (`Summary` / `ATS` / `Details` / `ScoreGauge` / `ScoreCircle` / `Accordion` / `ResumeCard`) preserved byte-for-byte; frozen `Feedback` contract in `types/index.d.ts`.
- Puter.js fully removed (no `<script>`, no `usePuterStore`, no auth route, no wipe route).
- In-memory Zustand store for analyses; no persistence yet.
- Four self-checks covering extraction (real PDF), parseSim (12 assertions), atsRules (18 assertions, reproducibility-checked), and end-to-end pipeline.

**Still pending:** everything in the original plan from Phase 2 onward — persistence, guided bullet builder, templates, cover letters, billing, compliance, B2B, and the engineering-quality debt flagged in GAP-REPORT.md §5.

---

## 1. The one decision that gates everything else: persistence

Before Phase 2 (Guided Bullet Builder + re-score loop), we **must** add persistence. Reasons:

1. The bullet builder is multi-turn — conversation state needs to survive a page refresh. In-memory can't do that.
2. Re-scoring after edits requires a stable resume record (version history, before/after). In-memory can't do that.
3. The bullet builder needs to *save* the bullets the user writes and the resume they land on.
4. The plan's original §6 (closed-loop value) assumes a user can return to their resume days later.

So the very first step of the rest is a small Supabase integration. The plan already named Supabase (§4.2); we keep that choice and do the minimum:

- Supabase Postgres (auth + DB + storage in one).
- `users` table from Supabase Auth (email/password + magic link; SSO comes later, only for B2B).
- `resumes` table: `id, user_id, job_title, job_description, pdf_key, analysis_json, created_at, updated_at`.
- `bullets` table: `id, resume_id, section, original_text, rewritten_text, score, created_at`.
- Storage: resume PDFs go to Supabase Storage under `resumes/<user_id>/<resume_id>.pdf`, signed URLs for read/write.
- Auth gate restored on routes (login required).

**Ponytail call:** Supabase, not a custom Postgres + NextAuth + S3. Three services in one, free tier covers MVP. If the wedge didn't validate, Supabase is still useful as a persistence layer for the B2C closed loop; the cost is small.

---

## 2. Phase 2 — B2C closed loop (student value)

*Goal: the part you said you care about most — teaching students to write bullets that pass ATS.*

### 2.1 Persistence (Supabase) — see §1

One task, split into:

1. Provision Supabase project; create `resumes` + `bullets` tables; set up Storage bucket with RLS per user.
2. Replace `useAnalysisStore` with `useApiStore` that hits server actions.
3. Server actions: `createResume`, `getResume`, `listResumes`, `deleteResume`, `saveBullet`, `listBullets`.
4. `home.tsx` reads from server action (not in-memory).
5. `resume.tsx` reads from server action (not in-memory); survives refresh.
6. Auth gate restored: redirect to `/login` if no session.

**Self-check:** a script that hits each server action with synthetic data and confirms the round-trip. No new dependencies beyond `@supabase/supabase-js`.

### 2.2 Guided Bullet Builder — the heart of Phase 2

A conversational interviewer that produces bullets grounded in the user's answers. The differentiator vs Rezi/ResumeWorded: **we never invent metrics.** If a number isn't supplied, we ask or omit — and we can say "we never make up your achievements" in marketing copy (PLAN.md §9).

**How it works (user flow):**

1. User picks a role (Experience/Projects) and a position from their parsed resume.
2. Server opens a bullet-builder chat (Supabase table: `bullets`, one row per bullet in progress).
3. The LLM interviews: "What did you own?", "What changed because of you?", "Any numbers?", "What tools did you use?"
4. On each turn, the LLM drafts bullets grounded in what's been said.
5. User approves, edits, or asks for another pass. Each approved bullet is scored against the JD's top keywords.
6. Final set of bullets is saved; a "apply to resume" action writes them into the current resume version.

**Server shape:**

- New route: `/api/bullets/interview` — accepts `{ resumeId, section, turn, messages[] }`, returns `{ question, draft, grounded: boolean }`.
- New route: `/api/bullets/score` — accepts `{ bullet, jobDescription }`, returns `{ score, matchedKeywords, missingKeywords, suggestion }`.
- New schema: `BulletDraft` Zod schema (mirrors the server response).
- New schema: `BulletScore` Zod schema.

**Client shape:**

- New component: `BulletBuilder.tsx` — a chat-style UI with a running list of drafts, an "approve" button per draft, and a "final set" list at the bottom.
- New route: `/resume/:id/bullets` — mounts `BulletBuilder` for a specific resume + section.

**Ponytail call:** no multi-agent orchestration, no RAG over the user's past resumes, no "AI Resume Agent." One LLM call per turn, with the user's prior turns as context. If the LLM invents a metric (e.g. "increased sales by 30%") without being told, we detect via a simple regex (`\d+%`, `\$\d+`) and either ask the user to confirm or strip the claim. Honest, simple, marketable.

### 2.3 Profile / Summary writer

Same pattern as 2.2 but for the resume summary. One turn is usually enough: "What's your target role?", "What do you want to be known for?", "Any unique angle?" → LLM drafts a 3-sentence summary → user edits → saved.

Much smaller than 2.2 — can reuse the same `BulletBuilder` component with a single-output mode.

### 2.4 Edit → Re-score loop with delta visualization

The plan's original §6 called this out: "edit → re-score loop with delta visualization ('your score went 54 → 78; here's what moved it')."

**How it works:**

1. User edits a bullet in the bullet builder (or a section in a future editor).
2. Client calls `POST /api/analyze` with the updated text (we extract the text from the updated resume document server-side).
3. Server returns a new `AnalysisResult`; the client computes the delta vs the previous result (which is stored in Supabase as a prior `resumes` version).
4. UI shows: overall score change, per-category change, which rules flipped pass/fail, which keywords entered/left coverage.

**Ponytail call:** don't build a rich-text resume editor yet. The user edits bullets in the builder, the builder saves the final set, and the "apply to resume" action regenerates the PDF from the edited text. The editor is Phase 3 work — too big to bundle here.

### 2.5 ATS-safe templates + export

A small library of templates (5–10 to start) that are:

- Single column, no tables, no text boxes.
- Parseable (run each template through `parseSim` and verify clean extraction).
- Exportable as PDF and DOCX.

**How it works:**

- Templates are React components (JSX) that render a resume given a typed data shape.
- Server-side export: `puppeteer` for PDF, `docx` npm package for DOCX.
- Client picks a template, previews it, clicks "download."

**Ponytail call:** 5 templates to start, not 50. If templates become the wedge, expand later. `puppeteer` is heavy (Chromium) — run only on the server, never client-side.

### 2.6 Cover letter

One LLM call: `{ resume, jobDescription, companyName, tone } → cover letter`. Template-driven (header + 3 paragraphs + close). Save alongside the resume.

### 2.7 Company-specific mode

"this company uses Workday; weight these signals." Start with the top 10 employers by application volume (research-driven, not a general feature). A company profile = a small JSON config:

```json
{ "ats": "workday", "preferredFormat": "singleColumn", "bonusSignals": ["quantifiedImpact", "leadership"], "penalize": ["tables", "icons"] }
```

Server applies the config as a modifier on top of the base `atsRules` weights. UI shows a "tailored for [company]" badge on the heatmap.

**Ponytail call:** hardcode the top 10 to start; don't build a generic "company database" until demand proves it.

### 2.8 Phase 2 gate

Before moving to Phase 3, validate:

- Is the Guided Bullet Builder being used?
- Do users return to edit / re-score?
- Is the parse view being shared (organic distribution)?

If no, iterate on Phase 2 before monetizing. The wedge was the free hook; Phase 2 is the retention hook; Phase 3 is the paywall.

---

## 3. Phase 3 — monetize

### 3.1 Stripe billing

Freemium, per the plan:

- **Free:** 3 analyses/month + parse view (the hero differentiator, always free for screenshots).
- **Pro ($9–19/mo or $49 one-time):** unlimited analyses, heatmap, bullet builder, re-scoring, templates, cover letters.
- **One-time option** reduces churn anxiety in this market (plan's original framing).

**How it works:**

- Stripe Checkout for one-time and subscription.
- Supabase edge function to verify Stripe session on success.
- `user_subscriptions` table in Postgres with `stripe_customer_id, status, expires_at, plan`.
- Rate limiter per user on `/api/analyze` (free = 3/month).

**Ponytail call:** Stripe, not a roll-your-own. One-time payment option is a differentiator vs Jobscan/Teal — keep it.

### 3.2 Pricing page

New route `/pricing`. Three tiers visible. The parse view is emphasized as "always free, always shareable."

### 3.3 Phase 3 gate

Before moving to Phase 4 (B2B), validate:

- Are free users converting to paid?
- Is one-time vs subscription demand split clear?
- Is CAC sustainable (organic vs paid)?

If no, iterate. Don't build B2B on a leaky B2C funnel.

---

## 4. Phase 4 — compliance + B2B

*Only after the wedge + closed loop + billing are working.*

### 4.1 Compliance (legally required for B2B)

**NYC Local Law 144** (bias audits, annual, independent):

- Audit log table: `audit_logs` — every score, inputs, model, output, actor, timestamp.
- A bias-audit harness: runs a curated dataset across demographic-proxy groups (name, school, location), reports disparate-impact ratios.
- Public summary page, published annually. This is a feature you sell, not a cost center.

**EU AI Act** (high-risk employment AI):

- Human-in-the-loop framing (scores are advisory, never auto-reject).
- Candidate-facing transparency notice ("your resume was evaluated by an AI tool; you may request human review").
- Technical documentation: model, training assumptions, limitations.

**GDPR / CCPA / PII:**

- Explicit consent at upload.
- Retention policy: 12 months then auto-delete (configurable per tenant for B2B).
- One-click data export + one-click deletion per user.
- DPA + sub-processor list.

**Legal artifacts:**

- Terms of Service, Privacy Policy, DPA, sub-processor list, acceptable-use policy. Drafted with a lawyer (not AI-generated).

### 4.2 B2B product

**Multi-tenancy:**

- `tenants` table (company accounts).
- `tenant_members` + `roles` (admin, recruiter, viewer).
- SSO/SAML (later, only when enterprise demand is proven).

**Recruiter dashboard:**

- Pipeline view of candidates per role.
- Score breakdowns, candidate comparison, aggregate analytics.
- Custom scoring rubrics per role.

**Job posting management:**

- Create roles, attach JDs.
- Bulk/batch upload (score a folder of resumes against one JD).

**Integrations:**

- Greenhouse, Lever, Workable, BambooHR, Workday — via API/webhooks. Start with one (Greenhouse is the easiest); expand based on demand.

**Reporting:**

- Per-candidate PDF reports (re-use the template export from 2.5).
- EEOC/bias audit exports (CSV, with all required fields).

### 4.3 B2B API (scoring API for bootcamps/universities)

- Usage-based pricing.
- Public OpenAPI spec.
- API key management (tenant-scoped).
- Rate limiting per tenant.
- Webhook callbacks for async analyses.

### 4.4 Phase 4 gate

- First 3 B2B customers onboarded.
- Bias audit summary published.
- At least one integration live.

---

## 5. Engineering quality (ongoing, threaded across phases)

The debt flagged in GAP-REPORT.md §5. Threaded, not front-loaded. Do each item at the natural phase boundary:

| Item | When | Scope |
|---|---|---|
| Vitest + a CI workflow | Start of Phase 2 | Test harness; no test coverage required yet |
| Sentry + structured server logs | Start of Phase 2 | Error monitoring |
| `scoreBand(score)` shared helper | Start of Phase 2 | One shared function in `app/lib/ui.ts`, replace 4 inconsistent threshold tables |
| Delete dead `upload.tsx` commented `handleAnalyze` | Now (already done) | Trivial |
| Fix `key={index}` in lists (`ATS.tsx`, `Details.tsx`) | Start of Phase 2 | Stable keys from `tip.text` |
| Remove default `score = 75` | Start of Phase 2 | Skeleton render instead |
| `URL.revokeObjectURL` on unmount | Done in Phase 1 | Already fixed in `resume.tsx` and `ResumeCard.tsx` |
| Standardize React imports (`import type` / named) | Start of Phase 2 | Cleanup |
| Accessibility on score widgets (`ScoreGauge`, `ScoreCircle`) | Start of Phase 2 | `role="img"` + `aria-label` |
| Color-only scoring → pair with text | Start of Phase 2 | The badges mostly do; gauges don't |
| Accordion a11y (`aria-expanded`, `aria-controls`, `role="region"`) | Start of Phase 2 | `Accordion.tsx` |
| Silent failures in `resume.tsx` | Done in Phase 1 | Redirect to `/` when entry missing |
| PDF worker re-run on `pdfjs-dist` bump | Whenever a bump happens | `npm run copy-worker` |
| Web Worker for client-side PDF render | Phase 2 or 3 | Performance; not blocking |
| Cache signed URLs / extracted text | Phase 2 or 3 | Performance |
| Optimistic UI on upload | Phase 2 or 3 | UX polish |

---

## 6. Honest risks for the rest of the build

1. **The Guided Bullet Builder is the hard part.** It needs to *not* hallucinate metrics. If it does, trust evaporates and the positioning (PLAN.md §9) breaks. Test it with real resumes before shipping.
2. **Templates are a time sink.** "5 to start" is the rule; don't let scope creep.
3. **Company-specific mode is research-heavy.** Start with the top 10 employers, not a general solution.
4. **Compliance is the price of B2B, not a feature.** Don't over-build it before demand.
5. **B2B integrations are the real moat but also the real work.** Greenhouse first; expand only when customers ask.
6. **Stripe freemium conversion is low in this market** (2–5% typical). The one-time option is the differentiator; don't abandon it.

---

## 7. Bottom line

The rest of the build, in order:

1. **Persistence (Supabase)** — unblocks everything after.
2. **Guided Bullet Builder** — the student-value heart of Phase 2.
3. **Profile writer, re-score loop, templates, cover letters, company-specific** — rest of Phase 2.
4. **Stripe + pricing page** — Phase 3.
5. **Compliance + B2B + API** — Phase 4.
6. **Engineering quality** — threaded throughout, not front-loaded.

Each phase has a gate: validate before proceeding. The wedge was the free hook (Phase 1); the bullet builder is the retention hook (Phase 2); the paywall is Phase 3; B2B is Phase 4.