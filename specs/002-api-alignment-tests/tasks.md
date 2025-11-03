# Tasks: API Alignment Tests

**Input**: Design documents from `/specs/002-api-alignment-tests/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD explicitly requested. Each user story includes fail-first tests that must be written and fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure environment and scaffolding for API alignment tests

- [X] T001 Verify E2E env vars in `frontend/e2e/config/e2e.config.ts` (E2E_BACKEND_URL, E2E_FRONTEND_URL, credentials)
- [X] T002 [P] Ensure Playwright test selection includes `frontend/e2e/real/api/*.spec.ts` in `frontend/playwright.config.ts`
- [X] T003 [P] Document quick run steps in `specs/002-api-alignment-tests/quickstart.md` (already added; verify)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Stable deterministic seeds and auth for API tests

- [X] T004 Ensure seed/reset flow writes credentials to `uat-artifacts/current/SEED_ACCOUNTS.json` via `scripts/e2e-reset-seed.js`
- [X] T005 [P] Confirm auth helper covers Admin/Lecturer/Tutor in `frontend/e2e/api/auth-helper.ts`
- [X] T006 [P] Verify test-data-factory assigns standard tutors to courses in `frontend/e2e/api/test-data-factory.ts`
 - [X] T007 [P] Verify CI headless + reporters enforce non-zero exit in `frontend/playwright.config.ts` and CI pipeline; document in `specs/002-api-alignment-tests/quickstart.md`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Detect missing Course→Tutors endpoint (Priority: P1) 🎯 MVP

**Goal**: Catch 404/ACL mismatches for GET `/api/courses/{courseId}/tutors`.

**Independent Test**: Playwright API test runs against backend; Admin and assigned Lecturer get 200 array; Tutor and non-assigned Lecturer get 401/403.

### Tests for User Story 1 (write first; expect FAIL) ⚠️

- [X] T010 [P] [US1] Add/verify fail-first test `frontend/e2e/real/api/courses-tutors.spec.ts` (logs URL/status/body on failure)

### Implementation for User Story 1

- [X] T011 [P] [US1] Add endpoint in `src/main/java/com/usyd/catams/controller/CourseUsersController.java` with `@RequestMapping("/api/courses")` and `@GetMapping("/{courseId}/tutors")`
- [X] T012 [US1] Enforce ACL: `@PreAuthorize("hasRole('ADMIN') or @lecturerAccessEvaluator.isAssigned(authentication, #courseId)")` in `CourseUsersController.java`
- [X] T013 [US1] Implement minimal list from `TutorAssignmentRepository` (id array) for determinism
- [X] T014 [US1] Wire repository query for course→tutors in `src/main/java/com/usyd/catams/repository/TutorAssignmentRepository.java`
- [X] T015 [US1] No over-permit changes in `SecurityConfig`
 - [X] T015a [US1] Implement `LecturerAccessEvaluator` with `isAssigned(Authentication, Long)`; in e2e-local consult in-memory `E2EAssignmentState` for POSTed assignments

**Checkpoint**: US1 independently passes API test; proceed to next story

---

## Phase 4: User Story 2 - Validate Tutor assignments admin endpoints (Priority: P1)

**Goal**: Ensure Admin GET/POST tutor assignments paths/methods align and function.

**Independent Test**: Playwright API tests assert GET returns `{courseIds: number[]}`; POST returns 204/200 and subsequent GET reflects update.

### Tests for User Story 2 (write first; expect FAIL if misaligned) ⚠️

- [X] T016 [P] [US2] Add/verify fail-first tests `frontend/e2e/real/api/tutor-assignments.spec.ts`

### Implementation for User Story 2

- [X] T017 [P] [US2] Confirm/align GET in `src/main/java/com/usyd/catams/controller/admin/UserAdminController.java` → `@GetMapping("/{tutorId}/assignments")` returns `{courseIds}`
- [X] T018 [US2] Confirm/align POST in `src/main/java/com/usyd/catams/controller/admin/UserAdminController.java` → `@PostMapping("/assignments")` returns 204 and replaces set
- [X] T019 [US2] Ensure repository methods exist in `src/main/java/com/usyd/catams/repository/TutorAssignmentRepository.java` (`findByCourseIdIn`, `deleteByTutorId`)

**Checkpoint**: US2 independently passes API tests

---

## Phase 5: User Story 3 - Validate Lecturer assignments admin endpoints (Priority: P2)

**Goal**: Ensure Admin GET/POST lecturer assignments paths/methods align and function.

**Independent Test**: Playwright API tests assert GET returns `{courseIds: number[]}`; POST returns 204/200 and subsequent GET reflects update.

### Tests for User Story 3 (write first; expect FAIL if misaligned) ⚠️

- [X] T020 [P] [US3] Add/verify fail-first tests `frontend/e2e/real/api/lecturer-assignments.spec.ts`

### Implementation for User Story 3

- [X] T021 [P] [US3] Implement/align GET in `src/main/java/com/usyd/catams/controller/admin/LecturerAdminController.java` → `@GetMapping("/{lecturerId}/assignments")` returns `{courseIds}`
- [X] T022 [US3] Implement/align POST in `src/main/java/com/usyd/catams/controller/admin/LecturerAdminController.java` → `@PostMapping("/assignments")` returns 204 and replaces set
- [X] T023 [US3] Ensure repository methods exist in `src/main/java/com/usyd/catams/repository/LecturerAssignmentRepository.java`

**Checkpoint**: US3 independently passes API tests

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and resilience

- [X] T030 [P] Update `specs/002-api-alignment-tests/contracts/openapi.yml` to reflect final status codes/fields
- [X] T031 Add negative tests for invalid IDs and unauthorized roles where applicable (same spec files)
- [X] T032 [P] Add quickstart cross-check to `specs/002-api-alignment-tests/quickstart.md` (include seed instructions)

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies
- Foundational (Phase 2): Depends on Setup; blocks all stories
- User Stories (Phase 3+): Depend on Foundational; can run in parallel after Phase 2
- Polish: Depends on targeted user stories completion

### User Story Dependencies

- User Story 1 (P1): Independent after Phase 2
- User Story 2 (P1): Independent after Phase 2
- User Story 3 (P2): Independent after Phase 2

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Implement only what’s needed to pass each story’s tests

## Parallel Example

- Execute T010, T016, T020 in parallel to produce fail-first signals across all three endpoints
- In implementation, T011/T017/T021 can proceed in parallel by different devs

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate: run `courses-tutors.spec.ts`

### Incremental Delivery

1. Add US2 tests/impl after US1
2. Add US3 tests/impl after US2 (or in parallel if staffed)
