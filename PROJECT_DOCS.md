## Project Overview (Baseline v1)

CATAMS (Casual Academic Time Allocation Management System) manages timesheets and approval workflows for Tutors, Lecturers, and Admins. Backend: Spring Boot (DDD-oriented). Frontend: React/Vite with Playwright E2E. Orchestration: Node scripts.

## Project Structure

```mermaid
graph TD
  A[Root]
  A --> B[src/main/java/com/usyd/catams]
  B --> B1[controller]
  B --> B2[application]
  B --> B3[domain/common]
  B --> B4[entity]
  B --> B5[repository]
  B --> B6[enums]
  B --> B7[config/security]
  A --> C[src/test/java/com/usyd/catams]
  C --> C1[unit]
  C --> C2[integration]
  C --> C3[repository]
  A --> D[frontend]
  D --> D1[src]
  D --> D2[e2e]
  D --> D3[playwright.config.ts]
  D --> D4[vitest.config.ts]
  A --> S[scripts]
  S --> S1[test-backend-unit.js]
  S --> S2[test-backend-integration.js]
  S --> S3[test-frontend-unit.js]
  S --> S4[test-frontend-contract.js]
  S --> S5[test-frontend-e2e.js]
  S --> S6[run-e2e.js]
```

## Core Components & Logic

- ApprovalStateMachine
  - Purpose: SSOT for approval transitions.
  - Key transitions: DRAFT → SUBMIT → PENDING_TUTOR_REVIEW → APPROVED_BY_TUTOR → FINAL_APPROVAL → APPROVED_BY_LECTURER_AND_TUTOR → HR APPROVE → FINAL_APPROVED; REJECT/REQUEST_MODIFICATION where applicable.

- Timesheet (Aggregate Root)
  - Invariants: week starts Monday; hours/rate thresholds validated; monetary precision preserved.
  - Key methods: submitForApproval, approve, finalApprove, reject, requestModification.

- GlobalExceptionHandler
  - Maps business errors to 400; auth/access 401/403; unknown 500.

## Testing (Baseline v1 — 2025-08-11)

- Backend
  - Unit: PASS
  - Integration (Testcontainers PostgreSQL, profile=integration-test): PASS
- Frontend
  - Unit (Vitest): 104/104 PASS → `frontend/coverage/test-results.json`
  - Contract/API (Vitest): 17/17 PASS → `frontend/coverage/test-results.json`
  - E2E (Playwright, all projects): 54/54 PASS → `frontend/playwright-report/results.json`

## Orchestration Rules

- Node-only scripts; non-interactive; always print `[TASK_DONE]`.
- Windows-safe Gradle: `cmd /d /s /c call gradlew.bat ...`.
- SSOT for params: `scripts/test.params.json`, `frontend/scripts/e2e.params.json`.
- Playwright JSON reporter configured in `frontend/playwright.config.ts`.
- Tests avoid magic values: enum names over raw strings; BigDecimal via `compareTo`; thresholds injected from properties.

## How to Run

- Backend Unit: `node scripts/test-backend-unit.js`
- Backend Integration: `node scripts/test-backend-integration.js`
- Frontend Unit: `node scripts/test-frontend-unit.js`
- Frontend Contract: `node scripts/test-frontend-contract.js`
- Frontend E2E (ui/mobile/all): `node scripts/run-e2e.js --project=ui|mobile|all`
- Full layered: `node scripts/test-all.js`

## Report Locations

- Backend JSON summaries: `results/ut-summary.json`, `results/it-summary.json`
- Frontend Vitest JSON: `frontend/coverage/test-results.json`
- Playwright JSON: `frontend/playwright-report/results.json`

## Design Principles (Concise)

- DDD with high cohesion, low coupling; controllers thin; services orchestrate; domain enforces invariants.
- Design by Contract; fail fast; exhaustive enum handling; no secrets in code.
- SSOT for rules and configuration; composition over inheritance.

## VCS Ignore Rules (Baseline v1)

- Do not commit build caches, generated artifacts, or local assistant/IDE caches.
- Ignored paths (root or nested):
  - .gradle/
  - node_modules/ (any depth)
  - build/, target/
  - dist/ (including frontend/dist)
  - .cache/
  - generated/
  - out/
  - coverage/
  - logs/
  - .cursor/, .claude/, .gemini/, .bamd/

## Baseline

- Version: v1
- Date: 2025-08-11
- Scope: This document reflects the current green baseline. Future, exploratory, or microservices-oriented documents are marked as "future (not adopted in baseline v1)" to avoid confusion.


