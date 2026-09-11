# Resumide

[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_17-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-Structured_Outputs-412991?logo=openai&logoColor=white)](https://platform.openai.com/)

**AI-powered resume analyzer that helps candidates optimize their resumes for Applicant Tracking Systems.**

Resumide combines deterministic ATS compatibility checks with AI-driven qualitative feedback to give you actionable insights — keyword gaps, formatting issues, parse simulation, and grounded writing suggestions — all in one place.

![Resume Scan](public/images/resume-scan-2.gif)

---

## Features

- **ATS Compatibility Score** — deterministic rule engine that flags formatting, structure, and parse issues real ATS systems trip on.
- **Keyword Analysis** — matches your resume against a job description and highlights missing and present keywords with evidence.
- **AI Qualitative Feedback** — schema-validated, grounded suggestions for improving content, phrasing, and impact.
- **Parse Simulation** — shows exactly how an ATS would read your resume, section by section.
- **Resume Writer** — AI-assisted rewriting with draft management.
- **Multi-page PDF Support** — full text extraction across all pages.
- **Authentication & Privacy** — secure login, private resume storage, data export, and retention controls.

---

## Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Runtime   | Node.js 22 LTS                          |
| Framework | React Router 7 (SSR mode)               |
| UI        | React 19, Tailwind CSS 4                |
| Language  | TypeScript 5                            |
| Bundler   | Vite 6                                  |
| State     | Zustand                                 |
| AI        | OpenAI SDK with Structured Outputs      |
| Database  | Supabase (PostgreSQL 17, Auth, Storage) |

---

## Getting Started

### Prerequisites

- **Node.js 22 LTS** and **npm**
- An **OpenAI API key**
- A **Supabase project** (URL + keys)
- **Docker Desktop** _(optional — only for containerized runs)_

### Install

```bash
npm ci
```

### Configure

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your own values. Refer to `.env.example` for the full list of required and optional variables.

> **⚠️ Never commit `.env` or expose secret keys in client-side code.**

### Run (development)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Run (production)

```bash
npm run build
npm run start
```

The production server starts on port `3000` by default.

### Docker

```bash
docker build -t resumide .
docker run --env-file .env -p 3000:3000 resumide
```

---

## Scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the development server         |
| `npm run build`     | Production build (client + SSR)      |
| `npm run start`     | Serve the production build           |
| `npm run typecheck` | Run TypeScript type checking         |
| `npm run test`      | Run unit and integration tests       |
| `npm run test:e2e`  | Run end-to-end browser tests         |
| `npm run lint`      | Lint source files                    |
| `npm run verify`    | Format, lint, test, typecheck, build |

---

## How It Works

1. **Upload** — sign in and upload your resume as a PDF, optionally paste a job description.
2. **Analyze** — the server validates the file, extracts text from all pages, and runs both deterministic ATS rules and AI qualitative analysis.
3. **Review** — view your ATS score, keyword matches, parse simulation, and detailed improvement suggestions.
4. **Rewrite** — use the AI-assisted writer to iterate on your resume with grounded suggestions.
