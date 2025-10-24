# Tasks — CATAMS E2E Refactor (Playwright + POM)

Feature: CATAMS E2E Refactor and Full Coverage

## Phase 1 — Setup

Goal: Establish stable E2E execution primitives, environment, and scripting.

Independent Test Criteria:
- Playwright real project launches, authenticates programmatically, and runs a no-op spec.
- New npm scripts filter tagged specs correctly (`@p0`, `@p1`, `@neg`).

Implementation Tasks
- [X] T001 Add waits utility with stable predicates in frontend/e2e/shared/utils/waits.ts
- [X] T002 Update frontend/package.json: add scripts `test:e2e:p0`, `test:e2e:p1`, `test:e2e:p2`, `test:e2e:approvals`
- [X] T003 Document required env in specs/main/quickstart.md (E2E_BACKEND_URL, E2E_FRONTEND_URL, E2E_* credentials)
- [X] T004 Create lightweight API seed helpers (if needed) in frontend/e2e/shared/utils/api.ts

## Phase 2 — Foundational

Goal: Stabilize selectors and POMs; prepare UI for testability using data-testid.

Independent Test Criteria:
- All POM methods rely only on `getByTestId` and pass smoke interactions without brittle selectors.
- UI exposes canonical test IDs listed in plan; no `waitForTimeout` present in new specs.

Implementation Tasks
- [X] T005 [P] Add POM: LecturerDashboardPage in frontend/e2e/shared/pages/dashboard/LecturerDashboardPage.ts
- [X] T006 [P] Add POM: TutorDashboardPage (refactor/extend) in frontend/e2e/shared/pages/dashboard/TutorDashboardPage.ts
- [X] T007 [P] Add POM: AdminUsersPage (extend) in frontend/e2e/shared/pages/admin/AdminUsersPage.ts
- [X] T008 [P] Add POM: TimesheetCreatePage in frontend/e2e/shared/pages/timesheet/TimesheetCreatePage.ts
- [X] T009 [P] Add POM: TimesheetDetailPage in frontend/e2e/shared/pages/timesheet/TimesheetDetailPage.ts
- [X] T010 Add canonical data-testid to Lecturer open/create modal in frontend/src/components/dashboards/LecturerDashboard/components/LecturerTimesheetCreateModal.tsx
- [X] T011 Add open-create button testid in frontend/src/components/dashboards/LecturerDashboard/LecturerDashboardShell.tsx
- [X] T012 Add status chip and row/button testids in frontend/src/components/shared/TimesheetTable/TimesheetTable.tsx
- [X] T013 Add admin users page testids in frontend/src/features/admin-users/AdminUsersPage.tsx
- [X] T014 Map toast severities to `toast-success`/`toast-error` in frontend/src/components/shared/NotificationPresenter/NotificationPresenter.tsx

## Phase 3 — [US1] Admin creates Tutor user (P0)

Story Goal: As an Admin, I can create a Tutor user with a secure password and see it listed; I can set qualification if supported and toggle activation idempotently.

Independent Test Criteria:
- Creating a Tutor via UI yields 201 API with `UserResponse` shape; success toast visible; row appears in `admin-users-table`.
- Deactivate → Activate toggles reflect immediately and idempotently; PATCH responses 200 with consistent state.

Implementation Tasks
- [X] T015 [US1] Create @p0 spec admin-user-lifecycle in frontend/e2e/real/admin/admin-user-lifecycle.spec.ts
- [X] T016 [P] [US1] Add API assertion helpers for users in frontend/e2e/real/api/users.contract.helpers.ts
  Artifacts: frontend/e2e/real/admin/admin-user-lifecycle.spec.ts

Preconditions (authoritative)
- Programmatic-only authentication for E2E: use `frontend/e2e/api/auth-helper.ts#programmaticLoginApi('ADMIN')` as SSOT.
- Each spec MUST bind its own `storageState` and must not fall back to UI login.
- Required environment variables present (root or `frontend/.env.e2e`):
  - `E2E_BACKEND_URL`, `E2E_FRONTEND_URL`
  - `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`
- Canonical routes & API:
  - UI route: `/admin/users`
  - API: `POST /api/users` (create), `PATCH /api/users/{id}/activation` (toggle), `GET /api/auth/whoami` (preferred), fallbacks `GET /api/users/me` or `GET /api/me`.

Password Policy (must-document, align with SSOT)
- Minimum length ≥ 8; must include at least 1 uppercase, 1 lowercase, 1 digit, and 1 symbol.
- Client validates and shows helpful error; server enforces and returns 422 with error schema on violation.

UI Canonical testids (US1 subset)
- `admin-users-table`, `admin-user-create-btn`, `admin-user-qualification-select`
- Activation: `admin-user-activate-btn` OR `admin-user-deactivate-btn` (one visible depending on state)
- Status: `status-chip-active` / `status-chip-inactive`
- Toasts: `toast-success`, `toast-error`

Success Outputs (explicit)
- Toast success (`toast-success`) appears with content like "User created" (email may be redacted in UI/tests).
- Table `admin-users-table` includes a row for the new user with expected columns: email, role, status, actions.
- API responses meet SSOT schemas (`docs/openapi/paths/users.yaml`, `docs/openapi/schemas/users.yaml`).

Negative & Recovery Scenarios
- Weak password → 422 with error schema; UI shows `toast-error` and inline messages as applicable; form remains populated for retry.
- Duplicate email → 409 (or SSOT-defined) with error schema; `toast-error` visible; admin can correct and resubmit.
- Network/backend error (5xx) → `toast-error`; no duplicate row added; admin can retry.

Toggle Semantics (idempotency)
- Two successive PATCH toggles return 200 each time; UI label and status chip change each time accordingly.
- If server returns both `isActive` and `active`, UI treats either true as active. If both missing, default to inactive.

Non-Functional Requirements (NFR)
- No `waitForTimeout`; use explicit waits (`waits.ts`) and optional `whoami` readiness where available.
- Programmatic-only auth; per-spec isolated `storageState`; JWT/cookie handling must not leak across specs.
- Observability: emit structured logs/console markers on create/toggle success/failure for troubleshooting.

Dependencies & SSOT
- OpenAPI SSOT: `docs/openapi.yaml` with component files under `docs/openapi/paths/*.yaml` and `docs/openapi/schemas/*.yaml` (users, auth).
- US1 is prerequisite for US2–US5; contract and selector baselines are reused.

## Phase 4 — [US2] Lecturer creates Timesheet (P0)

Story Goal: As a Lecturer, I can open create modal and submit instructional fields only; backend derives financials.

Independent Test Criteria:
- POST /api/timesheets request excludes calculated fields; response 201 `TimesheetResponse` with DRAFT or PENDING status.
- New row visible in lecturer table with `status-chip-{id}`; no forbidden fields present in request.

Implementation Tasks
- [ ] T017 [US2] Create @p0 spec lecturer-create-timesheet in frontend/e2e/real/lecturer/lecturer-create-timesheet.spec.ts
- [ ] T018 [P] [US2] Capture and assert request/response against SSOT in frontend/e2e/real/api/timesheets.contract.spec.ts

## Phase 5 — [US3] Tutor confirms (P0)

Story Goal: As a Tutor, I can confirm an assigned draft (or submit then confirm) and see UI state update.

Independent Test Criteria:
- Approval action `TUTOR_CONFIRM` returns `ApprovalActionResponse` with newStatus `TUTOR_CONFIRMED`; UI shows chip/state.

Implementation Tasks
- [ ] T019 [US3] Create @p0 spec tutor-confirmation in frontend/e2e/real/tutor/tutor-confirmation.spec.ts

## Phase 6 — [US4] Lecturer approves (P0)

Story Goal: As a Lecturer, I can approve a tutor-confirmed item.

Independent Test Criteria:
- Action `LECTURER_CONFIRM` transitions to `LECTURER_CONFIRMED` and UI status chip updates; activity log reflects action.

Implementation Tasks
- [ ] T020 [US4] Create @p0 spec lecturer-approve in frontend/e2e/real/lecturer/lecturer-approve.spec.ts

## Phase 7 — [US5] Admin final approval (P0)

Story Goal: As an Admin, I can perform final approval; terminal state is persisted and visible.

Independent Test Criteria:
- Action `HR_CONFIRM` transitions to `FINAL_CONFIRMED`; GET by ID matches `TimesheetResponse` with final status.

Implementation Tasks
- [ ] T021 [US5] Create @p0 spec admin-final-approve in frontend/e2e/real/admin/admin-final-approve.spec.ts

## Phase 8 — [US6] Permission negatives (P0 @neg)

Story Goal: Tutor cannot initiate creation; deep-link blocked; API creation forbidden.

Independent Test Criteria:
- No `lecturer-create-open-btn` for Tutor; visiting create route redirects/denies; API POST returns 403/401 with error schema.

Implementation Tasks
- [ ] T022 [US6] Create @p0 @neg spec tutor-cannot-create in frontend/e2e/real/permissions/tutor-cannot-create.spec.ts

## Phase 9 — [US7] Modify and reject workflow (P1)

Story Goal: Lecturer/Admin can request modifications; Tutor re-submits; audit trail records bounce.

Independent Test Criteria:
- State transitions to `MODIFICATION_REQUESTED` then forward; UI shows audit entries.

Implementation Tasks
- [ ] T023 [US7] Create @p1 spec timesheet-modify-and-reject in frontend/e2e/real/timesheets/timesheet-modify-and-reject.spec.ts

## Phase 10 — [US8] Timesheet contracts (P0)

Story Goal: Guard contracts for create/update/quote against regression using OpenAPI SSOT.

Independent Test Criteria:
- Requests validated to exclude calculated fields; responses validated for schema and codes (201/200/400-422/401).

Implementation Tasks
- [ ] T024 [US8] Extend contracts for timesheets in frontend/e2e/real/api/timesheets.contract.spec.ts

## Final Phase — Polish & Cross-Cutting

Goal: Remove obsolete tutor self-create flows; ensure tags and CI shards are green and flakes triaged.

Independent Test Criteria:
- No failing/flaky specs over 3 consecutive CI runs; legacy specs removed; shards pass with retries=1.

Implementation Tasks
- [ ] T025 Remove tutor self-create paths in frontend/e2e/real/workflows/ea-billing-compliance.spec.ts
- [ ] T026 Add shard docs and CI hints in specs/main/research.md

## Dependencies (Story Order)
- US1 → US2 → US3 → US4 → US5
- US6 independent; US7 depends on US2/US3 baseline; US8 parallel to all (contracts).

## Parallel Execution Examples
- [P] T005–T009 POMs can be built in parallel.
- [P] T010–T014 UI testid additions can be parallelized by file owners.
- [P] T016, T018 contract helpers/specs can be implemented in parallel with UI specs.

## Implementation Strategy
- MVP: US1 only (Admin can create Tutor); validates end-to-end auth + basic UI wiring.
- Incremental: Land Foundational and US2–US5 chain to enable full approval loop; follow with US6 negatives and US7 bounce.
