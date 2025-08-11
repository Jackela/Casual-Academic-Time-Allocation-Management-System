# CATAMS - Casual Academic Time Allocation Management System (Baseline v1)

CATAMS manages timesheets and approval workflows for Tutors, Lecturers, and Admins. Baseline v1 documents the current monolithic backend (Spring Boot + DDD) and React frontend. This README is human-oriented and comprehensive. For AI-oriented deep context, see `PROJECT_DOCS.md`.

## Features

- Timesheet lifecycle: create, update, submit, review, approve, reject
- Role-based access with JWT (Tutor, Lecturer, Admin)
- Validation with Single Source of Truth (SSOT) for thresholds (hours, rates)
- Dashboards and summaries per role
- End-to-end automated testing (unit, integration, E2E)

## Service Architecture Overview

```mermaid
graph TD
  U["Users (Tutor / Lecturer / Admin)"] --> FE["Frontend (React + TypeScript)"]
  FE --> API["Backend API (Spring Boot Monolith)"]
  API --> SEC["Security (JWT, Spring Security)"]
  API --> CTRL["Controllers (/api/*)"]
  CTRL --> APP["Application Services"]
  APP --> MAP["Mappers (DTO <-> Entity)"]
  APP --> DOM["Domain Layer\n- Entities (Timesheet, User)\n- Value Objects (Money)\n- ApprovalStateMachine"]
  DOM --> REPO["Repositories (Spring Data JPA)"]
  REPO --> DB["PostgreSQL (Testcontainers for IT)"]
  API --> EX["GlobalExceptionHandler (error mapping)"]
```

### Timesheet Approval Sequence (Happy Path)

```mermaid
sequenceDiagram
  participant T as Tutor
  participant FE as Frontend
  participant API as Backend API
  participant SVC as Application Service
  participant DOM as Domain (ApprovalStateMachine)
  participant DB as PostgreSQL

  T->>FE: Fill timesheet and submit
  FE->>API: POST /api/timesheets
  API->>SVC: validate & map
  SVC->>DOM: apply business rules
  DOM-->>SVC: status = PENDING_TUTOR_REVIEW
  SVC->>DB: persist timesheet
  API-->>FE: 201 Created (status=PENDING_TUTOR_REVIEW)

  FE->>API: POST /api/approvals/{id}/approve (lecturer)
  API->>SVC: execute transition
  SVC->>DOM: next status
  DOM-->>SVC: status = APPROVED_BY_LECTURER_AND_TUTOR or FINAL_APPROVED
  SVC->>DB: update status
  API-->>FE: 200 OK (status=FINAL_APPROVED)
```

### Domain Model (Core)

```mermaid
classDiagram
  class Timesheet {
    Long id
    Long tutorId
    Long courseId
    WeekPeriod weekPeriod
    BigDecimal hours
    BigDecimal hourlyRate
    String description
    ApprovalStatus status
    LocalDateTime createdAt
    LocalDateTime updatedAt
  }
  class WeekPeriod { LocalDate startDate }
  class Money { BigDecimal amount, String currency }

  Timesheet --> WeekPeriod
```

## Project Structure

```mermaid
graph TD
  A[Root]
  A --> B[src/main/java/com/usyd/catams]
  B --> B1[controller]
  B --> B2[service]
  B --> B3[repository]
  B --> B4[entity]
  B --> B5[dto/response]
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
  S --> S3[test-backend-unit-select.js]
  S --> S4[test-backend-integration-select.js]
  S --> S5[test-frontend-unit.js]
  S --> S6[test-frontend-contract.js]
  S --> S7[test-frontend-e2e.js]
  S --> S8[run-e2e.js]
```

## Technology Stack

- Backend: Java 21, Spring Boot 3, Spring Security (JWT), Spring Data JPA, PostgreSQL
- Domain: DDD-aligned aggregates and state machines (ApprovalStateMachine), value objects (Money)
- Frontend: React 18, TypeScript, Vite, Axios, Playwright, Vitest
- Testing: JUnit 5, Testcontainers; Node-based orchestration

## Getting Started

### Prerequisites

- Java 21+, Node.js 18+, Docker (for integration tests)

### Run Backend (dev)

```bash
./gradlew bootRun
```

### Run Frontend (dev)

```bash
cd frontend && npm install && npm run dev
```

## Testing

### Full suites

```bash
node scripts/test-backend-unit.js
node scripts/test-backend-integration.js
node scripts/test-frontend-unit.js
node scripts/test-frontend-contract.js
node scripts/run-e2e.js --project=all
```

### Selective (faster iteration)

```bash
node scripts/test-backend-unit-select.js --tests="*TimesheetServiceUnitTest*"
node scripts/test-backend-integration-select.js --tests="*TimesheetIntegrationTest*"
node scripts/test-frontend-unit-select.js --pattern="auth.*.spec"
```

### Reports

- Backend JUnit XML: `build/test-results/test/`
- Backend JSON summaries: `results/ut-summary.json`, `results/it-summary.json`
- Frontend Vitest JSON: `frontend/coverage/test-results.json`
- Playwright JSON: `frontend/playwright-report/results.json`

## Configuration & Profiles

- Profiles: `application.yml`, `application-integration-test.yml`
- Validation thresholds via `TimesheetValidationProperties` (hours/rates)
- DB: PostgreSQL (Testcontainers for IT), H2 fallback when configured

## API Overview

- OpenAPI specs: `docs/openapi/`
- Status enum baseline: `DRAFT`, `PENDING_TUTOR_REVIEW`, `APPROVED_BY_TUTOR`, `APPROVED_BY_LECTURER_AND_TUTOR`, `FINAL_APPROVED`, `REJECTED`, `MODIFICATION_REQUESTED`

## Orchestration Notes

- All one-shot Node scripts emit `[TASK_DONE]` and exit non-interactively.
- Windows: Gradle is invoked via `cmd /d /s /c call gradlew.bat ...` (handled by scripts).

## Baseline

- Version: v1
- Date: 2025-08-11
- Scope: This README reflects the current monolith implementation. Future or experimental docs under `docs/` are reference-only unless explicitly adopted.