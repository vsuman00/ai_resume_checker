# ADR-0007: Use a canonical resume document and verified rendering

## Status

Accepted for AA0 design by the workspace owner on 2026-10-04 through [ADR-0009](0009-aa0-truth-contract-and-evaluation-design.md), following limited architectural-direction/native-slice approval on 2026-10-03. Versioned logical canonical/suggestion/artifact contracts, immutable lineage, PDF/DOCX-first scope and parse-back design are frozen. Renderer selection/implementation, compiler isolation, artifact accessibility evaluation and measured parity release acceptance remain later gates; LaTeX stays deferred.

## Date

2026-09-11

## Context

The candidate needs to improve a resume on the analysis page, accept or reject line-level suggestions, preserve truthful facts, compare versions, and export PDF, DOCX, and later LaTeX. Editing an uploaded PDF directly is unreliable because PDF is a presentation format and does not provide a stable semantic resume model.

Using LaTeX as the source of truth would couple candidate data to a template, expose untrusted compilation risks, make non-LaTeX renderers harder, and complicate template changes. Generating final files without verifying them would also recreate the original problem: a document can look correct while its extracted text or reading order is wrong.

## Decision

1. Store a template-independent canonical resume document with stable IDs for sections, entries, bullets, and facts.
2. Preserve the original upload as immutable evidence. Every edit creates an immutable child version with a change ledger.
3. Require source evidence and candidate confirmation state for factual fields.
4. Use the canonical document for the same-page editor and every renderer.
5. Implement semantic HTML preview and ATS-oriented PDF/DOCX rendering before or alongside a separately gated LaTeX renderer.
6. Generate LaTeX only from allowlisted templates and escaped canonical content.
7. Compile LaTeX in an isolated, resource-bounded environment with no shell escape, network, host filesystem access, arbitrary includes, or runtime package installation.
8. Parse every generated artifact again and compare critical fields, text coverage, section/order semantics, dates, bullets, and links with the canonical source.
9. Label an artifact `verified` only after the applicable parse-back policy passes. Preserve failure diagnostics and allow the candidate to choose another approved template.
10. Keep template style and content truth separate: a template may change layout but cannot change facts.

## Alternatives considered

### Edit the uploaded PDF in place

Preserves appearance but does not provide reliable semantic editing, responsive authoring, or stable regeneration. Rejected.

### Use LaTeX as the canonical model

Convenient for one template family but couples content to presentation, makes validation and DOCX export harder, and expands the attack surface. Rejected.

### Generate a new document from free-form LLM output

Fast but loses deterministic structure, provenance, reversible edits, and fact-level validation. Rejected.

### Trust a successful render without parsing it again

A successful compile proves only that an artifact exists, not that an ATS-like parser can recover its content in the intended order. Rejected.

## Consequences

- The project needs a canonical resume schema, migration plan, editor operations, version lineage, render adapters, and artifact verification records.
- Import is lossy for some PDFs, so the candidate must be able to verify/correct uncertain fields before editing or scoring.
- Renderer work is more substantial than a copy-to-clipboard writer, but it supports consistent PDF, DOCX, and LaTeX output.
- Parse-back verification becomes a release gate for templates.
- LaTeX infrastructure is deferred until sandbox, package, resource, and privacy controls are approved.
- Accessible PDF claims require separate tagged-PDF and assistive-technology evidence.

## Approval criteria

- Product owner approves structured import instead of pixel-level PDF editing.
- Data owner approves canonical schema, immutable version lineage, and retention/deletion behavior.
- Security owner approves the renderer/compiler threat model and isolation design.
- Accessibility owner approves the artifact accessibility evaluation plan.
- Scoring owner approves the parse-back parity policy.

## References

- [Evidence-grounded scoring and authoring spec](../ATS_SCORING_AND_AUTHORING_SPEC.md)
- [Research report](../ATS_SCORING_AND_AUTHORING_RESEARCH.md)
- [Google Document AI document model](https://docs.cloud.google.com/document-ai/docs/reference/rest/v1/Document)
- [Azure Document Intelligence Read](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/read?view=doc-intel-4.0.0)
- [CTAN tagpdf package](https://ctan.org/pkg/tagpdf)
