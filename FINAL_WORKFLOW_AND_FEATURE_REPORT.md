# FINAL_WORKFLOW_AND_FEATURE_REPORT

## Overview
- The CATAMS platform now enforces Enterprise Agreement (EA) compliance by routing every financial decision through the backend Schedule 1 calculator before persisting or returning data (`/api/timesheets/quote` and `/api/timesheets`, recalculated in the controller) [src/main/java/com/usyd/catams/controller/TimesheetController.java:58](src/main/java/com/usyd/catams/controller/TimesheetController.java:58), [src/main/java/com/usyd/catams/controller/TimesheetController.java:72](src/main/java/com/usyd/catams/controller/TimesheetController.java:72).
- Playwright E2E suites cover real and mocked journeys to prove that UI workflows call the new quote endpoint, send minimal payloads, and honour the approval hierarchy [frontend/e2e/mock/tests/timesheets/quote-calculation-flow.spec.ts:8](frontend/e2e/mock/tests/timesheets/quote-calculation-flow.spec.ts:8), [frontend/e2e/real/workflows/critical-user-journeys.spec.ts:13](frontend/e2e/real/workflows/critical-user-journeys.spec.ts:13), [frontend/e2e/real/workflows/admin-user-management.spec.ts:4](frontend/e2e/real/workflows/admin-user-management.spec.ts:4).
- Seeded Flyway data brings the official Schedule 1 rates (tutorials, lectures, marking) into the database, letting policy lookups run without fallbacks [src/main/resources/db/migration/V13__Seed_schedule1_rates.sql:1](src/main/resources/db/migration/V13__Seed_schedule1_rates.sql:1).

---

## 1. Authentication Flows

### Step-by-step user experience
1. Tutors, lecturers, and admins land on `/login`, complete the email and password fields, and submit; the UI enforces required inputs and displays loading/error states [frontend/e2e/mock/tests/ui/login.ui.spec.ts:5](frontend/e2e/mock/tests/ui/login.ui.spec.ts:5), [frontend/e2e/mock/tests/ui/login.ui.spec.ts:83](frontend/e2e/mock/tests/ui/login.ui.spec.ts:83).
2. The frontend issues `POST /api/auth/login` using the credentials defined in E2E configuration (`Lecturer123!`, `Tutor123!`, `Admin123!` by default) [frontend/e2e/config/e2e.config.ts:24](frontend/e2e/config/e2e.config.ts:24), [frontend/e2e/config/e2e.config.ts:40](frontend/e2e/config/e2e.config.ts:40).
3. On success, the dashboard renders role-aware navigation (e.g., lecturer view asserts `Dr. Jane Smith` in the header) [frontend/e2e/real/workflows/critical-user-journeys.spec.ts:27](frontend/e2e/real/workflows/critical-user-journeys.spec.ts:27).

### Backend guarantees
- `AuthController` exposes the login endpoint and delegates to the user service [src/main/java/com/usyd/catams/controller/AuthController.java:21](src/main/java/com/usyd/catams/controller/AuthController.java:21).
- `SecurityConfig` whitelists `/api/auth/login`, keeps every other route authenticated, and runs stateless JWT enforcement [src/main/java/com/usyd/catams/config/SecurityConfig.java:55](src/main/java/com/usyd/catams/config/SecurityConfig.java:55).
- `UserServiceImpl.authenticate` normalises email, validates passwords via BCrypt, updates `lastLoginAt`, and returns a signed JWT for downstream calls [src/main/java/com/usyd/catams/service/impl/UserServiceImpl.java:60](src/main/java/com/usyd/catams/service/impl/UserServiceImpl.java:60).

---

## 2. Timesheet Creation & EA Calculator

### End-to-end creation flow (Lecturer drafting for a tutor)
1. Lecturer opens the timesheet form (or tutored self-service modal) and supplies course, week start (validated as Monday), delivery hours, qualification, and repeat indicator [frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx:215](frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx:215).
2. As soon as the minimum inputs are present, the form triggers `POST /api/timesheets/quote`, receiving rate code, associated hours, payable hours, hourly rate, and clause reference—which are rendered read-only in the summary panel [frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx:243](frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx:243), [frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx:350](frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx:350).
3. Submit handlers require a loaded quote; the payload forwarded to the parent includes the server-issued calculation, preventing stale figures [frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx:286](frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx:286).
4. `TutorDashboard` (also used by lecturers in management mode) maps the quote to the create/update requests while omitting any manual financial overrides [frontend/src/components/dashboards/TutorDashboard/TutorDashboard.tsx:130](frontend/src/components/dashboards/TutorDashboard/TutorDashboard.tsx:130).
5. The controller recalculates a fresh `Schedule1CalculationResult` (ignoring hours, rate, or amount sent by the client) before delegating to the timesheet application service [src/main/java/com/usyd/catams/controller/TimesheetController.java:78](src/main/java/com/usyd/catams/controller/TimesheetController.java:78).
6. `TimesheetApplicationService.createTimesheet` enforces authorisation (lecturer must teach the course, tutor must hold the TUTOR role), validates uniqueness, and copies the calculator outcome (rate code, payable hours, formula, clause) onto the entity [src/main/java/com/usyd/catams/application/TimesheetApplicationService.java:120](src/main/java/com/usyd/catams/application/TimesheetApplicationService.java:120), [src/main/java/com/usyd/catams/application/TimesheetApplicationService.java:161](src/main/java/com/usyd/catams/application/TimesheetApplicationService.java:161).
7. Persisted records store all EA fields (`taskType`, `isRepeat`, `qualification`, `deliveryHours`, `associatedHours`, `calculatedAmount`, `rateCode`, `calculationFormula`) to act as the new single source of truth [src/main/java/com/usyd/catams/entity/Timesheet.java:76](src/main/java/com/usyd/catams/entity/Timesheet.java:76).

### EA Schedule 1 computation
- `Schedule1Calculator` converts delivery hours to payable hours by adding the policy’s associated-hour entitlement, applies any cap, and multiplies by the hourly rate with two-decimal rounding [src/main/java/com/usyd/catams/service/Schedule1Calculator.java:26](src/main/java/com/usyd/catams/service/Schedule1Calculator.java:26).
- `Schedule1PolicyProvider` resolves policies from the database—partitioned by qualification and repeat flag—falling back only if seed data is missing; it also enforces the seven-day repeat window and clause references [src/main/java/com/usyd/catams/service/Schedule1PolicyProvider.java:62](src/main/java/com/usyd/catams/service/Schedule1PolicyProvider.java:62), [src/main/java/com/usyd/catams/service/Schedule1PolicyProvider.java:90](src/main/java/com/usyd/catams/service/Schedule1PolicyProvider.java:90).
- Flyway `V13__Seed_schedule1_rates.sql` inserts Schedule 1 items TU1–TU4, P01–P04, and M03–M05 with effective periods, session amounts, associated-hour caps, and payable caps, covering 2022–2026 adjustments [src/main/resources/db/migration/V13__Seed_schedule1_rates.sql:24](src/main/resources/db/migration/V13__Seed_schedule1_rates.sql:24), [src/main/resources/db/migration/V13__Seed_schedule1_rates.sql:60](src/main/resources/db/migration/V13__Seed_schedule1_rates.sql:60).
- Automated tests confirm seeded data is honoured: the Spring Boot calculator test asserts TU2 produces 3.0 payable hours and $175.94, while controller integration tests prove `/quote` and `/timesheets` ignore tampered client amounts [src/test/java/com/usyd/catams/service/Schedule1CalculatorTest.java:20](src/test/java/com/usyd/catams/service/Schedule1CalculatorTest.java:20), [src/test/java/com/usyd/catams/controller/TimesheetControllerIntegrationTest.java:89](src/test/java/com/usyd/catams/controller/TimesheetControllerIntegrationTest.java:89), [src/test/java/com/usyd/catams/controller/TimesheetControllerIntegrationTest.java:110](src/test/java/com/usyd/catams/controller/TimesheetControllerIntegrationTest.java:110).

### Frontend guardrails & evidence
- The mock Playwright suite intercepts API calls to verify that delivery-hour edits trigger `/api/timesheets/quote`, that the returned summary is displayed, and that the final `/api/timesheets` request omits `amount`, `associatedHours`, and `payableHours` while retaining the backend result [frontend/e2e/mock/tests/timesheets/quote-calculation-flow.spec.ts:8](frontend/e2e/mock/tests/timesheets/quote-calculation-flow.spec.ts:8).

### Scenario snapshots (Schedule 1 source of truth)
- **Standard tutorial (non-repeat, standard qualification):** TU2 grants 1h delivery + 2h associated (3h payable) at $175.94 session value (Bundled hourly rate ≈ $58.65) [src/main/resources/db/migration/V13__Seed_schedule1_rates.sql:39](src/main/resources/db/migration/V13__Seed_schedule1_rates.sql:39), [src/test/java/com/usyd/catams/controller/TimesheetControllerIntegrationTest.java:99](src/test/java/com/usyd/catams/controller/TimesheetControllerIntegrationTest.java:99).
- **Repeat tutorial (standard qualification):** TU4 caps associated hours at 1h with max payable 2h, reducing the session payment accordingly (seeded rows include 2024–2026 amounts) [src/main/resources/db/migration/V13__Seed_schedule1_rates.sql:41](src/main/resources/db/migration/V13__Seed_schedule1_rates.sql:41).
- The policy provider’s `determineAssociatedHours` clamps associated time against payable caps to prevent double counting—this catches repeat tutorials and any short-delivery edge cases [src/main/java/com/usyd/catams/service/Schedule1PolicyProvider.java:214](src/main/java/com/usyd/catams/service/Schedule1PolicyProvider.java:214).

---

## 3. Timesheet Approval Lifecycle

### Workflow stages
1. **Drafting:** Newly created records start at `DRAFT`, editable by the creator [src/main/java/com/usyd/catams/enums/ApprovalStatus.java:17](src/main/java/com/usyd/catams/enums/ApprovalStatus.java:17).
2. **Submission:** Tutors or lecturers trigger `SUBMIT_FOR_APPROVAL`, moving the sheet to `PENDING_TUTOR_CONFIRMATION`; the frontend batches this action via the REST approval endpoint [src/main/java/com/usyd/catams/enums/ApprovalAction.java:25](src/main/java/com/usyd/catams/enums/ApprovalAction.java:25), [frontend/src/services/timesheets.ts:213](frontend/src/services/timesheets.ts:213).
3. **Tutor confirmation:** Tutors acknowledge accuracy with `TUTOR_CONFIRM`, elevating the status to `TUTOR_CONFIRMED` [src/main/java/com/usyd/catams/enums/ApprovalAction.java:31](src/main/java/com/usyd/catams/enums/ApprovalAction.java:31). Playwright verifies a tutor can confirm a seeded draft without forbidden errors [frontend/e2e/real/workflows/tutor-uat.spec.ts:5](frontend/e2e/real/workflows/tutor-uat.spec.ts:5).
4. **Lecturer confirmation:** Lecturers (or admins) apply `LECTURER_CONFIRM`, sending the timesheet to the HR queue (`LECTURER_CONFIRMED`) [src/main/java/com/usyd/catams/enums/ApprovalAction.java:37](src/main/java/com/usyd/catams/enums/ApprovalAction.java:37).
5. **Final confirmation:** HR/Admins finish with `HR_CONFIRM`, locking the record at `FINAL_CONFIRMED`. The approval controller exposes this API, enforcing role checks through the authentication facade [src/main/java/com/usyd/catams/controller/ApprovalController.java:39](src/main/java/com/usyd/catams/controller/ApprovalController.java:39).
6. **Alternative endings:** `REJECT` and `REQUEST_MODIFICATION` are available at each confirmation stage, while state transitions are validated centrally in `ApprovalStatus.canTransitionTo` [src/main/java/com/usyd/catams/enums/ApprovalStatus.java:131](src/main/java/com/usyd/catams/enums/ApprovalStatus.java:131).

### Evidence
- Cross-role E2E coverage seeds a `PENDING_TUTOR_CONFIRMATION` sheet, has the tutor confirm, simulates lecturer approval, and exercises the admin API to reach `FINAL_CONFIRMED`, asserting the backend state [frontend/e2e/real/workflows/critical-user-journeys.spec.ts:56](frontend/e2e/real/workflows/critical-user-journeys.spec.ts:56).
- Admin-specific workflow test hits `/api/approvals` directly to confirm HR can finalise a `LECTURER_CONFIRMED` entry [frontend/e2e/real/workflows/admin-final-approval.spec.ts:29](frontend/e2e/real/workflows/admin-final-approval.spec.ts:29).

---

## 4. Admin User Management Workflow

### User-facing journey
1. Admin signs in and navigates to `/admin/users`, where the page loads, sorts, and renders existing accounts with accessible table semantics [frontend/e2e/real/workflows/admin-user-management.spec.ts:5](frontend/e2e/real/workflows/admin-user-management.spec.ts:5), [frontend/src/features/admin-users/AdminUsersPage.tsx:43](frontend/src/features/admin-users/AdminUsersPage.tsx:43).
2. Selecting “Add User” opens the creation modal pre-filled with a default temporary password (`ChangeMe123!`), capturing first name, last name, email, role, and password—all bound to local state [frontend/src/features/admin-users/AdminUsersPage.tsx:101](frontend/src/features/admin-users/AdminUsersPage.tsx:101).
3. Submission calls `createUser`, falling back to optimistic updates if the server cannot refresh the list immediately; status and error banners inform the operator of outcomes [frontend/src/features/admin-users/AdminUsersPage.tsx:120](frontend/src/features/admin-users/AdminUsersPage.tsx:120), [frontend/src/features/admin-users/AdminUsersPage.tsx:151](frontend/src/features/admin-users/AdminUsersPage.tsx:151).
4. The Playwright workflow asserts the success toast and verifies the new tutor row appears in the table [frontend/e2e/real/workflows/admin-user-management.spec.ts:34](frontend/e2e/real/workflows/admin-user-management.spec.ts:34).

### Backend enforcement
- `UserController` restricts both list and create endpoints to admins via method-level security [src/main/java/com/usyd/catams/controller/UserController.java:47](src/main/java/com/usyd/catams/controller/UserController.java:47).
- Incoming payloads pass through `UserCreateRequest`, which enforces email format, password complexity, and non-null role [src/main/java/com/usyd/catams/dto/request/UserCreateRequest.java:20](src/main/java/com/usyd/catams/dto/request/UserCreateRequest.java:20).
- `UserServiceImpl.createUser` sanitises inputs, checks for duplicate emails, hashes the password, persists the entity, and returns a trimmed response [src/main/java/com/usyd/catams/service/impl/UserServiceImpl.java:107](src/main/java/com/usyd/catams/service/impl/UserServiceImpl.java:107).
- Frontend adapters merge first/last name into the single `name` field expected by the backend [frontend/src/services/users.ts:23](frontend/src/services/users.ts:23).

---

## 5. Validation & Evidence Matrix

- **Authentication:** Mock UI tests cover success, failure, validation, and loading states; the E2E helper logs in each role against the live backend to populate dashboards [frontend/e2e/mock/tests/ui/login.ui.spec.ts:18](frontend/e2e/mock/tests/ui/login.ui.spec.ts:18), [frontend/e2e/api/auth-helper.ts:64](frontend/e2e/api/auth-helper.ts:64).
- **Schedule 1 Calculator:** Unit tests assert calculator outputs; integration tests enforce controller behaviour; seed migration guarantees coverage for TU*, P0*, M0* codes [src/test/java/com/usyd/catams/service/Schedule1CalculatorTest.java:20](src/test/java/com/usyd/catams/service/Schedule1CalculatorTest.java:20), [src/test/java/com/usyd/catams/controller/TimesheetControllerIntegrationTest.java:89](src/test/java/com/usyd/catams/controller/TimesheetControllerIntegrationTest.java:89).
- **Frontend Quote Contract:** Mocked Playwright run ensures `/quote` is called on delivery-hour edits and that create payloads contain only the EA inputs [frontend/e2e/mock/tests/timesheets/quote-calculation-flow.spec.ts:101](frontend/e2e/mock/tests/timesheets/quote-calculation-flow.spec.ts:101).
- **Approval Lifecycle:** Real Playwright journeys (tutor confirmation, lecturer overview, admin finalisation) span the entire status machine; REST calls verify backend transitions [frontend/e2e/real/workflows/tutor-uat.spec.ts:20](frontend/e2e/real/workflows/tutor-uat.spec.ts:20), [frontend/e2e/real/workflows/critical-user-journeys.spec.ts:56](frontend/e2e/real/workflows/critical-user-journeys.spec.ts:56).
- **Admin User Management:** Full-stack E2E confirms modal usage, role assignment, and success messaging while backend controllers/services enforce security and hashing [frontend/e2e/real/workflows/admin-user-management.spec.ts:14](frontend/e2e/real/workflows/admin-user-management.spec.ts:14), [src/main/java/com/usyd/catams/service/impl/UserServiceImpl.java:125](src/main/java/com/usyd/catams/service/impl/UserServiceImpl.java:125).

This report consolidates the implemented behaviour, evidence, and code references so reviewers can trace every workflow—from authentication through EA-compliant pay calculations, approvals, and administrator tooling—back to deterministic tests and the underlying source.
