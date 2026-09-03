# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Resumide** — an AI-powered resume analyzer that scores resumes for ATS (Applicant Tracking System) compatibility and produces multi-dimensional feedback (ATS, tone & style, content, structure, skills). Users upload a PDF, optionally supply a job title/description, and receive a JSON-shaped critique from an LLM.

The app is fully client-rendered against the **Puter.js** platform (https://js.puter.com/v2/), which provides auth, filesystem, KV store, and AI chat. There is no traditional backend.

## Commands

```bash
npm install              # also runs copy-worker (copies pdf.worker.min.mjs into public/)
npm run dev              # dev server on :5173 (react-router dev)
npm run build            # production build (react-router build)
npm run start            # serve build/ (react-router-serve) — production mode
npm run typecheck        # react-router typegen && tsc (no emit)
npm run copy-worker      # copies pdf.worker.min.mjs from node_modules to public/
```

Docker: `docker build -t resume-ats . && docker run -p 3000:3000 resume-ats`

There is no test runner, no linter, and no formatter configured. Don't add one unless asked.

## Architecture

**Stack:** React 19 · React Router 7 (framework mode, SSR enabled by default) · TypeScript · Vite 6 · TailwindCSS 4 · Zustand

**Path alias:** `~/*` → `./app/*` (configured via `tsconfig.json` + `vite-tsconfig-paths`). `react-router typegen` generates `./app/+types/*` and `./.react-router/types/*` for route-typed `Route` imports.

**Data flow (the whole app, end-to-end):**

1. **Auth gate** — `app/root.tsx` injects `<script src="https://js.puter.com/v2/">` in `<body>`, then `Layout` calls `usePuterStore().init()` on mount. `init()` polls `window.puter` every 100ms (10s timeout) and calls `checkAuthStatus()`. All routes redirect to `/auth?next=<pathname>` if not authenticated.
2. **Upload** (`app/routes/upload.tsx`) — user picks a PDF via `FileUploader` (react-dropzone). On submit: `fs.upload([pdf])` → `convertPdfToImage(pdf)` (rendered to canvas via `pdfjs-dist`, page 1 at scale 2) → `fs.upload([png])` → `kv.set("resume:<uuid>", JSON)` → `ai.feedback(resumePath, prepareInstructions(...))` → parse JSON response, save back to KV, navigate to `/resume/:id`.
3. **List** (`app/routes/home.tsx`) — `kv.list("resume:*", true)` parses each value as a `Resume` and renders `ResumeCard`s.
4. **Detail** (`app/routes/resume.tsx`) — `kv.get("resume:<id>")` → `fs.read` both PDF + image → `URL.createObjectURL` blobs → render `<Summary>`, `<ATS>`, `<Details>`.
5. **Wipe** (`app/routes/wipe.tsx`) — dev/utility route that lists and deletes all Puter FS files + flushes KV.

**Puter store (`app/lib/puter.ts`)** — single Zustand store exposing `auth`, `fs`, `ai`, `kv` namespaces. Each method handles a missing `window.puter` by setting `error` and returning early. Used everywhere via `const { auth, fs, ai, kv } = usePuterStore()`. The `ai.feedback(path, message)` helper sends a multipart chat message (`type: "file" + type: "text"`) using model `claude-3-7-sonnet`.

**AI prompt contract** — `constants/index.ts` exports `AIResponseFormat` (a TypeScript-shape string the LLM must mimic) and `prepareInstructions({jobTitle, jobDescription})` (system prompt). The model is told to return **only JSON, no backticks, no commentary** — the response is `JSON.parse`d directly. Mismatches here break the detail view.

**PDF rendering** (`app/lib/pdf2img.ts`) — lazily imports `pdfjs-dist/build/pdf.mjs`, sets `workerSrc = "/pdf.worker.min.mjs"` (the file copied by `npm run copy-worker` during postinstall — bumping `pdfjs-dist` requires re-running it). Renders page 1 only to an off-screen `<canvas>` at scale 2, then exports a PNG `Blob` + `File`.

**Type definitions** — `types/index.d.ts` declares `Resume`, `Feedback`, `FSItem`, `PuterUser`, `KVItem`, `ChatMessage`, `PuterChatOptions`, `AIResponse`, and `Job`. `app/lib/puter.ts` augments `window.puter` to type the global injected by the Puter script.

## Conventions

- Route files live in `app/routes/<name>.tsx` and are registered in `app/routes.ts` using `@react-router/dev/routes` helpers (`index`, `route`). Adding a route = edit `routes.ts` + create the file, then the `+types/<name>` import is auto-generated.
- Each route exports its own `meta()` and a default component.
- The `constants/index.ts` file is at the repo root (not under `app/`) and imported via relative path (`../../constants`) — unusual; respect it.
- Components are in `app/components/`, library code in `app/lib/`. Both consumed via `~/...`.
- Tailwind theme tokens (`--color-dark-200`, `--color-badge-*`, etc.) and the `Mona Sans` font are defined in `app/app.css` via `@theme` / `@import` — reuse them instead of hardcoding colors.
- The build **must** include `public/pdf.worker.min.mjs`; if you bump `pdfjs-dist`, rerun `npm run copy-worker` (postinstall handles fresh installs).

## Gotchas

- SSR is on (`react-router.config.ts` → `ssr: true`). Any code that touches `window` or `document` (Puter, `pdfjs-dist`, `URL.createObjectURL`, `crypto.randomUUID`) must be guarded or run inside `useEffect`. `usePuterStore().init()` is the canonical pattern.
- The Puter script is loaded via `<script src="https://js.puter.com/v2/">` in `app/root.tsx` — it is **not** an npm package. If it fails to load within 10s, the store sets an error.
- AI responses are returned as `string` or `content[0].text`; the upload route handles both. The model is prompted to omit markdown fences, but the parser is naive — bad responses surface as JSON parse errors in the browser.
- `app/routes/upload.tsx` has a large commented-out `handleAnalyze` above the live one (legacy code from an earlier flow). Don't re-enable it; the live version fixes the same path with error handling and a try/catch.
- `prepareInstructions` interpolates user input into a prompt — the prompt explicitly tells the model to treat it as data, not as instructions to override the system role.
- The `resumes` constant in `constants/index.ts` is sample/seed data only — the live home view reads from Puter KV, not this array.
