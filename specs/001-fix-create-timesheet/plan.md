# Implementation Plan: Create Timesheet UI Unblock & Quote‑Then‑Create Alignment

**Branch**: `001-fix-create-timesheet` | **Date**: 2025-11-04 | **Spec**: specs/001-fix-create-timesheet/spec.md
**Input**: Feature specification from `specs/001-fix-create-timesheet/spec.md`

## Summary

Unblock the “Create Timesheet” entry regardless of dashboard loading state, enforce EA Quote‑then‑Create (debounced quote + inflight cancel, submit gating, read‑only constraints), improve error UX (403 guidance, 400 field‑level), and ensure modal a11y (focus trap, ESC, focus restore). E2E determinism via test profile and seed.

## Technical Context

**Language/Version**: Frontend TypeScript (ES2020+), Backend Java 17 (Spring Boot)  
**Primary Dependencies**: React + Vite; Spring Web; Playwright; Vitest  
**Storage**: PostgreSQL (docker) in normal runs; e2e-local uses H2/in‑memory paths for selected flows  
**Testing**: Vitest (unit), Playwright (E2E), JUnit on backend  
**Target Platform**: Dockerized services (db/api/web) + host browser  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: Modal open ≤ 200ms; ≥90% quote latency ≤ 1.0s  
**Constraints**: Submit blocked until valid quote; accessibility keyboard compliance  
**Scale/Scope**: Single department usage; concurrency low to moderate

### Test Data & Seeding (E2E Determinism)
- Consolidated seeding via `E2EFullWorkflowSeeder` under `@Profile({"e2e","e2e-local","test"})`.
- Seeds idempotently: admin/lecturer/tutor users, at least two active courses, lecturer↔course and tutor↔course assignments, and minimal EA policy/rate tables required by Create/Quote E2E specs.
- Location: `backend/src/main/java/com/usyd/catams/e2e/E2EFullWorkflowSeeder.java`.
- Rationale: Ensure Docker runner owns backend lifecycle and provides consistent data across all  related specs.

## Constitution Check

- Test‑First: Unit + E2E will cover Create/Quote and a11y flows (PASS)
- Observability: Non‑PII telemetry for quote latency and create outcomes (PASS)
- Simplicity: UI state unified; modal mounted consistently; no extraneous abstractions (PASS)
- Breaking changes: None exposed; internal UI only (PASS)

Gate result: PASS. No violations to justify.

## Performance & Observability Measurement Approach
- Modal open time: capture timestamp on click and assert first `role="dialog"` focusable ready within ≤200ms (Playwright perf spec).
- Quote latency: log non‑PII telemetry around `/api/timesheets/quote` request; E2E may assert typical (<1.0s) by measuring fetch duration in test or verifying telemetry counters in mocked logger.

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-create-timesheet/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── spec.md
```

### Source Code (repository root)

```text
backend/
└── src/...

frontend/
├── src/components/dashboards/LecturerDashboard/
│   └── components/LecturerTimesheetCreateModal.tsx
├── src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx
├── src/services/
└── e2e/...
```

**Structure Decision**: Web application; changes localized to frontend components/services and backend e2e/test profile behaviors.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
