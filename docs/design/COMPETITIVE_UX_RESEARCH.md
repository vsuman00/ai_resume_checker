# Resume Analysis and Job-Search Product UX Research

Status: **RESEARCH COMPLETE; PRODUCT AND CONCEPT DECISIONS REQUIRED**
Research scope: public product pages, public help documentation, and publicly shown product interfaces available in September 2026. Authenticated product areas were not accessed.

## Executive summary

The market divides into two product families:

1. **Resume analyzers** such as Jobscan, Resume Worded, Rezi, Enhancv, and Kickresume. Their dominant loop is upload a resume, optionally add a job description, receive a score, inspect issue categories, edit, and rescan.
2. **Job-search operating systems** such as Teal, Huntr, Careerflow, and Simplify. Their dominant loop is save a job, organize it in a pipeline, attach or tailor application materials, apply, and follow up.

Most products compete through breadth: more generators, more trackers, more templates, more AI actions. Their interfaces commonly converge on white dashboards, a blue or purple accent, card-heavy tool launchers, Kanban boards, and a large numeric score. This makes the category understandable but visually interchangeable.

Resumide should not try to out-feature those platforms in its first redesign. Its differentiated product should be a **resume evidence workspace**:

```text
Source document -> Parsed structure -> Scoring evidence -> Prioritized repair -> Verified rescan
```

That model is already supported by the project's deterministic rule trace, parse view, keyword coverage, and bounded rewrite output. The redesign should make that chain the primary interface. A Claude-inspired warm editorial palette can make the product feel calm and premium, but the unique design must come from the evidence interaction model, not the palette.

## Research set

### Teal

Teal positions itself as an all-in-one job-search workspace. Its public job tracker emphasizes saving opportunities, moving them through stages, attaching resumes, extracting keywords, adding notes and contacts, and following up. The product is presented as a spreadsheet-like high-level view rather than only a Kanban board. Its getting-started material separates Job Tracker, Resume Builder, Resume Designer, Contacts, and Companies as major areas. [Teal Job Tracker](https://www.tealhq.com/tools/job-tracker) [Teal Getting Started](https://help.tealhq.com/en/collections/9568982-getting-started)

Observed interface structure:

- Broad top navigation on the public site.
- A split hero with benefit bullets and a large product screenshot.
- Dense table-like tracker with pipeline counts above it.
- Contextual job tools for guidance, notes, resume attachments, contacts, email templates, and checklists.
- Strong yellow CTA against a dark teal identity.

Useful lesson: a tracker becomes valuable when each row connects to its documents, contacts, notes, and next action. A collection of disconnected feature cards does not create the same operational value.

### Huntr

Huntr combines a visual job tracker, resume builder, resume tailoring, cover letters, and autofill. Its newer Application Hub groups a tailored resume, cover letter, and follow-up email into an application packet connected to a specific saved job. The hub recommends creating packets from jobs that do not have one and selecting an appropriate base resume. [Huntr](https://huntr.co/) [Huntr Application Hub](https://help.huntr.co/en/articles/14367332-application-hub-and-packets)

Observed interface structure:

- Strong purple identity with playful geometric brand shapes.
- Product navigation is organized around Job Tracker, Resume Builder, and Resume Tailor.
- Marketing leads with a video and a horizontal set of feature modes.
- The job model is visual and stage-oriented.
- Application materials are treated as a bundle attached to a role.

Useful lesson: the job is a durable context object. Resume versions and generated documents become easier to understand when attached to that object instead of floating independently.

### Careerflow

Careerflow presents its Job Tracker as a centralized dashboard with custom labels, status updates, resume integration, AI suggestions, contacts, follow-ups, interview notes, reminders, and analytics. Public guidance describes a Kanban-style tracker and a left-sidebar product architecture. [Careerflow Job Tracker](https://www.careerflow.ai/job-tracker) [Careerflow Help](https://help.careerflow.ai/en/articles/8936729-getting-started-job-tracker)

Observed interface structure:

- Conventional blue SaaS brand with a left-aligned benefit hero.
- Product screenshot shows Search, Filter, Add, and multiple status columns.
- Compact job cards inside a Kanban board.
- Analytics are positioned as an overview of progress and skill gaps.
- Resume tools and tracking are connected under one dashboard.

Useful lesson: search, filtering, and status views become necessary once history grows. A resume-analysis history should establish these patterns before it becomes a full job CRM.

### Simplify

Simplify builds around one candidate profile that powers job matches, autofill, resume tailoring, and application tracking. Its tracker supports filters, saved searches, CSV import/export, favorite/archive actions, and both Columns and List views. Its current public brand uses large editorial serif headlines and quiet product mockups rather than the category's usual blue SaaS typography. [Simplify](https://simplify.jobs/) [Simplify Job Tracker](https://help.simplify.jobs/en/articles/2140179-using-the-job-tracker)

Observed interface structure:

- Editorial serif hero with a restrained neutral canvas.
- Rounded product mockup as the dominant visual artifact.
- Job matches are compact rows with one action or one match score.
- The platform promises one profile shared across matches, resumes, and applications.
- The tracker offers list and column views rather than forcing one model.

Useful lesson: an editorial visual tone is now credible in this category. Resumide therefore cannot rely on serif type and warm restraint alone for differentiation. Its source-to-evidence interaction must be the memorable element.

### Jobscan

Jobscan's core scanner accepts a resume and job description, then reports a match rate, missing hard and soft skills, recruiter tips, formatting issues, and searchability checks. Its own explanation explicitly states that the match rate is a visualization and that an ATS does not literally assign that score. Public course material shows a result layout with a score in a circular gauge, a left-side issue-category navigation, Resume and Job Description tabs, and a main issue panel. [Jobscan Resume Scanner](https://www.jobscan.co/resume-matcher) [Jobscan course PDF](https://info.jobscan.co/hubfs/B2B/Downloadable%20Resources/Job%20Application%20Masterclass%20Course.pdf)

Observed interface structure:

- The upload action is the center of the acquisition page.
- Result navigation is issue-category based: Searchability, Hard Skills, Soft Skills, Recruiter Tips, and Formatting.
- A persistent score anchors the report.
- Upload/rescan and editing actions sit close to the result navigation.
- Resume and job-description context are treated as paired inputs.

Useful lesson: issue-category navigation is more usable than an endless report. Resumide should retain this principle but organize the categories around verifiable evidence and repair priority rather than only a score.

### Resume Worded

Resume Worded scores a resume across impact, brevity, style, skills, and ATS readability. It emphasizes ranked findings tied to exact lines and allows controlled rewriting of a selected line, followed by rescoring. Its public product image shows the score categories across the top, a result summary and recommendations in the center, and the source resume in a side pane with highlighted lines. [Resume Worded Score My Resume](https://resumeworded.com/score) [Resume Worded Optimizer](https://resumeworded.com/resume-optimizer)

Observed interface structure:

- Score categories form persistent top-level navigation.
- The source resume remains visible beside the feedback.
- Recommendations are ranked and tied to the document.
- The product encourages an edit and rescan loop.
- Privacy reassurance is placed directly beside the upload control.

Useful lesson: feedback becomes actionable when it points to an exact source line. Resumide's rule trace and parse data can take this further by showing both the source evidence and the machine-extracted representation.

### Rezi

Rezi's public checker uses a split layout: value explanation on the left and an embedded upload form on the right. The form accepts a resume and optional job description, and the analysis groups findings into Content, Format, Optimization, Best Practices, and Application Readiness. [Rezi Resume Checker](https://www.rezi.ai/tools/resume-checker)

Observed interface structure:

- Strong grid lines create a technical page frame.
- The upload form is visible immediately without a separate landing step.
- Resume and job context are collected in one panel.
- Validation and the CTA are close to the file control.
- The visual system is minimal, monochrome, and dense.

Useful lesson: Resumide's upload should remain immediately understandable. 3D decoration must not push the real file input or job-description field below the fold.

### Enhancv

Enhancv's checker performs content, layout, design, ATS parsing, and keyword checks. The public page places a file dropzone beside a large report mockup and puts the data-use reassurance immediately below the upload CTA. Its report preview uses a score rail and issue list beside the document view. [Enhancv Resume Checker](https://enhancv.com/resources/resume-checker/)

Observed interface structure:

- Soft mint identity with a large atmospheric gradient.
- Upload and report preview are visible together.
- A compact score rail provides category navigation.
- The document view is a major part of the result.
- Privacy copy is treated as conversion-critical content.

Useful lesson: showing the expected output before upload reduces uncertainty. Resumide can preview its Source, Parse, and Evidence layers without simulating a completed result.

### Kickresume

Kickresume exposes an overall score and category scores for design, content, and structure, then shows detected issues and recommendations. Its editor also provides section-level analysis while the user writes. Public documentation describes a two-part dashboard with a sidebar and main content area. [Kickresume Resume Checker](https://www.kickresume.com/en/resume-checker/) [Kickresume Editor Guide](https://www.kickresume.com/en/help-center/resume/)

Observed interface structure:

- Dashboard-level navigation separates documents and tools.
- Multiple creation paths are offered from the document area.
- Analysis can be global or attached to the section currently being edited.
- Score updates support an iterative improvement loop.

Useful lesson: users need both a summary and local feedback. Resumide should let the overall priority list navigate directly to the evidence section that produced it.

## Comparative product model

| Product       | Primary object              | Primary workspace          | Result model                    | Strong pattern                      | Category risk                       |
| ------------- | --------------------------- | -------------------------- | ------------------------------- | ----------------------------------- | ----------------------------------- |
| Teal          | Job opportunity             | Table tracker              | Match and guidance tools        | Dense operational overview          | Breadth creates navigation weight   |
| Huntr         | Job plus application packet | Kanban and application hub | Tailored materials              | Documents stay linked to a job      | Playful UI can feel less analytical |
| Careerflow    | Job application             | Kanban dashboard           | Analytics and skill gaps        | Search, labels, reminders, contacts | Conventional blue SaaS sameness     |
| Simplify      | Candidate profile plus job  | Matches and tracker        | Fit, tailoring, autofill        | One profile powers every workflow   | Very broad product scope            |
| Jobscan       | Resume plus job description | Scan report                | Match rate and issue categories | Clear category navigation           | Score may dominate nuance           |
| Resume Worded | Resume and source lines     | Review report              | Ranked line-level findings      | Feedback links to exact text        | Dense reports can feel dated        |
| Rezi          | Resume                      | Checker and builder        | Five analysis categories        | Immediate, compact upload           | Generic checker structure           |
| Enhancv       | Resume                      | Checker and editor         | Score rail plus document        | Upload previews the result model    | Decorative gradient can dominate    |
| Kickresume    | Resume document             | Builder and checker        | Global and section analysis     | Iterative section feedback          | Builder breadth can dilute analysis |

## Category design conventions

These conventions are useful because users already understand them:

- A resume file and job description are the two principal analysis inputs.
- A visible score provides a quick orientation.
- Findings are grouped by category.
- The source resume stays available while reviewing feedback.
- Missing keywords are separated from matched keywords.
- Users can rescan after making changes.
- History is navigable from a dashboard or document area.
- Privacy reassurance appears at upload time.
- A persistent primary action starts a new scan or continues the current repair.

Resumide should preserve these conventions unless a better interaction is proven.

## Category problems to avoid

### Score theater

Many products make a large score the visual hero, while methodology, confidence, and evidence are secondary. This can imply a false universal truth. Even Jobscan clarifies that its match rate is a visualization and not a literal ATS-issued score. Resumide should show the score, but pair it with what was measured, what was skipped, and which evidence affected it. [Jobscan Resume Scanner](https://www.jobscan.co/resume-matcher)

### Generic card mosaics

Career products often launch every tool from a similarly weighted card. This is flexible for feature marketing but poor for task hierarchy. Resumide's application should organize around a journey and a document, not around a marketplace of AI tools.

### Detached advice

Generic suggestions such as “add more impact” force the user to hunt through the resume. Resume Worded's line-level feedback demonstrates a better pattern. Resumide should make every important finding navigable to the source line, parsed section, keyword context, or scoring rule. [Resume Worded Optimizer](https://resumeworded.com/resume-optimizer)

### Hidden product boundaries

Claims about “beating the ATS” can overstate what a simulation knows. Resumide should call its output an ATS-readiness analysis, distinguish deterministic checks from AI language feedback, and state that proprietary ATS behavior varies.

### Tracker scope explosion

Job-search platforms accumulate contacts, tasks, reminders, emails, interviews, autofill, job discovery, and coaching. Those features are coherent only when the product's primary object is a job application. Resumide's current architecture is analysis-first. Adding a full Kanban CRM during this redesign would create product and data-model scope well beyond the current implementation.

### Decorative performance cost

Animated hero media, large screenshots, gradients, and global motion may work on acquisition pages but become costly in the daily workspace. The accepted Core Web Vitals targets remain LCP at or below 2.5 seconds, INP at or below 200 ms, and CLS at or below 0.1 at the 75th percentile. [web.dev Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)

## The Resumide opportunity

### Positioning

Resumide should be an **ATS evidence and resume repair workspace**, not a generic AI career toolkit.

The central object is an analysis tied to:

- one source resume version;
- optional target-job context;
- one parser output;
- one versioned deterministic score and rule trace;
- optional bounded qualitative feedback;
- grounded rewrite suggestions;
- a later rescan or version comparison.

### Signature interaction: the Evidence Stack

The same three-layer object appears throughout the journey:

```text
Layer 1  SOURCE    The PDF the candidate uploaded
Layer 2  PARSE     The structured fields an ATS-like parser extracted
Layer 3  EVIDENCE  Rules, keywords, warnings, and safe suggestions
```

This is both the 3D visual language and the information architecture. It is not a decorative floating cube. The visual stack always explains the product.

### Signature workflow: the Repair Queue

The result begins with no more than three prioritized actions. Each action contains:

1. Problem in plain language.
2. Why it matters.
3. Evidence location.
4. Expected score area affected, without promising an exact gain.
5. Safe next action: inspect, copy suggestion, or mark resolved.

The user can then move into detailed evidence. This creates progressive disclosure without hiding how the score was produced.

### Signature trust model

Every result distinguishes:

- **Verified:** produced by a deterministic rule or direct parse evidence.
- **Suggested:** qualitative language guidance from the configured AI provider.
- **Unavailable:** evidence could not be extracted or a provider stage failed.
- **User-confirmed:** a candidate accepted or marked an action resolved.

This vocabulary should appear in badges, section introductions, and exportable reports.

## Recommended information architecture

### Public navigation

```text
Product | How scoring works | Privacy | Sign in | Analyze resume
```

Do not expose a long list of small generators. The public story should explain the Evidence Stack and show the result experience.

### Signed-in navigation

```text
Analyses
New analysis
Resume versions     future-safe, hidden until supported
Account             minimal settings
Privacy
```

Do not add Jobs, Contacts, Interviews, Billing, or Admin until the corresponding product phases are approved.

### Route model

| Route           | User question                       | Dominant action           | Core content                            |
| --------------- | ----------------------------------- | ------------------------- | --------------------------------------- |
| `/`             | What should I continue?             | Analyze resume            | Latest result and analysis history      |
| `/upload`       | Is my input ready?                  | Analyze resume            | Target context, PDF, consent, readiness |
| `/analysis/:id` | What is happening?                  | Cancel or View result     | Real stage timeline and durable status  |
| `/resume/:id`   | What should I fix first?            | Inspect first priority    | Repair queue, score, evidence workspace |
| `/auth`         | Why should I trust sign-in?         | Send secure link          | Privacy benefit and focused email form  |
| `/privacy`      | What data exists and what can I do? | Export or review deletion | Policy summary and request history      |

## Page-by-page design requirements

### Home and analysis history

Use a workspace header, one latest-analysis region, then a compact list. The list should expose resume name, target role or company, state, overall score, update time, and one contextual action. Add search and filter only when the dataset requires them, but design the row contract now.

Avoid a resume-thumbnail card grid. Thumbnails are expensive, create layout shifts, and make every analysis look equally important. A row is faster to scan and adapts better to mobile.

Empty state content:

```text
Run your first ATS visibility check
See what was extracted, which checks failed, and what to improve first.
[Analyze resume]
```

The Evidence Stack can appear beside this copy as a small CSS 3D artifact.

### Upload and preparation

The upload screen should use a two-column workbench on desktop:

- Main column: Target role, Resume PDF, AI consent.
- Supporting column: file checks, privacy summary, and what happens next.
- Sticky footer: readiness summary and primary action.

The job context remains optional and should be labeled that way. Empty job context must not look like an error. The dropzone must support click/tap as well as drag; W3C guidance specifically requires a simple pointer alternative to dragging. [W3C Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)

Form errors appear beside their field and in a concise linked summary after submission. W3C recommends clear recovery instructions and associating field errors through mechanisms such as `aria-describedby`. [W3C Form Notifications](https://www.w3.org/WAI/tutorials/forms/notifications/)

### Analysis progress

Use the real backend states to build a six-stage vertical timeline:

1. Secure upload.
2. Extract text.
3. Parse structure.
4. Score evidence.
5. Generate feedback.
6. Save result.

Do not derive a fake percentage from the number of stages. Show the last update time and explain that the user may leave when processing is durable. Only the current stage moves. Completed stages are static.

Terminal states require different content and actions:

| State     | Explanation                                                        | Primary action          |
| --------- | ------------------------------------------------------------------ | ----------------------- |
| Complete  | Full result is saved                                               | View result             |
| Partial   | Deterministic analysis is ready; qualitative output is unavailable | View available result   |
| Failed    | Processing did not complete                                        | Upload again            |
| Cancelled | Processing stopped; state is preserved according to policy         | Start another analysis  |
| Rejected  | Input failed a safety or validation boundary                       | Review requirement      |
| Needs OCR | Reliable text could not be extracted                               | Upload a text-based PDF |

### Result and repair workspace

The desktop result uses a 5/7 split. The source viewer stays on the left. The right side begins with the score meaning and Repair Queue, then uses sticky tabs:

```text
Overview | ATS Evidence | Parse View | Keywords | Rewrite
```

The overview is a decision page, not a dashboard of equal cards. It contains:

1. Overall score, written band, and limitations.
2. The three highest-priority actions.
3. A compact category breakdown.
4. Strengths worth preserving.

Detailed sections use aligned rows rather than nested cards. Each row answers:

```text
What was checked? | What was found? | Where is the evidence? | What should change?
```

On mobile, the viewer becomes a Preview tab or full-screen sheet. Feedback remains the initial view. The current sticky 100vh viewer must not be stacked above or below the entire report.

### Rewrite

Show original and suggested text in a diff-like structure. The current product can support Copy before it supports true Accept and Undo. Do not render non-functional editing controls.

Every suggestion repeats the grounding constraint:

```text
Uses only evidence already present in your resume. Review for accuracy before use.
```

Future acceptance should record the source analysis, source text, accepted text, timestamp, and undo state.

### Authentication

Use a two-column trust composition on desktop and a single focused form on mobile. Explain that sign-in creates private durable history and cross-device access. The successful magic-link state should replace the form rather than append a small status line under it.

### Privacy

Separate routine export from destructive deletion. The actions must not look equivalent. Explain retention and effect before the user starts a request, then show request ID, submitted time, state, and completion details in history.

### Error and recovery

The page must retain the product shell and answer:

1. What happened?
2. Is the uploaded data safe?
3. What can the user do next?
4. Which request ID can support use to diagnose the issue?

## Visual system conclusion

Use the **Editorial Intelligence plus Precision Evidence** hybrid from `DESIGN_CONCEPTS.md`.

### Guidance layer

- Warm canvas and calm editorial typography.
- Coral primary action.
- Generous reading rhythm.
- Minimal cards and shadows.
- Clear human explanations.

### Evidence layer

- Teal evidence accent.
- IBM Plex Mono for extracted fields, rule IDs, timestamps, and numeric data.
- Compact rows, fine dividers, explicit state labels.
- Document-source anchors and deterministic provenance.

### Glass

Use glass only for top navigation, sticky result tabs, viewer controls, dialogs, and mobile sheets. Form fields, score regions, report sections, and tables use opaque surfaces.

### 3D

Use CSS transforms and SVG for the Evidence Stack, upload lift, and progress scan. Do not introduce Three.js for the first redesign. The visual metaphor must always correspond to Source, Parse, and Evidence.

## Design content model

Every screen should use product-specific language:

- Say **Analysis**, not generic Project.
- Say **Target role**, not vague Context.
- Say **ATS readiness**, not guaranteed ATS success.
- Say **Evidence**, not AI insight when the result is deterministic.
- Say **Suggestion**, not Fix when the result requires human judgment.
- Say **Unavailable**, not zero when a stage could not run.
- Say **Re-analyze**, not Refresh when a new result will be produced.

## Implementation sequence after approval

### R0: Approve concept and hierarchy

- Approve Editorial Intelligence plus Precision Evidence or record another direction.
- Approve the Evidence Stack and Repair Queue as signature product patterns.
- Approve the result tabs and mobile preview model.

### R1: Design critical static frames

- Upload: empty, file ready, validation error, submission busy.
- Progress: active, partial, failed, cancelled, needs OCR.
- Result: desktop overview, evidence tab, parse tab, mobile overview.
- Produce each frame in light and dark mode.

### R2: Build the component grammar

- Shell, navigation, button, form controls, badges, rows, tabs, dialog, skeleton, and error states.
- Evidence Stack, Stage Timeline, Resume Viewer, Evidence Row, and Repair Queue.

### R3: Implement the critical journey

- Upload, Progress, Result.
- Preserve existing loaders, actions, API contracts, persistence, and authorization.

### R4: Implement supporting pages

- Home, Authentication, Privacy, Error Boundary, and not-found states.

### R5: Add measured motion

- Add only the approved CSS/SVG motion.
- Verify reduced motion, hidden-tab pause, frame behavior, and input responsiveness.

### R6: Production hardening

- Visual regression at 390, 768, 1024, 1366, and 1440 pixels in both themes.
- Keyboard and screen-reader checks.
- Axe checks for every route and major state.
- Production-build Core Web Vitals and bundle budgets.
- Error, refresh, partial, cancelled, direct-open, and expired-session tests.

## Decisions required before UI implementation resumes

1. Confirm the product remains an analysis-first resume workspace, not a full job-application CRM in this phase.
2. Confirm **Editorial Intelligence plus Precision Evidence** as the design direction.
3. Confirm **Evidence Stack** as the primary 3D and information metaphor.
4. Confirm **Repair Queue** as the first result view.
5. Confirm a static high-fidelity design pass for Upload, Progress, and Result before route implementation.

## Sources

1. Teal, [Job Application Tracker](https://www.tealhq.com/tools/job-tracker), accessed September 2026.
2. Teal, [Getting Started](https://help.tealhq.com/en/collections/9568982-getting-started), accessed September 2026.
3. Huntr, [Product overview](https://huntr.co/), accessed September 2026.
4. Huntr, [Application Hub and Packets](https://help.huntr.co/en/articles/14367332-application-hub-and-packets), May 2026.
5. Careerflow, [Job Tracker](https://www.careerflow.ai/job-tracker), accessed September 2026.
6. Careerflow, [Getting Started: Job Tracker](https://help.careerflow.ai/en/articles/8936729-getting-started-job-tracker), January 2026.
7. Simplify, [AI Job Search Platform](https://simplify.jobs/), accessed September 2026.
8. Simplify, [Using the Job Tracker](https://help.simplify.jobs/en/articles/2140179-using-the-job-tracker), accessed September 2026.
9. Jobscan, [Resume Scanner](https://www.jobscan.co/resume-matcher), accessed September 2026.
10. Jobscan, [Job Application Masterclass Course](https://info.jobscan.co/hubfs/B2B/Downloadable%20Resources/Job%20Application%20Masterclass%20Course.pdf), accessed September 2026.
11. Resume Worded, [Score My Resume](https://resumeworded.com/score), accessed September 2026.
12. Resume Worded, [Resume Optimizer](https://resumeworded.com/resume-optimizer), accessed September 2026.
13. Rezi, [Resume Checker](https://www.rezi.ai/tools/resume-checker), accessed September 2026.
14. Enhancv, [Resume Checker](https://enhancv.com/resources/resume-checker/), accessed September 2026.
15. Kickresume, [Resume Checker](https://www.kickresume.com/en/resume-checker/), accessed September 2026.
16. Kickresume, [Resume Editor Guide](https://www.kickresume.com/en/help-center/resume/), accessed September 2026.
17. W3C Web Accessibility Initiative, [Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/), updated March 2026.
18. W3C Web Accessibility Initiative, [Understanding Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements), accessed September 2026.
19. web.dev, [How the Core Web Vitals thresholds were defined](https://web.dev/articles/defining-core-web-vitals-thresholds), updated May 2025.
