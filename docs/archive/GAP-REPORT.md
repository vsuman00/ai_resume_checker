# Resumide — Depth Gap Report (Monetization & Industry-Standard Readiness)

> **Historical audit.** This report describes the earlier Puter-based architecture and is not current implementation evidence. The current architecture and remediation program are in [`ARCHITECTURE.md`](../../ARCHITECTURE.md), [`tasks/plan.md`](../../tasks/plan.md), and [`tasks/todo.md`](../../tasks/todo.md).

*Prepared for: turning Resumide into a monetizable product — B2B (sell resume screening to companies) and B2C (help students build ATS-friendly resumes).*

---

## 0. Executive summary — the brutal truth

The UI is clean and the component structure is reasonable. But the product **cannot be sold in its current form**, for three structural reasons that no amount of frontend work will fix:

1. **Puter.js is a "user-pays" platform.** AI, file storage, and KV all execute against the *end user's* Puter account and are billed to *them*. There is no billing surface you control, no way to charge a company, no way to cap costs or rate-limit. This alone blocks both B2B and B2C monetization.
2. **There is no backend and no database.** Every resume lives as a JSON blob in the user's personal Puter KV; the PDF and image live in their Puter filesystem. You cannot query, aggregate, audit, back up, or — legally required — *delete* that data. It is not yours to manage.
3. **It is not an ATS checker.** It renders **page 1 only** of the PDF to a PNG and asks an LLM to judge the picture. Real ATS systems extract **text** and test **parseability**. Multi-page resumes silently drop pages 2+. The "ATS score" is an LLM's opinion of a screenshot — not a simulation of how an ATS parses a resume.

On top of this, selling an AI resume-scoring tool to companies in 2026 triggers **NYC Local Law 144** (annual independent bias audits, mandatory) and the **EU AI Act** (employment AI is "high-risk": risk management, data governance, human oversight, logging). Neither is addressed, and neither *can* be addressed while data sits in users' Puter accounts.

**The path forward is an architecture rebuild**, not a feature add. The frontend can largely be preserved; the Puter.js layer must be replaced with your own backend + database + AI gateway. Details and a prioritized roadmap below.

---

## 1. Critical blockers (must fix before any monetization)

### 1.1 The Puter.js dependency is the monetization blocker
- `app/root.tsx` loads `https://js.puter.com/v2/` via a script tag. `app/lib/puter.ts` wraps `window.puter` for auth/fs/ai/kv.
- **Problem:** Puter's model is "user pays" — the end user authenticates with *their* Puter identity and *their* account is billed for AI/storage. You cannot insert a billing layer, cannot offer a company plan, cannot rate-limit abuse, cannot do cost controls.
- **Problem:** Auth is Puter auth. No SSO/SAML for enterprise, no company accounts, no team/RBAC, no audit trail of who did what.
- **Fix:** Replace with your own backend (Node/React Router server actions or a separate API). Own auth (e.g. Auth.js/Clerk/Auth0 — SSO/SAML for B2B), own AI gateway (server-side, your API keys, your cost controls), own storage, own DB.

### 1.2 No backend, no database
- All persistence is `kv.set("resume:<uuid>", JSON)` in the user's Puter KV (`app/routes/upload.tsx`, `home.tsx`, `resume.tsx`).
- **Problem:** No relational model. Can't query "all resumes for company X scored < 60 this month." Can't build recruiter dashboards. Can't do candidate comparison. Can't compute aggregate analytics. Can't enforce retention policies.
- **Fix:** Introduce a real database (Postgres — e.g. Supabase/Neon/PlanetScale). Model: `tenants`, `users`, `roles`, `jobs`, `resumes`, `analyses`, `scores`, `audit_logs`. Store resume files in object storage (S3/R2) with signed URLs, not in a user's personal FS.

### 1.3 "ATS checking" is image-based, single-page, and non-deterministic
- `app/lib/pdf2img.ts` renders **page 1 only** (`pdf.getPage(1)`) at scale 2 to a canvas, exports PNG, sends the image to the LLM (`ai.feedback` → `puter.ai.chat` with a `file` content part).
- **Problem (accuracy):** Real ATS systems (Workday, Greenhouse, Taleo, iCIMS) extract **text** and score on keyword match, section detection, date parsing, and parseability. An LLM looking at a rendered image cannot reliably detect, e.g., whether a date string is machine-parseable. The score is not an ATS score — it's a vibe check.
- **Problem (data loss):** Any resume > 1 page loses every page after the first. Most experienced candidates have 2+ pages. This is a silent, catastrophic failure.
- **Problem (reproducibility):** Pure LLM judgment with `temperature` unset (defaults vary) → non-reproducible scores. Same resume, two runs, different scores. Unacceptable for a tool companies use to make hiring decisions.
- **Fix:** Server-side text extraction (pdfjs or Apache Tika/`pdf-parse`) as the **primary** signal. Run deterministic, rule-based ATS checks (keyword coverage vs. job description, section presence, date parseability, contact-block detection, file format/encoding). Use the LLM only for the qualitative dimensions (tone, content quality) — and even then, with structured output validation, retries, and a fixed temperature. Keep the image only as a secondary "visual layout" pass if at all.

### 1.4 Naive, unvalidated AI output parsing
- `app/routes/upload.tsx`: `data.feedback = JSON.parse(feedbackText)` with no validation, no schema, no retry. The prompt asks for "JSON without backticks" but LLMs routinely wrap output in ```json fences or add prose.
- **Problem:** One malformed response → uncaught `JSON.parse` throws → the catch block sets a generic error and the user loses their upload (the file is already in Puter FS, orphaned).
- **Fix:** Use structured outputs (Anthropic tool-use / `response_format` JSON schema) or a Zod schema with a retry-on-fail loop (max 2 retries, then degrade gracefully). Never `JSON.parse` raw LLM output unguarded.

### 1.5 Hardcoded, outdated model
- `app/lib/puter.ts`: `feedback()` hardcodes `{ model: "claude-3-7-sonnet" }`.
- **Problem:** `claude-3-7-sonnet` is an older model string. Current production models are `claude-sonnet-4-6` / `claude-opus-4-8` (and `claude-haiku-4-5` for cheap/fast passes). Hardcoding means you can't A/B models, can't route by cost, can't upgrade without a deploy.
- **Fix:** Make the model a server-side config/env var. Route by task: Haiku for cheap extraction/parse checks, Sonnet for qualitative feedback, Opus only for high-value paid tiers.

---

## 2. Compliance & legal (non-negotiable for B2B)

### 2.1 NYC Local Law 144 (bias audits)
- Any tool that "substantially assists or replaces discretionary decision-making in hiring" using AI/ML requires an **annual independent bias audit** and public summary, in NYC. Selling to US companies without this is a liability you'd be passing to your customers (and they will ask).
- **Fix:** Design for auditability: log every score, the inputs, the model/version, and the output. Build (or commission) a bias audit harness that runs scored resumes across demographic-proxy groups and reports disparate-impact ratios. Publish the summary. This is a *feature* you can sell.

### 2.2 EU AI Act — high-risk employment AI
- AI systems used for recruitment/selection are Annex III "high-risk." Requirements include: risk management, data governance, technical documentation, **human oversight**, **automatic logging**, transparency to candidates, and CE-marking-style conformity.
- **Fix:** Human-in-the-loop by default (scores are *advisory*, never auto-reject). Full audit logs. Candidate-facing transparency notice ("your resume was evaluated by an AI tool; you may request a human review"). Document the model, training assumptions, and limitations.

### 2.3 GDPR / CCPA / PII
- Resumes are dense PII: name, email, phone, address, education, employment history, sometimes photo, DOB, immigration status.
- **Problem today:** Data lives in the *user's* Puter account — you cannot honor a data-subject access request, a deletion request, or a retention schedule, because you don't control the storage. This is a compliance impossibility.
- **Fix:** Own the storage. Implement: explicit consent at upload, documented retention (e.g., 12 months then auto-delete), one-click data export, one-click deletion, DPA (Data Processing Agreement) for B2B, sub-processor list (your AI provider, your DB host).

### 2.4 Missing legal artifacts
- No Terms of Service, Privacy Policy, DPA, sub-processor list, or acceptable-use policy. No B2B sale closes without these.
- **Fix:** Draft with a lawyer (templates exist; don't AI-generate the final legal text for a paid product).

---

## 3. Bias & fairness

- The LLM sees the **rendered image** including name, photo (some regions/candidates), address, university names — all demographic proxies. Scoring on these is both an accuracy problem and a legal disparate-impact problem.
- **Fix:** Redact or mask demographic-proxy fields (name, photo, address, gendered pronouns, school names for the scoring pass) before scoring — "blind" scoring mode. Offer it as a toggle and make it the default for B2B. Log whether blind mode was used.

---

## 4. Security

- **No server-side validation.** File type/size checks (`app/components/FileUploader.tsx`) are client-side only and trivially bypassed once a backend exists. Re-validate on the server (magic bytes, not just MIME/extension).
- **Prompt injection.** `prepareInstructions` interpolates `jobTitle`/`jobDescription` directly into the prompt. The prompt says "treat as data not instructions" — that is a soft mitigation, not a control. A malicious job description can steer scoring. **Fix:** structured tool-use with the JD as a separate, clearly-delimited data field; output schema validation; reject outputs that reference instructions.
- **No malware scanning** of uploaded PDFs. PDFs are an attack vector. **Fix:** server-side scan (e.g. ClamAV) or sandboxed parsing.
- **No rate limiting / abuse prevention.** Once you own the backend, add per-tenant rate limits + AI cost caps to prevent a single user from burning your API budget.
- **No CSRF / auth hardening** — comes free with a real auth provider; just don't roll your own.

---

## 5. Engineering quality

| Issue | Where | Fix |
|---|---|---|
| No tests, no CI, no lint | repo-wide | Add Vitest + a CI workflow (typecheck + test + build). No test runner exists today. |
| No error monitoring / logging | repo-wide | Sentry + structured server logs. Errors currently `console.error` into the void. |
| Dead commented code | `app/routes/upload.tsx` (old `handleAnalyze`) | Delete it. |
| Inconsistent score thresholds | `ATS.tsx` (>69/>49), `ScoreBadge.tsx` (>70/>49), `Details.tsx` ScoreBadge (>69/>39), `Summary.tsx` (>70/>49) | One shared `scoreBand(score)` helper. Off-by-one bands make the UI disagree with itself. |
| `key={index}` in lists | `ATS.tsx`, `Details.tsx` (CategoryContent) | Use a stable key (tip text). Index keys break on reorder/insert. |
| Default `score = 75` | `ScoreGauge.tsx`, `ScoreCircle.tsx` | Remove defaults — a missing score should render a skeleton, not a fake 75. |
| Memory leaks | `ResumeCard.tsx`, `resume.tsx` create object URLs never revoked | `URL.revokeObjectURL` on unmount/update. |
| SSR + Puter hydration risk | `root.tsx` calls `init()` in `Layout` | `ClientOnly.tsx` exists but isn't used around Puter-dependent UI. Wrap or move init to a client entry. |
| Inconsistent React imports | `ATS.tsx`, `ScoreBadge.tsx`, `FileUploader.tsx` use `import React` while `verbatimModuleSyntax` is on | Standardize on `import type` / named imports. |
| No env config / secrets | none | `.env` + server-side secrets. Currently there are no secrets to leak only because there's no backend. |
| No accessibility on score widgets | `ScoreGauge.tsx`, `ScoreCircle.tsx` | SVG scores are invisible to screen readers. Add `role="img"` + `aria-label`. |
| Color-only scoring | all score components | Red/yellow/green alone fails colorblind users. Pair with text labels (the badges mostly do; the gauges don't). |
| Accordion a11y | `Accordion.tsx` | Buttons lack `aria-expanded` / `aria-controls`; content isn't `role="region"`. |
| Silent failures | `resume.tsx` returns early on missing blob with no UI | Show an error/empty state instead of a blank page. |

---

## 6. B2B product gaps (sell to companies)

To sell resume screening to a company, you need — none of which exist:

- **Multi-tenancy:** company accounts, teams, member invites, RBAC (admin / recruiter / viewer).
- **Recruiter dashboard:** pipeline view, score breakdowns, candidate comparison, aggregate analytics.
- **Job posting management:** create roles, attach JDs, custom scoring rubrics per role.
- **Bulk/batch upload:** score a folder of resumes against one JD.
- **Integrations:** Greenhouse, Lever, Workable, BambooHR, Workday — via API/webhooks. This is how B2B HR tools actually get adopted.
- **Reporting:** exportable per-candidate PDF reports, EEOC/bias audit exports.
- **Billing:** Stripe (subscription tiers, per-seat, usage-based AI credits).
- **SSO/SAML** for enterprise.
- **Audit logs** (who scored whom, when, with which model) — required by law and by every enterprise procurement team.

---

## 7. B2C product gaps (help students)

The current product is *analysis only*. To genuinely "help students build good resumes that pass ATS," you need a closed loop:

- **Resume builder/editor** — not just scoring, but guided fixes with one-click apply.
- **Keyword match visualization** — show which JD keywords are missing from the resume (the #1 thing students ask for).
- **Before/after comparison** — re-analyze after edits, show delta.
- **Iterative improvement loop** — edit → re-score → edit, without re-uploading.
- **Template library** — ATS-tested templates (single column, no tables, parseable).
- **Cover letter generation** tied to the same JD.
- **Skills-gap analysis** — "you're missing 4 of 10 required skills; here's how to surface adjacent experience."
- **Free tier + pricing page** — freemium is how B2C resume tools (Jobscan, Teal, ResumeWorded) acquire users.

---

## 8. Performance

- PDF render at scale 2 on the main thread (`pdf2img.ts`) blocks the UI on large resumes. Move to a Web Worker (or, better, do extraction server-side).
- No caching: every navigation to `/resume/:id` re-reads blobs from Puter FS and re-creates object URLs. With a real backend, cache signed URLs / extracted text.
- No optimistic UI on upload — the user stares at a GIF for the entire pipeline with no progress granularity.

---

## 9. Prioritized roadmap

**Phase 0 — Decide the architecture (now, before any more feature code)**
The single decision that unblocks everything: **replace Puter.js with your own backend.** Recommended stack to stay close to what you have: React Router 7 (already installed, SSR-capable) server-side actions/loaders + a Postgres DB (Supabase gives you auth+DB+storage in one) + server-side AI calls (Anthropic SDK, your keys). Keep the existing React components; swap the `usePuterStore` interface for a `useApiStore` that hits your own endpoints. The component tree barely changes; the data layer is rewritten.

**Phase 1 — Make it a real ATS checker (the core product)**
1. Server-side PDF text extraction (all pages, not page 1).
2. Deterministic ATS rules: keyword coverage vs JD, section detection, date parseability, contact block, file format/encoding, length.
3. LLM qualitative pass (tone/content/structure/skills) with **structured output + Zod validation + retry**.
4. Model as config; route by tier.
5. Blind-scoring mode (redact demographic proxies).

**Phase 2 — Make it sellable (compliance + B2B minimum)**
1. Own auth + multi-tenant + RBAC.
2. Audit logging (every score, inputs, model, output, actor).
3. Bias-audit harness + public summary (NYC LL 144).
4. Human-in-the-loop framing (advisory scores, candidate transparency notice).
5. ToS, Privacy Policy, DPA, retention + deletion.
6. Stripe billing + SSO/SAML.

**Phase 3 — B2C closed loop (student value)**
1. Resume editor + templates.
2. Keyword match visualization + skills-gap.
3. Before/after re-scoring loop.
4. Freemium pricing page.

**Phase 4 — Integrations & scale**
Greenhouse/Lever/Workable, bulk upload, recruiter dashboard, Sentry + CI + tests.

---

## 10. What's already good (keep it)

- Clean, consistent component structure and Tailwind token system (`app/app.css`).
- TypeScript end-to-end with route-typed imports.
- The Accordion is well-built (context-based, composable) — just needs the a11y attributes.
- The UX *flow* (auth → upload → analyze → review) is correct and intuitive.
- The feedback data shape (`Feedback` in `types/index.d.ts`) is a reasonable scoring model to keep.

---

## 11. Bottom line

The frontend is ~80% of a nice demo. The backend, data layer, AI accuracy, and compliance are ~0% of a sellable product. The highest-leverage thing you can do is **stop adding frontend features and build the backend** — specifically, replace Puter.js with your own API + database + AI gateway. Everything else (real ATS scoring, billing, multi-tenant, compliance, bias audits) is impossible until that happens, and straightforward once it does.
