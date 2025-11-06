# Tasks: Create Timesheet UI Unblock & Quote‑Then‑Create Alignment

## Phase 1 — Setup
- [X] T001 Verify API constants for quote/create in frontend/src/types/api.ts
- [X] T002 Ensure TimesheetService uses API_ENDPOINTS in frontend/src/services/timesheets.ts

## Phase 2 — Foundational
- [X] T003 Mount LecturerTimesheetCreateModal unconditionally; unify open/close state in frontend/src/components/dashboards/LecturerDashboard/LecturerDashboardShell.tsx
- [X] T004 Wire loading‑state "Create Timesheet" button onClick to open modal in frontend/src/components/dashboards/LecturerDashboard/LecturerDashboardShell.tsx
- [X] T005 Fix ARIA on Create button (aria-haspopup/aria-controls) in frontend/src/components/dashboards/LecturerDashboard/LecturerDashboardShell.tsx
- [X] T006 Add stable id/role to modal container in frontend/src/components/dashboards/LecturerDashboard/components/LecturerTimesheetCreateModal.tsx
- [ ] T007 Fetch lecturer assignments and restrict Tutor/Course pickers in frontend/src/components/dashboards/LecturerDashboard/components/LecturerTimesheetCreateModal.tsx

## Phase 3 — User Story 1 (P1)
- [X] T008 [US1] Implement focus trap, ESC close, and focus restore in frontend/src/components/dashboards/LecturerDashboard/components/LecturerTimesheetCreateModal.tsx
- [X] T009 [US1] Ensure click→open path is stable (≤200ms) in frontend/src/components/dashboards/LecturerDashboard/LecturerDashboardShell.tsx

## Phase 4 — User Story 2 (P1)
- [X] T010 [US2] Debounce (≈300ms) + cancel inflight quote calls in frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx
- [X] T011 [US2] Trigger quote on taskType, deliveryHours, qualification, isRepeat, sessionDate in frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx
- [X] T012 [US2] Enforce EA constraints; lock deliveryHours; populate associated/payable + policy summary in frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx

## Phase 5 — User Story 3 (P1)
- [X] T013 [US3] Re‑quote on submit if critical fields changed since last quote; block submit until success in frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx
- [X] T014 [US3] Submit EA‑consistent values and refresh success state in frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx

## Phase 6 — User Story 4 (P2)
- [X] T015 [US4] Map 403 to assignment guidance message in frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx
- [X] T016 [US4] Map 400 VALIDATION_FAILED to inline field error and focus in frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx

## Final Phase — Polish & Cross‑Cutting
- [ ] T017 Empty‑state when no assignments; disable Submit; Retry load in frontend/src/components/dashboards/LecturerDashboard/components/LecturerTimesheetCreateModal.tsx
- [ ] T018 [P] Add non‑PII telemetry for quote latency and create outcomes in frontend/src/services/api-secure.ts
- [ ] T019 [P] Replace any hardcoded URLs in tests to use API_ENDPOINTS in frontend/e2e/utils/api-client.ts
- [ ] T020 Update quickstart with acceptance checks in specs/001-fix-create-timesheet/quickstart.md

## Phase X — E2E Determinism (Backend)
- [ ] T021 [US1] Add Playwright perf spec asserting click→dialog focus ≤200ms in frontend/e2e/real/lecturer/lecturer-create-timesheet.perf.spec.ts
- [ ] T022 Create consolidated seeder E2EFullWorkflowSeeder with @Profile({"e2e","e2e-local","test"}) in backend/src/main/java/com/usyd/catams/e2e/E2EFullWorkflowSeeder.java
- [ ] T023 Ensure seeder idempotency and seed users/courses/assignments in backend/src/main/java/com/usyd/catams/e2e/E2EFullWorkflowSeeder.java
- [ ] T024 Seed minimal EA policy/rate tables required by quote flow in backend/src/main/java/com/usyd/catams/e2e/E2EFullWorkflowSeeder.java
- [ ] T025 Document seeded credentials and data in specs/001-fix-create-timesheet/quickstart.md

## Dependencies
- Phase order: Setup → Foundational → US1 → US2 → US3 → US4 → Polish
- US2 depends on modal availability from US1 only for entry; quote logic independent of dashboard state

## Parallel Opportunities
- T018 and T019 can run in parallel with other tasks (separate files)
- Within a file, tasks run sequentially; avoid overlapping edits

## Implementation Strategy
- MVP first: US1 (modal reliably opens, a11y). Then US2 (quote), US3 (submit), US4 (errors)
- Keep UI responsive; block submit only when necessary; surface actionable messages
