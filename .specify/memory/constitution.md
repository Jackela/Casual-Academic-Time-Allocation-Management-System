<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Modified principles:
  - Test-First, Risk-Based → Test Strategy (Unit, Integration, E2E)
- Added sections:
  - Code Quality & Modular Design (SOLID, DRY, DDD)
  - Documentation & API Comments (JavaDoc/JSDoc)
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (added SOLID/modularity + docs gates)
  - ✅ .specify/templates/tasks-template.md (aligned with test strategy layers)
  - ⚠ .specify/templates/spec-template.md (no change; keep story/testing mandates)
  - N/A .specify/templates/commands/*.md (no files present)
- Deferred TODOs:
  - TODO(RATIFICATION_DATE): Original adoption date unknown; set when governance approves
-->

# CATAMS Constitution

## Core Principles

### Single Source of Truth for Calculations (SSOT)
CATAMS MUST treat the backend calculator as the sole authority for all
financial outcomes (associated hours, payable hours, rates, totals). Client
payloads MUST contain only instructional inputs; the server MUST recompute all
financial fields on create/update and ignore any client-supplied monetary
values. The UI MUST fetch fresh quotes when inputs change and display returned
read-only results with clause references.

Rationale: Ensures Enterprise Agreement (EA) compliance, prevents client-side
drift, and guarantees auditability of remuneration.

### Code Quality & Modular Design (SOLID, DRY, DDD)
Code MUST conform to SOLID and DRY principles from
`docs/architecture/coding-standards.md` and reflect modular boundaries per
`docs/architecture/00_core_engineering_principles.md` (DDD, clean architecture,
composition over inheritance). Each module has a single responsibility,
dependencies flow inward to abstractions, and shared logic lives in reusable
components. Deep inheritance hierarchies are discouraged; prefer composition
and interface contracts.

Rationale: Modular, cohesive code reduces coupling, improves testability, and
enables safe extension without regressions.

### API Contract First
Public behaviour MUST be defined and reviewed in OpenAPI before or alongside
implementation. Controllers MUST adhere to the contract; contract and
integration tests MUST verify requests/responses and error semantics.
Breaking contract changes MUST be explicitly versioned and communicated.

Rationale: Reduces integration risk and aligns teams on stable, testable
interfaces.

### Test Strategy (Unit, Integration, E2E)
Testing MUST follow `docs/testing/strategy.md`:
- Unit (primary share): calculator rules, policy providers, application
  services (fast, isolated, deterministic).
- Integration: controller contracts, persistence paths, Flyway migrations,
  OpenAPI contract verification (Testcontainers where applicable).
- E2E (Playwright): critical user journeys only (quote usage, submission,
  approvals, role dashboards). Visual checks for high-risk views.
Write tests first for changed logic (red → green → refactor). CI MUST run
unit/integration on every PR; nightly runs broader suites per strategy.

Rationale: Aligns coverage with risk, ensuring correctness at boundaries while
keeping the suite fast and maintainable.

### Role Security & Workflow Integrity
Authorization MUST enforce role capabilities (Tutor, Lecturer, Admin/HR). All
approval transitions MUST respect the domain state machine and reject illegal
actions. Modification requests MUST capture justification and re-open the tutor
edit window only when policy allows.

Rationale: Preserves data integrity and institutional process compliance.

### Observability, Auditability & Versioning
Services MUST emit structured logs for key events (quote, persist, approval).
Timesheet records MUST persist rate metadata (rateCode, rateVersion, formula,
clauseReference). Policies, calculators, and data migrations MUST be versioned
and traceable. This Constitution uses semantic versioning (MAJOR.MINOR.PATCH)
for governance changes.

Rationale: Enables incident diagnosis, audit trails, and safe evolution.

### Documentation & API Comments (JavaDoc/JSDoc)
All public classes and methods MUST include documentation comments:
- Java: JavaDoc per `docs/architecture/coding-standards.md`.
- TypeScript/JavaScript: JSDoc including params, return types, and error
  semantics.
API behaviour MUST be documented in OpenAPI. Complex business rules include
inline rationale and references to EA clauses where relevant.

Rationale: Clear, close-to-code documentation accelerates reviews, improves
LLM-friendliness, and reduces onboarding time.

## Security & Compliance Standards

- EA Schedule 1 compliance MUST be maintained; changes land via Flyway
  migrations with accompanying calculator tests.
- Accessibility SHOULD target WCAG 2.1 AA for institutional deployments.
- Personal data MUST follow applicable privacy laws (e.g., GDPR-equivalent
  principles where relevant): data minimisation, lawful basis, and deletion on
  request where policy allows.
- API errors MUST avoid leaking sensitive details; map to explicit codes (400,
  403, 404, 409) per backend contracts.
- Production configuration and secrets MUST be managed outside source control.

## Development Workflow & Quality Gates

- Constitution Check MUST appear in each feature plan and pass before Phase 0
  research and again before implementation. Minimum gates:
  - SSOT: No client-side monetary fields; server recompute enforced; quote flow
    validated.
  - Code Quality & Modularity: SOLID/DRY compliance; DDD boundaries respected;
    composition over inheritance preferred.
  - API Contract: OpenAPI updated/added and reviewed; contract tests in place.
  - Tests: Follow `docs/testing/strategy.md` — unit (calculator/policy),
    integration (controller/persist, migrations, contract), E2E for critical
    flows.
  - Security/Workflow: Role checks and state transitions asserted.
  - Observability/Audit: Structured logs and persisted metadata present.
  - Documentation: JavaDoc/JSDoc present for public types and APIs; OpenAPI
    docs updated.
- CI MUST run unit/integration on PRs; nightly SHOULD run broader suites
  (mocked E2E, visual).
- Releases MUST follow the release checklist and document changes.

## Governance

- Authority: This Constitution supersedes conflicting team conventions.
- Amendments: Propose via PR with an RFC under `docs/rfc/` describing the
  motivation, impact, migration, and rollback. Approval by Engineering Lead and
  Product Owner REQUIRED.
- Versioning Policy (this document):
  - MAJOR: Incompatible governance changes or principle removals/redefinitions.
  - MINOR: New principle/section or materially expanded guidance.
  - PATCH: Clarifications, wording, typo fixes without semantic change.
- Compliance Reviews: Code reviews MUST include a Constitution Check. Periodic
  audits SHOULD occur quarterly or before major releases.
- Runtime Guidance: See `docs/testing/strategy.md`, `docs/ops/release-checklist.md`,
  and `docs/policy/timesheet-ssot.md` for operational details.

**Version**: 1.1.0 | **Ratified**: TODO(RATIFICATION_DATE): set when approved | **Last Amended**: 2025-10-22
<!-- Example: Version: 2.1.1 | Ratified: 2025-06-13 | Last Amended: 2025-07-16 -->

