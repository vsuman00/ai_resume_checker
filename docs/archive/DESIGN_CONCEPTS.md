# Resumide Redesign Concepts

Status: **DIRECTION SELECTED; PAGE STRUCTURE MOVED TO PRODUCT DESIGN BLUEPRINT**
Decision owner: workspace owner
Decision: combine Editorial Intelligence, Precision Evidence, and tactile document interactions into the Resumide Evidence Desk.

Category research: [`COMPETITIVE_UX_RESEARCH.md`](../design/COMPETITIVE_UX_RESEARCH.md)
Final page structure: [`PRODUCT_DESIGN_BLUEPRINT.md`](../design/PRODUCT_DESIGN_BLUEPRINT.md)

## Why the current interface needs more than a reskin

The existing product has useful analysis capabilities, but the interface presents most information as similarly weighted rounded cards. That creates four problems:

1. The user cannot immediately tell what to do next.
2. The result page feels like a long report instead of an analysis workspace.
3. The upload, processing, and result screens do not feel like one connected journey.
4. Decorative gradients and large containers consume space without explaining the resume evidence.

The redesign must change information hierarchy, navigation, component behavior, and page structure. Color and gradients are only the supporting layer.

## Product experience to design around

Resumide should make one promise visible within five seconds:

> See what an ATS extracted, understand what weakened the score, and know what to fix first.

The primary journey is:

```text
Resume workspace -> Prepare analysis -> Secure processing -> Prioritized result -> Apply improvements
```

Every concept below supports the same product model:

- Evidence is more important than decoration.
- There is one dominant action on each screen.
- Scores always include a written meaning and supporting evidence.
- Processing uses real stages, not a fake percentage.
- Light and dark modes are individually designed.
- Glass and 3D are accents. They never become the content surface.
- The useful page content renders before decorative motion.

## Concept A: Editorial Intelligence

### Character

Calm, premium, articulate, and trustworthy. It combines the warmth of an editorial reading product with the precision of an evidence tool. This is the closest fit to the Claude-inspired direction already captured in the archived design system, while retaining a distinct Resumide identity.

### Visual language

- Warm paper canvas, ivory surfaces, near-black ink.
- Coral for the primary action and teal for verified evidence.
- Newsreader display type for moments of guidance.
- Manrope for controls and body copy.
- IBM Plex Mono for parser output, scores, timestamps, and rule IDs.
- Asymmetric editorial layouts rather than centered card grids.
- Fine rules and surface shifts create structure before shadows.
- A three-layer paper artifact represents source, parsing, and evidence.

### Light mode

```text
Canvas        #F7F3EC  warm paper
Surface       #FCFAF6  content plane
Raised        #FFFFFF  dialogs and floating controls
Ink           #1B1B18  primary text
Brand         #B5563F  coral action
Evidence      #287A72  teal proof
```

### Dark mode

```text
Canvas        #121210  warm graphite
Surface       #1B1A17  reading plane
Raised        #23211E  floating layer
Ink           #EEE8DE  warm white
Brand         #E08A6D  accessible coral
Evidence      #68B9AC  accessible teal
```

### Signature moments

- The empty dashboard contains a small perspective paper stack.
- The upload dropzone behaves like a paper tray; the top sheet lifts during drag.
- The progress screen passes one scan line across a document plane.
- The result page switches between Resume and Parse layers with a subtle perspective transition.

### Best for

Candidate-focused trust, differentiated brand, long-form reading, and a polished premium product.

### Risk

If typography and spacing are not disciplined, it can feel like a publication rather than a serious analysis application.

## Concept B: Precision Lab

### Character

Technical, efficient, analytical, and enterprise-ready. The interface feels like a calibrated instrument for inspecting a document rather than a career coaching product.

### Visual language

- Neutral stone or graphite canvas with cool white work surfaces.
- Electric cyan is used only for active analysis; mint indicates verified evidence.
- Sans-serif typography dominates. Mono is used heavily for the evidence layer.
- Dense split panes, compact rows, status rails, and precise 1px grid lines.
- Glass is used for the command bar and viewer toolbar.
- 3D appears as a technical exploded document view with source, parser, and scoring layers.

### Light mode

```text
Canvas        #F3F5F5  neutral lab
Surface       #FFFFFF  workbench
Raised        #F8FAFA  tools
Ink           #151919  primary text
Brand         #176B87  deep cyan action
Evidence      #2F7D64  verified mint
```

### Dark mode

```text
Canvas        #0D1112  deep graphite
Surface       #141A1C  workbench
Raised        #1B2326  tools
Ink           #EAF0F0  primary text
Brand         #54B8D7  cyan action
Evidence      #71C6A5  verified mint
```

### Signature moments

- Dashboard rows resemble an analysis queue with compact health indicators.
- Upload uses a two-pane inspector with file validation shown as system checks.
- Progress shows a vertical pipeline with stage timestamps and retry diagnostics.
- Results resemble a document debugger: source on the left, extracted structure and rules on the right.

### Best for

Power users, career centers, future administrators, dense evidence, and an enterprise software impression.

### Risk

It can feel cold and intimidating for a first-time candidate. Excessive grid lines or monospace text would reduce approachability.

## Concept C: Career Atelier

### Character

Human, tactile, optimistic, and crafted. The interface treats the resume as a document being improved at a focused studio desk.

### Visual language

- Soft cream canvas, clay action color, moss evidence color.
- Larger editorial typography and more generous whitespace.
- Paper sheets, annotation marks, margin notes, and before/after rewrite cards.
- Rounded corners are reserved for paper sheets and physical controls.
- 3D is most visible in the hero, upload, and rewrite experiences.
- Small hand-drawn SVG marks can point to high-impact improvements.

### Light mode

```text
Canvas        #F8F1E6  cream
Surface       #FFFDF8  paper
Raised        #FFFFFF  floating sheet
Ink           #25211D  primary text
Brand         #B76045  clay action
Evidence      #5D7452  moss proof
```

### Dark mode

```text
Canvas        #171411  dark walnut
Surface       #211D19  paper plane
Raised        #2A2520  floating sheet
Ink           #F3EBDD  warm white
Brand         #E18E70  clay action
Evidence      #9FBD8E  moss proof
```

### Signature moments

- The dashboard feels like an organized stack of recent documents.
- Upload places the PDF onto a dimensional tray with a clear readiness stamp.
- Progress uses restrained page annotations as stages complete.
- Rewrite is the hero feature: original and improved language appear like an editor's before/after proof.

### Best for

First-time users, emotionally supportive guidance, creator-led branding, and memorable 3D presentation.

### Risk

It is the least naturally enterprise-looking option. Too many paper metaphors or annotations could become decorative and reduce scanning speed.

## Decision matrix

Scores use a 1 to 5 scale, where 5 is the strongest fit.

| Criterion                  | Editorial Intelligence | Precision Lab | Career Atelier |
| -------------------------- | ---------------------: | ------------: | -------------: |
| Candidate trust            |                      5 |             3 |              5 |
| Enterprise credibility     |                      4 |             5 |              3 |
| Evidence readability       |                      5 |             5 |              3 |
| Brand distinctiveness      |                      5 |             3 |              5 |
| Dark mode quality          |                      5 |             5 |              4 |
| 3D opportunity             |                      4 |             4 |              5 |
| Performance safety         |                      5 |             5 |              4 |
| Long-form result usability |                      5 |             4 |              4 |
| Future admin compatibility |                      4 |             5 |              3 |
| Total                      |                 **42** |        **39** |         **36** |

## Recommendation

Choose **Concept A: Editorial Intelligence** as the product system, with one controlled influence from Concept B: use the Precision Lab treatment inside parser evidence, rule traces, timestamps, and processing stages.

This creates a clear two-layer experience:

```text
Guidance layer    Editorial, warm, calm, candidate-friendly
Evidence layer    Precise, compact, technical, auditable
```

Concept C's tactile paper interaction can still be used for the upload artifact, but its hand-drawn annotation style should not become a global motif.

## Shared page architecture

The following structure remains valid whichever concept is selected.

### Global shell

Public routes use a compact top bar. Signed-in workspace routes use a rail on desktop and a top bar plus bottom navigation on mobile.

```text
Desktop
┌──────────────┬──────────────────────────────────────────────────┐
│ Resumide     │ Page title                       Primary action  │
│              ├──────────────────────────────────────────────────┤
│ Resumes      │                                                  │
│ New analysis│                  Page content                     │
│ Account      │                                                  │
│ Privacy      │                                                  │
└──────────────┴──────────────────────────────────────────────────┘

Mobile
┌─────────────────────────────────────────────────────────────────┐
│ Resumide                                      Theme / Account   │
├─────────────────────────────────────────────────────────────────┤
│                         Page content                            │
├─────────────────────────────────────────────────────────────────┤
│ Resumes             New analysis                 Account        │
└─────────────────────────────────────────────────────────────────┘
```

### Home `/`

Goal: continue useful work in under five seconds.

```text
Resume workspace                                  [Analyze resume]
Your latest analysis and saved history

Latest analysis
Senior Product Designer · Acme           78 Strong     [View result]

All analyses                                      Search / Filter
Resume          Target role        Status       Score       Updated
Portfolio.pdf   Product Designer   Complete       78        Today
CV-2026.pdf     Staff Engineer     Partial        64        Yesterday
```

Changes from the current page:

- Remove the oversized centered hero after sign-in.
- Replace tall resume cards with dense, accessible rows.
- Give the latest analysis one featured region.
- Empty state uses one small 3D paper artifact and one CTA.
- Loading uses row skeletons; errors keep the shell and show Retry.

### Upload `/upload`

Goal: make preparation, privacy, and readiness obvious.

```text
New analysis                                      Step 1 of 2
Prepare your resume and target role

┌────────────────────────────────────┬────────────────────────────┐
│ Target role (optional)             │ Analysis readiness         │
│ [Job title                       ]  │ ✓ PDF format               │
│ [Job description                 ]  │ ✓ Size within limit        │
│                                    │ ○ Job context optional      │
│ Resume PDF                         │                            │
│ ┌────────────────────────────────┐ │ What happens next           │
│ │       dimensional paper tray   │ │ Extract -> Parse -> Score   │
│ └────────────────────────────────┘ │ -> Feedback -> Save         │
│                                    │                            │
│ [ ] AI processing consent          │ Private and encrypted       │
└────────────────────────────────────┴────────────────────────────┘
Ready to analyze resume.pdf                  [Analyze resume]
```

Changes from the current page:

- Remove the centered single-column form.
- Group the form into Target, Resume, and Privacy sections.
- Add a live readiness panel instead of generic helper text.
- Move the dominant action into a sticky readiness footer.
- Replace the GIF with a CSS/SVG document artifact.
- Preserve values and show inline recovery after failure.

### Progress `/analysis/:id`

Goal: explain what is happening without inventing precision.

```text
Analyzing your resume                              [Cancel]
You can safely leave this page

┌────────────────────────────┬────────────────────────────────────┐
│       document plane       │ ✓ Secure upload          10:42:04 │
│       ─ scan line ─        │ ✓ Extract text           10:42:05 │
│                            │ ● Parse structure          Active  │
│     CSS 3D, no WebGL       │ ○ Score evidence                  │
│                            │ ○ Generate feedback               │
│                            │ ○ Save result                     │
└────────────────────────────┴────────────────────────────────────┘
Last updated 4 seconds ago
```

Changes from the current page:

- Add the normal product shell.
- Replace raw status text with a real stage timeline.
- Map terminal states to distinct recovery panels.
- Keep only one moving element: the active scan line.
- Do not show a percentage or ETA unless the backend can prove it.

### Result `/resume/:id`

Goal: turn analysis into prioritized action.

```text
Resume review    Senior Product Designer            [New analysis]
78 Strong        3 high-impact fixes                 Saved just now

┌──────────────────────────┬──────────────────────────────────────┐
│ Sticky resume viewer     │ Overview Evidence Parse Keywords Edit│
│                          ├──────────────────────────────────────┤
│  Source PDF              │ 1. Add measurable outcomes          │
│  / extracted overlay     │ 2. Clarify leadership scope         │
│                          │ 3. Add two missing role keywords     │
│ [Open PDF] [Parse layer] │                                      │
│                          │ Score breakdown / evidence sections  │
└──────────────────────────┴──────────────────────────────────────┘
```

Changes from the current page:

- Replace the endless stack of cards with a tabbed analysis workspace.
- Keep the resume viewer in a 5-column pane and analysis in 7 columns.
- Show the three highest-impact fixes before category details.
- Convert ATS checks and rule traces into aligned evidence rows.
- Rename Heatmap to Keyword coverage until a true visual overlay exists.
- On mobile, open the PDF in a preview sheet instead of using sticky 100vh content.

### Authentication `/auth`

Goal: earn trust before requesting an email.

```text
┌────────────────────────────────┬───────────────────────────────┐
│ Keep your analysis private     │ Sign in to Resumide           │
│                                │                               │
│ Dimensional source -> evidence │ Email address                 │
│ artifact                       │ [                           ]  │
│                                │ [Send secure sign-in link]    │
│ Private results                │                               │
│ Cross-device history           │ No password required          │
└────────────────────────────────┴───────────────────────────────┘
```

Changes from the current page:

- Add a trustworthy product explanation beside the form.
- Replace the form after success with a dedicated check-email state.
- Give expired links a resend path, change-email action, and return action.

### Privacy `/privacy`

Goal: make consequences and request status understandable.

```text
Privacy and data
Your resumes are private. Active files follow the documented retention policy.

Export your data       Download your stored data and analyses     [Request]
Delete your account    Removes access and starts deletion          [Review]

Request history
Export        Processing        Submitted 10 Sep        Details
Deletion      Completed         Submitted 02 Aug        Details
```

Changes from the current page:

- Separate export and deletion into explanation rows.
- Do not give safe and destructive actions identical styling.
- Add submitted time, state, and details to request history.
- Deletion requires a confirmation dialog and re-authentication before the backend action is extended.

### Error and not-found states

Goal: state what happened and give one safe recovery action.

- Use the normal shell.
- Explain whether uploaded data is safe.
- Include a request ID for server failures.
- Never expose a production stack trace.
- Use contextual actions: Retry, Return to analyses, Upload again, or Sign in.

## Component system to build

### Foundation

- `PublicShell`, `WorkspaceShell`, `WorkspaceRail`, `MobileNavigation`
- `PageHeader`, `SectionHeader`, `ActionBar`
- `Button` variants: primary, secondary, quiet, destructive
- `Field`, `Textarea`, `Checkbox`, `FileDropzone`
- `StatusBadge`, `ScoreRing`, `ConfidenceLabel`

### Workflow

- `AnalysisReadiness`
- `DocumentArtifact`
- `StageTimeline`
- `AnalysisStatePanel`
- `ResumeViewer`
- `ResultTabs`

### Evidence

- `PriorityAction`
- `ScoreBreakdown`
- `EvidenceRow`
- `ParseComparison`
- `KeywordCoverage`
- `RewriteDiff`

### System states

- `Skeleton`
- `EmptyState`
- `ErrorState`
- `Toast`
- `Dialog`

Cards are used only for independently selectable objects. Continuous report content uses sections, dividers, and aligned rows.

## Motion and 3D contract

### Allowed

- CSS perspective and transforms for the document artifact.
- One scan-line animation connected to the active processing state.
- 80 to 140ms hover and press feedback.
- 180 to 220ms tab and panel transitions.
- One route entrance up to 360ms.

### Not allowed

- A global animation library for routine transitions.
- Constant cursor-following effects.
- Animated gradients behind text or forms.
- More than two overlapping blurred surfaces.
- WebGL in the initial route bundle.
- Fake progress, fake ETA, bouncing loaders, or one-second content fades.

### Reduced motion

When `prefers-reduced-motion` is enabled, perspective transitions, parallax, scan travel, and stagger are removed. Content and status changes remain immediate and understandable.

## Performance contract

- LCP below 2.5 seconds at p75 on a mid-range mobile device.
- INP below 200ms at p75.
- CLS below 0.1.
- Initial route JavaScript below 170KB compressed, excluding lazy PDF tooling.
- 3D is CSS/SVG first and cannot block content.
- PDF rendering and result-only tools are route-lazy.
- Blur stays bounded to navigation, toolbars, and dialogs.

## Approval gates before implementation

### Gate C1: Concept

Approve one of:

- A: Editorial Intelligence
- B: Precision Lab
- C: Career Atelier
- Recommended hybrid: A for the product, B for the evidence layer

### Gate C2: Critical screens

Approve wireframes for:

1. Upload default, selected-file, error, and processing states.
2. Progress active, partial, failed, cancelled, and needs-OCR states.
3. Result desktop and mobile information hierarchy.

### Gate C3: Design system

Approve:

- Light and dark palettes.
- Typography and type scale.
- Button, input, panel, row, badge, and dialog shapes.
- Glass boundaries.
- 3D artifact style.
- Motion and reduced-motion behavior.

### Gate C4: Implementation order

Build and verify in this sequence:

1. Shell and component primitives.
2. Upload workflow.
3. Progress states.
4. Result overview and navigation.
5. Evidence, parse, keywords, and rewrite sections.
6. Home, authentication, privacy, and errors.
7. Motion and 3D enhancement.
8. Visual regression, accessibility, and performance hardening.

Each slice must pass component tests, production build, browser screenshots in both themes, keyboard checks, axe, and the defined performance budget before the next slice expands.

## Decision record

Selected: **Editorial Intelligence + Precision Evidence**, with Career Atelier's tactile paper behavior limited to the document artifact.

The chosen system is named **Evidence Desk**. Its signature patterns are the **Evidence Stack** and **Repair Queue**.
