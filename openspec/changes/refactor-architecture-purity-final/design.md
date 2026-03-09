# Design: Refactor Architecture Purity Final

## Context

The system currently mixes architectural styles:
- centralized rule intentions coexist with local hardcoded rule paths,
- domain/application boundaries are crossed through static holders,
- controllers still perform repository-driven business decisions,
- safety/security behavior relies on mixed-layer allowances,
- policy provider favors availability fallback over fail-fast correctness.

## Goals

- Rule SSOT for workflow + validation.
- Unidirectional dependency flow (controller -> application -> domain -> infrastructure).
- Default-secure and explicit test-only exposure.
- Fail-fast configuration for payroll/rate policies.
- Observable and semantically consistent failures.

## Non-Goals

- Adding new HTTP business capabilities.
- Preserving legacy internal API compatibility where it harms purity.

## Decisions

1. Decision module is retired from runtime business path.
2. Approval transitions are defined only by `ApprovalStateMachine`.
3. Workflow rule evaluation becomes instance-based (injected state machine), not static global.
4. Controllers become transport adapters only.
5. `/api/test-data/**` allowed only in test/e2e profiles and always token-protected.
6. Schedule1 policy resolution is strict: missing configuration fails startup/runtime explicitly.

## Tradeoffs

- Higher short-term refactor cost and internal breakage.
- Lower long-term drift, stronger AI-era constraints, and reduced hidden behavior.

## Risks and Mitigations

- Risk: test fallout due contract/service split.
  - Mitigation: staged compile fixes + dedicated contract tests.
- Risk: e2e instability after strict policy changes.
  - Mitigation: ensure migration/seeding completeness before e2e execution.
- Risk: accidental behavior drift on approval flow.
  - Mitigation: exhaustive legal/illegal transition regression tests.
