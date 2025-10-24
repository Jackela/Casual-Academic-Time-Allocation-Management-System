# Implementation Plan: Refactor CATAMS Playwright E2E (frontend/e2e/real)

**Branch**: [001-playwright-e2e-refactor] | **Date**: 2025-10-22 | **Spec**: [specs/001-playwright-e2e-refactor/spec.md](specs/001-playwright-e2e-refactor/spec.md)
**Input**: Feature specification from /specs/001-playwright-e2e-refactor/spec.md

## Summary

Refactor and stabilize the real E2E suite to align with updated workflows and SSOT contracts: remove obsolete Tutor self-creation flows, update selectors to data-testid, unify POM usage, and ensure P0 flows (Lecturer create timesheet; Tutor restricted; full approval chain) pass reliably; add P1 coverage for modification/rejection and admin user management.

## Technical Context

**Language/Version**: TypeScript (5.x) on Node.js (>=18 LTS)
**Primary Dependencies**: @playwright/test, project POM helpers (consolidated), test utils
**Storage**: N/A for E2E; relies on existing test/staging environment data
**Testing**: Playwright real E2E; separation from vitest per test-runner constitution
**Target Platform**: Chromium (primary). Cross-browser coverage deferred to smoke suite.
**Project Type**: web (frontend + backend API)
**Performance Goals**: Full real E2E suite completes in ≤10 minutes on CI; each P0 flow <3 minutes
**Constraints**: Stable selectors via data-testid; no arbitrary waits; programmatic login for most flows
**Scale/Scope**: Cover P0 flows fully; at least one happy path for each P1 scenario

## Constitution Check

- SSOT (Single Source of Truth):
  - No client-sent monetary fields in submissions — enforced via payload assertions in tests (Pass)
  - Quote flow present and exercised for input changes — validated in Lecturer flow (Pass)
  - Server-side recompute enforced on create/update — verified by ignoring client financial inputs (Pass)
- Code Quality & Modularity:
  - SOLID/DRY compliance; single responsibility per module — Page Objects split by page/shell (Pass)
  - DDD boundaries respected; prefer composition over inheritance — Test helpers composed (Pass)
- API Contract First:
  - OpenAPI path(s) referenced and validated for the feature — assertions align with documented fields (Pass)
  - Contract tests cover request/response and errors — via response shape checks and status semantics (Pass)
- Tests:
  - Follow docs/testing/strategy.md layer mapping — E2E only for critical flows (Pass)
  - Unit for calculator/policy; integration for controller/persist/migrations — unchanged by this feature (N/A in this plan)
  - E2E for critical UI flows (quote, submission, approvals) — included (Pass)
- Security & Workflow:
  - Role/authorization checks verified — Tutor restricted; approval invariant enforced (Pass)
  - State machine transitions/invariants asserted — approval chain and negative admin-before-lecturer (Pass)
- Observability & Audit:
  - Structured logs on key events — out of scope for E2E refactor (No change)
  - Persisted rate metadata (rateCode, rateVersion, formula, clause) — verified indirectly via SSOT assertions (Pass)
- Documentation:
  - JavaDoc/JSDoc for public types and APIs — JSDoc added to shared test helpers (Planned)
  - OpenAPI updated with current behaviour — referenced as SSOT; no changes from this plan

## Project Structure

```
frontend/
├── e2e/
│   ├── real/
│   │   ├── pages/              # Unified Page Objects
│   │   ├── specs/              # P0/P1 scenarios
│   │   ├── fixtures/           # role credentials, seeds usage
│   │   └── utils/              # login, selectors, intercepts
└── src/                        # (unchanged by this plan)

specs/001-playwright-e2e-refactor/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/

```

**Structure Decision**: Focus on frontend/e2e/real with POM consolidation; artifacts live under specs/001-playwright-e2e-refactor/.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Single-browser (Chromium) | Reduce flakiness and runtime | Tri-browser increases failures/time without product need |
| Programmatic login | Stability and speed | UI login adds flake and time, smoke-only retained |


