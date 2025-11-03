# Tasks: Timesheet Quote‑then‑Create Workflow

## Phase 1 — Setup

- [ ] T001 [P] Add API constants for EA endpoints in frontend/src/types/api.ts (TIMESHEETS.ME, TIMESHEETS.CONFIRM, TIMESHEETS.PENDING_APPROVAL, APPROVALS.HISTORY, APPROVALS.PENDING)
- [ ] T002 [P] Refactor services to use API_ENDPOINTS constants (frontend/src/services/timesheets.ts)

## Phase 2 — Foundational

- [x] T003 [P] Wire lecturer assignments fetch to restrict Tutor/Course pickers (frontend/src/components/dashboards/LecturerDashboard/components/LecturerTimesheetCreateModal.tsx)
- [x] T004 Add generic inline error presenter to create modal/form (frontend/src/components/dashboards/LecturerDashboard/components/LecturerTimesheetCreateModal.tsx)

## Phase 3 — US1: Create modal opens (P1)

- [x] T005 [US1] Ensure “Create Timesheet” opens modal and is keyboard accessible (frontend/src/components/dashboards/LecturerDashboard/LecturerDashboardShell.tsx)
- [x] T006 [US1] Trap focus and provide ESC to close; return focus to trigger (frontend/src/components/dashboards/LecturerDashboard/components/LecturerTimesheetCreateModal.tsx)

## Phase 4 — US2: Quote updates form (P1)

- [ ] T007 [US2] Debounce (≈300ms) + cancel in‑flight quote calls on change (frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx)
- [ ] T008 [US2] Call TimesheetService.quoteTimesheet on relevant field changes (taskType, deliveryHours, qualification, isRepeat, sessionDate) (frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx)
- [ ] T009 [US2] Enforce EA constraints: set deliveryHours to quoted value and lock read‑only when mandated (frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx)
- [x] T010 [US2] Populate associated/payable read‑only fields and show formula/clause (frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx)

## Phase 5 — US3: Submit after quote (P1)

- [x] T011 [US3] Re‑quote on submit if critical fields changed since last quote (frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx)
- [ ] T012 [US3] Submit create via TimesheetService.createTimesheet with EA‑consistent values (frontend/src/components/dashboards/LecturerDashboard/components/LecturerTimesheetCreateModal.tsx)
- [ ] T013 [US3] Refresh list and show success toast after create (frontend/src/components/dashboards/LecturerDashboard/LecturerDashboardShell.tsx)

## Phase 6 — US4: Error UX (P2)

- [x] T014 [US4] Map 403 to guidance: “Creation failed: you are not assigned to this course or tutor.” (frontend/src/components/dashboards/LecturerDashboard/components/LecturerTimesheetCreateModal.tsx)
- [ ] T015 [US4] Map 400 VALIDATION_FAILED to inline field message; focus offending field (frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx)

## Final Phase — Polish & Cross‑Cutting

- [ ] T016 Add empty‑state when no assignments are available; disable Submit (frontend/src/components/dashboards/LecturerDashboard/components/LecturerTimesheetCreateModal.tsx)
- [x] T017 Add telemetry hooks (debug level) for quote latency and create failures (frontend/src/services/api-secure.ts)

## Additional Validation & Hardening

- [ ] T018 [US1] Measure click→open time (≤200ms) and assert in component/E2E test (LecturerTimesheetCreateModal)
- [ ] T019 [P] Update unit tests referencing hardcoded service URLs to use API_ENDPOINTS (frontend/src/services/*.test.ts)
- [x] T020 [US2] Block Submit if last quote failed; show inline error + “Retry quote” (frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx)
- [ ] T021 Handle assignments load failure: show non‑blocking warning and Retry; keep Submit disabled if no valid selection (frontend/src/components/dashboards/LecturerDashboard/components/LecturerTimesheetCreateModal.tsx)

## Dependencies & Order

- Setup → Foundational → US1 → US2 → US3 → US4 → Polish

## Parallel Execution Examples

- T001–T002 can run in parallel with T003 (different files)
- T007–T010 can be implemented sequentially within the same form file; T011–T013 follow

## Implementation Strategy

- Implement Setup (constants, refactors), then unblock US1 (modal), then add Quote flow (US2), then submit (US3), finally error UX (US4) and polish.
