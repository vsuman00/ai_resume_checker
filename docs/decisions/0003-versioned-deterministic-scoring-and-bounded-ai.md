# ADR-0003: Separate versioned deterministic scoring from bounded qualitative AI

## Status

Proposed; Gate A0 approval required.

## Date

2026-09-09

## Context

The product must explain why a score exists and avoid presenting an LLM opinion as an exact ATS outcome. The current deterministic rules are transparent but simplistic and unbenchmarked. The qualitative result is schema-shaped but still provider-dependent and non-deterministic.

## Decision

- The deterministic engine owns parse evidence, rule outcomes, compatibility score, skipped/not-evaluated semantics, and confidence.
- The LLM owns only qualitative writing feedback unless a future approved spec expands its role.
- Persist parser, normalizer, taxonomy, ruleset, prompt, schema, and model versions with every analysis.
- Validate provider output at the adapter and final result boundary.
- Enforce provider timeouts, token/output limits, retry classification, usage/cost capture, tenant budgets, and a global kill switch.
- Return a partial deterministic result when qualitative AI is unavailable.
- Product claims and score bands require benchmark evidence and human approval.

## Alternatives considered

### LLM-generated overall score

Easy to build but variable, difficult to audit, vulnerable to prompt injection, and poorly calibrated. Rejected.

### Rules only

Highly reproducible but cannot provide useful nuanced writing feedback. Rejected as the complete product, retained as the numeric compatibility foundation.

### Multiple model providers at launch

Adds routing, evaluation, privacy, cost, and fallback complexity. Deferred. Keep an adapter boundary, implement one approved provider first.

## Consequences

- “Overall score” must clearly disclose deterministic and qualitative components or be replaced with separate scores.
- Model upgrades require offline evaluation and staged rollout.
- Exact rerun reproducibility applies only to deterministic outputs unless an evaluation proves otherwise.
- The fixture corpus becomes a release dependency.

## Approval criteria

- Score ownership, weights, skipped-rule behavior, benchmark metrics, model role, and claim language are approved.
