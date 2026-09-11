# Resumide — Differentiation & Build Plan (Solo Indie, B2C-first)

> **Historical product strategy.** For the current target architecture, gated implementation sequence, and executable task state, use [`ARCHITECTURE.md`](../../ARCHITECTURE.md), [`tasks/plan.md`](../../tasks/plan.md), and [`tasks/todo.md`](../../tasks/todo.md). This file does not prove implementation or verification status.

*Goal: an in-depth resume analysis + builder that helps job seekers (especially students) build resumes that pass screening for a specific job/company — and is meaningfully different from Jobscan, Teal, ResumeWorded, Rezi.*

---

## 1. Competitor reality (from research, not memory)

| Tool | Core strength | What it does | What it does NOT do |
|---|---|---|---|
| **Jobscan** | Keyword match-rate vs JD; broadest suite | Match report, AI Optimize, LinkedIn, Auto-Apply, tracker, cover letters | Doesn't show what the ATS *parses*; score is opaque; no guided bullet-writing from scratch |
| **Teal** | Resume builder + job tracker; cheap weekly pricing | Builder, tracker, checker, cover letters, keyword matching (premium) | No parse view; no visual heatmap; bullet help is basic |
| **ResumeWorded** | Line-by-line scoring + AutoFix rewrite | Score/100, 30+ checks, AutoFix (rewrites weak lines from your experience), Smart Target, LinkedIn, ATS templates | No parse view; AutoFix fixes existing lines, doesn't interview-and-build; no company-specific |
| **Rezi** | AI builder + bullet generation; huge user base | AI Resume Agent, builder, checker, keyword scanner, templates | No parse view; no visual heatmap; generic AI bullets risk hallucination |

**The crowded middle:** keyword-match + score + builder + cover letter. You will lose a feature war here — they have years and millions of users.

**The open space (your wedge):** *showing the machine's view of the resume* + *teaching people to write bullets that pass it* + *visual, shareable analysis*. None of the four do the parse-simulation view. That is your differentiator.

---

## 2. The wedge — one sentence of positioning

> **"Resumide is the only resume tool that shows you what the ATS actually sees — then teaches you, line by line, how to write bullets that pass it."**

Not "another resume grader." Not "more templates." The tool that makes the black box *visible*.

Three pillars, each maps to a gap competitors leave open:

1. **Parse View** — render the resume through a real parser and show the extracted structure (name, title, dates, skills, sections) next to the original, flagging every field the ATS mangles or misses. *Nobody does this.*
2. **Keyword Heatmap** — a visual overlay on the resume image: green = JD keyword found & parseable, amber = found but in an unparseable spot (image/table/header), red = missing. The "graph of what we can or lack" you asked for. *Shareable, visual, differentiating.*
3. **Guided Bullet Builder** — a conversational interviewer that asks about your experience, writes bullets *grounded in your answers* (no hallucinated metrics), scores each bullet against the JD, and lets you iterate. For the student who "doesn't know how to write the correct bullet point." *ResumeWorded's AutoFix fixes; you build from scratch.*

---

## 3. Why this is winnable solo

You can't out-feature Jobscan. You *can* out-focus them on one thing: the parse-simulation view is technically hard enough that incumbents haven't shipped it, but small enough that one dev can. It's also inherently visual and demoable — which is how indie products win on Twitter/Reddit/TikTok without a marketing budget. The heatmap and parse view are "screenshot-worthy" in a way a match-percentage is not.

---

## 4. Architecture decision (unblocks everything)

**Replace Puter.js with your own backend.** This is non-negotiable for monetization (see GAP-REPORT.md §1) and also *required* for the wedge — parse-simulation and deterministic scoring must run server-side, with your own parser and your own AI keys. Puter's user-pays model and image-only AI path can't do any of it.

### 4.0 UI preservation rule (non-negotiable)

The post-analysis UI is **done and good — do not change it.** `Summary`, `Details`, `ATS`, `ScoreGauge`, `ScoreBadge`, `ScoreCircle`, `Accordion` are the finished product surface. The backend's job is to produce data that *fits this UI exactly*, not the other way around.

Concretely: the `Feedback` interface in `types/index.d.ts` is now the **output contract**. The backend must return a `Feedback` object that drops straight into the existing components with zero changes:

```ts
// This shape is frozen. The backend produces it; the UI consumes it.
interface Feedback {
  overallScore: number;
  ATS:        { score: number; tips: { type: "good" | "improve"; tip: string }[] };
  toneAndStyle:{ score: number; tips: { type: "good" | "improve"; tip: string; explanation: string }[] };
  content:    { score: number; tips: { type: "good" | "improve"; tip: string; explanation: string }[] };
  structure:  { score: number; tips: { type: "good" | "improve"; tip: string; explanation: string }[] };
  skills:     { score: number; tips: { type: "good" | "improve"; tip: string; explanation: string }[] };
}
```

The new differentiators (parse view, keyword heatmap) are **additional data for new screens** — they extend the analysis result, they do not alter the existing feedback UI. So the stored analysis becomes:

```ts
interface AnalysisResult {
  feedback: Feedback;          // ← feeds the existing UI, unchanged
  parseView: ParseViewData;    // ← new screen
  keywordHeatmap: HeatmapData; // ← new screen
  // deterministic rule trace for the "explainable score" differentiator
  ruleTrace: RuleTrace[];
}
```

If the backend needs a richer internal shape, that's fine — but the API response to the client must always include a `feedback` field matching the frozen contract. **Optimize the backend and the result format; preserve the UI.**

### 4.1 AI provider — OpenAI (GPT-5.6), not Claude

Per your request, use the OpenAI API instead of Claude. Verified against OpenAI's live docs (platform.openai.com/docs/models, July 2026):

- "GPT-5 Mini" is **not the current model name**. The GPT-5.6 family has three tiers. The "mini" equivalent is **Luna**.
- All three support **structured outputs (JSON schema / `response_format`)** and **vision/image input** — both required for this use case.

| Model | Role | Input / Output (per MTok) | When to use |
|---|---|---|---|
| **gpt-5.6-luna** | default | $1 / $6 | Cheap, high-volume — the workhorse for a solo indie. Use for the qualitative pass. |
| **gpt-5.6-terra** | quality | $2.50 / $15 | When Luna's quality on a hard resume is insufficient. Config-driven swap. |
| **gpt-5.6-sol** | flagship | $5 / $30 | Avoid for MVP — cost will sink a solo product. Reserve for a future premium tier. |

**Implementation notes:**
- Use OpenAI's **Structured Outputs** (`response_format: { type: "json_schema", json_schema: {...} }`) with a schema derived from `AIResponseFormat` in `constants/index.ts`. This replaces the current fragile "return JSON without backticks" prompt + bare `JSON.parse`. The SDK guarantees schema-conformant output — no fence-stripping, no retry-on-malformed-JSON.
- Keep the model ID in an **env var** (`OPENAI_MODEL=gpt-5.6-luna`), not hardcoded (the current code hardcodes `claude-3-7-sonnet` in `app/lib/puter.ts` — that's the anti-pattern to avoid).
- Fixed `temperature` for reproducibility (the current code leaves it unset → non-reproducible scores).
- Keep the existing `prepareInstructions` prompt content — it's good — just move it server-side and feed it through the structured-outputs schema instead of asking for raw JSON.
- You can keep the Anthropic key as a fallback/secondary provider behind the same interface if you want provider redundancy, but OpenAI is primary per your call.

### 4.2 Recommended solo stack (stay close to what you have)
- **React Router 7** (already installed, SSR) — server loaders/actions are your API. No separate backend service to maintain.
- **Postgres** via Supabase (auth + DB + storage in one — saves you 3 services as a solo).
- **OpenAI SDK server-side** — your keys, your cost control, model as env var (`OPENAI_MODEL=gpt-5.6-luna` default; `gpt-5.6-terra` for quality). Use Structured Outputs (`response_format: json_schema`) so the LLM returns schema-conformant JSON directly — no fence-stripping, no bare `JSON.parse`. Anthropic key can stay as a fallback provider behind the same interface if you want redundancy.
- **PDF text extraction server-side** — `pdf-parse` or `unpdf` (all pages, not page 1). Keep `pdfjs-dist` only for the client-side thumbnail/heatmap overlay.
- **Storage** — Supabase Storage or Cloudflare R2 for resume files, signed URLs.
- **Stripe** for billing (later).

Keep the existing React components; swap `usePuterStore` for a `useApiStore` hitting your own loaders/actions. The component tree barely changes.

---

## 5. MVP scope (the smallest thing that proves the wedge)

Build only this first. Everything else is later.

### 5.1 Core analysis pipeline (server-side)
1. Upload PDF → server validates (magic bytes, size, malware scan later).
2. **Extract text, all pages** (`unpdf`/`pdf-parse`).
3. **Parse-simulation**: run extracted text through a section/contact/date parser → produce the "ATS view" (structured fields). This is the new differentiator.
4. **Deterministic ATS checks** (rules, not LLM): keyword coverage vs JD, section presence, date parseability, contact block, length, file format. Reproducible.
5. **LLM qualitative pass** (tone/content/structure/skills) via **OpenAI Structured Outputs** (GPT-5.6 Luna default, model from env) — schema-conformant JSON, no fence-stripping. Fixed temperature for reproducibility. Output must conform to the frozen `Feedback` contract (§4.0).
6. Store analysis in Postgres; files in R2.

### 5.2 The three pillar screens (client)
- **Parse View** — side-by-side: original resume (rendered) vs "what the ATS extracted," with every mangled/missed field flagged. *The hero differentiator.*
- **Keyword Heatmap** — overlay on the resume image: green/amber/red per JD keyword, with a legend. Plus a bar chart of match % by category (the "graph").
- **Score breakdown** — overall + 5 categories, each expandable to the exact rule that produced it (reproducible, explainable). Reuse your existing `Summary`/`Details`/`Accordion`/`ScoreGauge` components — just feed them real, validated data.

### 5.3 What's explicitly OUT of the MVP
- Resume builder/editor (Phase 2 — it's the bigger build).
- Cover letters (Phase 2).
- Company-specific tailoring (Phase 2 — research-heavy).
- Billing/multi-resume history (ship free first, add auth + history once the wedge validates).
- B2B/API (Phase 3).

**Why so lean:** as a solo indie, your #1 risk is building for 6 months and learning the wedge doesn't land. Ship the parse-view + heatmap for free, post screenshots, and see if it resonates *before* you build the builder.

---

## 6. Phase 2 — the closed loop (student value)

Once the wedge validates, build the part you care about most:

- **Guided Bullet Builder** — conversational interviewer ("Tell me about your role at X. What did you own? What changed because of you? Any numbers?") → writes bullets grounded in your answers, scores each against the JD, one-click iterate. No hallucinated metrics — if a number isn't supplied, it asks or omits.
- **Profile/Summary writer** — same pattern for the resume summary.
- **Edit → re-score loop** with delta visualization ("your score went 54 → 78; here's what moved it").
- **ATS-safe templates** — single-column, no tables, parseable. Export DOCX/PDF.
- **Cover letter** from resume + JD.
- **Company-specific mode** — "this company uses Workday; weight these signals." Start with the top 10 employers by application volume; grow from public research + user feedback.

---

## 7. Phase 3 — monetize & B2B

- **Stripe** freemium: free = 3 analyses/mo + parse view; pro ($9–19/mo or $49 one-time) = unlimited, heatmap, bullet builder, re-scoring, templates, cover letters. One-time reduces churn anxiety in this market.
- **Bias-audit + compliance** (NYC LL 144 / EU AI Act) — only if/when you go B2B. Not needed for B2C-first.
- **Scoring API** for bootcamps/university career centers (ResumeWorded's B2B channel is exactly this — proven demand). Usage-based.

---

## 8. Differentiation checklist (what makes you not-a-clone)

- [ ] **Parse-simulation view** — show the machine's extracted structure, flag mangled fields. *Nobody does this.*
- [ ] **Keyword heatmap overlay** on the resume image — visual, shareable.
- [ ] **Reproducible, explainable scores** — every score links to the exact rule + input that produced it. Trust differentiator.
- [ ] **Grounded bullet builder** — writes from your answers, never invents metrics, scores each bullet.
- [ ] **Blind-scoring option** — redact name/photo/school before scoring (fairness + a feature).
- [ ] **Company-specific tailoring** (Phase 2) — beyond job-specific.
- [ ] **All-pages extraction** — competitors that render page 1 silently lose pages; you won't.

---

## 9. Honest risks for a solo indie

- **Parse-simulation is the hard part.** Real ATS parsers (Workday/Taleo) are proprietary; you'll approximate with open parsers + heuristics. Be honest in the UI that it's a *simulation*, not the exact ATS. "Modeled on Workday-class parsing" is a defensible, truthful claim.
- **Hallucinated bullets** will destroy trust. The bullet builder must refuse to invent numbers — ask or omit. This is a feature ("we never make up your achievements") you can market.
- **Acquisition.** B2C resume tools live or die on CAC. The parse-view + heatmap must be screenshot-worthy and free to use, so organic sharing does your marketing. Budget near-zero for paid acquisition early.
- **Incumbent speed.** If the wedge works, Jobscan/Rezi could copy the parse view. Your moat is doing it *well* first + the grounded bullet builder + community. Move fast, ship the free wedge, build audience.

---

## 10. Recommended order of work

1. **Backend swap** — React Router server actions + Supabase + server-side OpenAI (GPT-5.6 Luna, structured outputs) + `unpdf` extraction. (Unblocks all.)
2. **Parse-simulation engine** — the differentiator. Get this right before anything else.
3. **Deterministic ATS rules + structured LLM pass** — real, reproducible scoring.
4. **Parse View + Heatmap screens** — reuse existing components, feed real data.
5. **Ship free, post screenshots, validate the wedge.** ← gate. Do not pass this point until the wedge resonates.
6. *(only after 5)* Guided Bullet Builder + edit/rescore loop.
7. *(only after 6)* Billing, templates, cover letters, company-specific.
8. *(only after 7)* B2B API + compliance.

---

## 11. Bottom line

Don't compete with Jobscan on breadth. Compete on the one thing none of them do: **making the ATS black box visible** (parse view + heatmap) and **teaching people to write bullets that pass it** (grounded builder). That's a screenshot-worthy, defensible, solo-winnable wedge. Replace Puter.js with your own backend first — nothing else is possible until you do — then build the parse-simulation engine as your hero feature, ship it free, and let the visuals do your marketing.
