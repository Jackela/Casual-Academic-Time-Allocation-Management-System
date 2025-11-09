# Tasks: Frontend EA Compliance Wiring

## Phase 1 — Setup

- [ ] T001 Confirm feature branch and spec locations
- [ ] T002 Ensure local run scripts target Docker network api:8080 for E2E

## Phase 2 — Foundational

- [x] T003 Implement service `getMyTimesheets()` in frontend/src/services/timesheets.ts
- [x] T004 Implement service `getMyPendingTimesheets()` in frontend/src/services/timesheets.ts
- [x] T005 Implement service `confirmTimesheet(id: number)` in frontend/src/services/timesheets.ts
- [x] T006 Implement service `getApprovalHistory(timesheetId: number)` in frontend/src/services/timesheets.ts
- [x] T007 Implement service `getPendingApprovals()` in frontend/src/services/timesheets.ts
- [x] T008 [P] Add unit tests for services in frontend/src/services/timesheets.test.ts

## Phase 3 — US1: Tutor sees only own timesheets (P1)

- [x] T009 [US1] Wire TutorDashboard to use `getMyTimesheets()` in frontend/src/components/dashboards/TutorDashboard/hooks/useTutorDashboardViewModel.ts
- [x] T010 [P] [US1] Add/adjust tests asserting dashboard calls /api/timesheets/me in frontend/src/components/dashboards/TutorDashboard/TutorDashboard.test.tsx

## Phase 4 — US2: Explicit Tutor confirmation before approval (P1)

- [x] T011 [US2] Centralize confirm→approve in shared handler in frontend/src/components/shared/TimesheetTable/TimesheetTable.tsx
- [x] T012 [US2] Use `confirmTimesheet(id)` prior to any Lecturer approval action in the shared handler
- [x] T013 [P] [US2] Update/extend tests to verify POST /api/approvals (TUTOR_CONFIRM) precedes any Lecturer approval request in frontend/src/components/shared/TimesheetTable/TimesheetTable.test.tsx

## Phase 5 — US3: Approval History in Timesheet Detail (P2)

- [x] T014 [US3] Create ApprovalHistory section component in frontend/src/components/shared/TimesheetDetail/ApprovalHistory.tsx
- [x] T015 [US3] Integrate ApprovalHistory into Timesheet detail view in frontend/src/components/shared/TimesheetDetail/TimesheetDetailView.tsx
- [x] T016 [US3] Wire `getApprovalHistory(timesheetId)` to render audit entries (actor, action, comment, timestamp)
- [x] T017 [P] [US3] Add component tests for history rendering in frontend/src/components/shared/TimesheetDetail/ApprovalHistory.test.tsx

## Phase 6 — US4: Approver pending queues (P2)

- [ ] T018 [US4] Lecturer pending list uses `getMyPendingTimesheets()` in frontend/src/components/dashboards/LecturerDashboard/hooks/useLecturerDashboardData.ts
- [x] T018 [US4] Lecturer pending list uses `getMyPendingTimesheets()` in frontend/src/components/dashboards/LecturerDashboard/hooks/useLecturerDashboardData.ts
- [x] T019 [US4] Admin/HR pending list uses `getPendingApprovals()` in frontend/src/components/dashboards/AdminDashboard/hooks/useAdminDashboardData.ts
- [x] T020 [P] [US4] Add/adjust tests asserting correct pending endpoints per role in frontend/src/components/dashboards/AdminDashboard/AdminDashboard.test.tsx and Lecturer equivalents
 - [ ] T024 [P] [US4] Verify pending empty-states and role labels for Lecturer and Admin/HR in frontend/src/components/dashboards/LecturerDashboard/components/__tests__/PendingList.test.tsx and frontend/src/components/dashboards/AdminDashboard/AdminDashboard.test.tsx (assert no cross-role leakage)

## Final Phase — Polish & Cross-Cutting

- [x] T021 Review error/empty/loading states for new calls across updated components
- [x] T022 Update documentation quickstart at specs/004-frontend-ea-compliance/quickstart.md
- [ ] T023 Run unit/E2E suites and attach artifacts to PR
 - [x] T025 [P] Add UX copy check for “Already confirmed” toast and pending empty-state messages to ensure consistency across roles

## Dependencies & Order

- Phase 2 (services) → Phase 3–6 (feature wiring)
- US1 and US2 are independent once services exist; US3 and US4 can proceed in parallel after services

## Parallel Execution Examples

- T003–T007 can be implemented sequentially; T008 (tests) in parallel
- T014–T017 (history UI) can run in parallel with T018–T020 (pending queues) after services

## Implementation Strategy

- Implement services first, then minimally wire the three core areas
- Prefer incremental UI updates with tests to pin endpoint usage and flow
