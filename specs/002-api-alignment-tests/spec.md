# Feature Specification: API Alignment Tests

**Feature Branch**: `002-api-alignment-tests`  
**Created**: 2025-11-03  
**Status**: Draft  
**Input**: User description: "Review failed. Your API Alignment Review proves the existing test suite is inadequate. We must follow a strict TDD cycle. Your new task is to first review and fix the test plan before fixing the code. 1. Review the existing UAT plan (E2E_UAT_EXECUTION_GUIDE.md) and identify why it failed to catch the critical 404 errors reported in the API Alignment Review(e.g.,/api/courses/{courseId}/tutorsand the path mismatch forgetTutorAssignments). 2. Propose new, high-priority integration tests (Vitest or Playwright) that specifically assert these failing frontend-to-backend API calls. 3. Do not proceed with any code fixes until these new tests are defined and failing as expected."

## Clarifications

### Session 2025-11-03

- Q: Who may access `GET /api/courses/{courseId}/tutors`? → A: Admin and assigned Lecturer; Tutor forbidden.

## User Scenarios & Testing (mandatory)

### User Story 1 - Catch missing Courses→Tutors endpoint (Priority: P1)

As a QA, I need an automated test that calls the backend endpoint the UI expects to list tutors for a course (Courses → Tutors relationship) so that any 404 or contract mismatch is immediately detected during CI.

**Why this priority**: This 404 blocks critical create/approval flows; it must be detected before release.

**Independent Test**: Playwright API test performs an authenticated call to the Courses→Tutors endpoint (see contracts/openapi.yml) and asserts 200 + minimal contract (array of tutors). If the endpoint is missing, the test fails with explicit 404 details.

**Acceptance Scenarios**:

1. **Given** a seeded Admin token and an existing courseId, **When** GET the Courses→Tutors endpoint is executed, **Then** response status is 200 and body is an array (length ≥ 0).
2. **Given** a seeded Lecturer token assigned to that course, **When** GET the same endpoint is executed, **Then** response status is 200 and body is an array (length ≥ 0).
3. **Given** a seeded Lecturer token not assigned to that course, **When** GET the same endpoint, **Then** response status is 403 (no privilege).
4. **Given** a Tutor token, **When** GET the same endpoint, **Then** response status is 403 (no privilege).

---

### User Story 2 - Catch tutor-assignment path mismatches (Priority: P1)

As a QA, I need an automated test that validates the Admin UI’s “get tutor assignments” path and method so any mismatch (incorrect path, wrong verb) triggers a failing test with a clear error.

**Why this priority**: Admin assignment flows are P0 and underpin R4/R5 correctness; mismatches silently break data scopes.

**Independent Test**: Playwright API test calls the Admin Tutor Assignments GET endpoint (see contracts/openapi.yml) and asserts 200 with `{ courseIds: number[] }`. If 404/500 occurs, the test fails and prints the resolved URL used.

**Acceptance Scenarios**:

1. **Given** Admin token and an existing tutorId, **When** GET the Admin Tutor Assignments endpoint, **Then** response status is 200 and body has `courseIds` array.
2. **Given** Admin token and same tutorId, **When** POST the Admin Tutor Assignments endpoint with payload `{ tutorId, courseIds }`, **Then** response status is 200 or 204 and a subsequent GET returns the updated `courseIds`.

---

### User Story 3 - Catch lecturer-assignment path mismatches (Priority: P2)

As a QA, I want tests that validate the Admin UI’s lecturer assignment endpoints so that scoping for R4/R5 never regresses.

**Why this priority**: R4/R5 rely on lecturer scoping; missing endpoints or privileges must be detected.

**Independent Test**: Playwright API test exercises the Admin Lecturer Assignments GET and POST endpoints (see contracts/openapi.yml) with admin token.

**Acceptance Scenarios**:

1. **Given** Admin token + lecturerId, **When** GET the Admin Lecturer Assignments endpoint, **Then** 200 with `{ courseIds: []|[...] }`.
2. **Given** Admin token, **When** POST the Admin Lecturer Assignments endpoint with `{ lecturerId, courseIds }`, **Then** 200 or 204 and a subsequent GET returns updated `courseIds`.

---

### Edge Cases

- What happens when invalid IDs are used? Expect 400 with clear error envelope (not 500).
- How does system handle unauthorized roles? Expect 401/403 without leaking data.
- Empty assignments responses must be `{ courseIds: [] }` and 200.
- Lecturer not assigned to course must receive 403 for course-scoped tutor listings.

## Requirements (mandatory)

### Functional Requirements

- **FR-001**: A Playwright API test MUST attempt to GET the Courses→Tutors endpoint (see contracts/openapi.yml) for a valid course and assert access control: Admin and Lecturer assigned to that course receive 200; Tutor and non-assigned Lecturer receive 401/403 (and failures must log exact URL + status + body).
- **FR-002**: A Playwright API test MUST GET and POST tutor assignments using the endpoints defined in contracts/openapi.yml and assert the response shapes.
- **FR-003**: A Playwright API test MUST GET and POST lecturer assignments using the endpoints defined in contracts/openapi.yml and assert the response shapes.
- **FR-004**: All new tests MUST run headless in CI and print the exact URL + method on failure to localize defects quickly.
- **FR-005**: Tests MUST authenticate with seeded Admin/Lecturer/Tutor tokens and assert role-appropriate responses.

### Key Entities (include if feature involves data)

- **Course Tutors Endpoint**: Read-only list of tutors related to a course. Expected path and authorization vary by role; Admin and assigned Lecturer allowed; Tutor forbidden.
- **Tutor Assignments**: Admin-only read/write of `{ tutorId, courseIds }`.
- **Lecturer Assignments**: Admin-only read/write of `{ lecturerId, courseIds }`.

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: The Courses→Tutors Playwright API test fails with 404 (or passes with 200) in under 30s and logs the exact path.
- **SC-002**: The Tutor assignment API tests fail with 404/500 (or pass with 200/204) if paths are incorrect and display the server error body.
- **SC-003**: The Lecturer assignment API tests fail with 404/500 (or pass with 200/204) if paths are incorrect and display the server error body.
- **SC-004**: The CI pipeline surfaces test failures clearly (non-zero exit code) so engineers cannot merge without fixing alignment.

## Assumptions

- Seed endpoints exist to obtain Admin/Lecturer/Tutor tokens for test auth.
- Course IDs referenced by tests are created by seed scripts prior to test run.
- Frontend currently expects: `/api/admin/tutors/{tutorId}/assignments` (GET), `/api/admin/tutors/assignments` (POST), `/api/admin/lecturers/{lecturerId}/assignments` (GET), `/api/admin/lecturers/assignments` (POST). [Assessed from code; verify when implementing tests]

## Proposed Tests (High Priority)

- Playwright (preferred) under `frontend/e2e/real/api/`
  - `courses-tutors.spec.ts`:
    - Auth as Admin → GET Courses→Tutors endpoint → expect 200 + array (fail with detailed message on 404/500).
    - Auth as Lecturer → same assertion.
    - Auth as Tutor → expect 403.
  - `tutor-assignments.spec.ts`:
    - Admin: GET Admin Tutor Assignments endpoint → expect 200 `{ courseIds: []|[...] }`.
    - Admin: POST Admin Tutor Assignments endpoint → 200/204; subsequent GET returns updated `courseIds`.
  - `lecturer-assignments.spec.ts`:
    - Admin: GET Admin Lecturer Assignments endpoint → 200 `{ courseIds: []|[...] }`.
    - Admin: POST Admin Lecturer Assignments endpoint → 200/204; subsequent GET returns updated `courseIds`.

- Vitest (optional fallback) under `frontend/e2e/real/api/` using fetch with base URL + tokens if Playwright infra unavailable in CI.

---

## Why UAT failed previously (Guide Gaps)

- The UAT guide concentrated on UI workflows and screenshots but lacked explicit API contract probes for:
  - Courses→Tutors relation endpoint (no explicit GET asserted),
  - Tutor assignment GET/POST path and method (no explicit assertion of exact paths).
- Result: 404s and path mismatches were not surfaced; UI states appeared disabled rather than clearly failing.
- Remedy: Add API-level Playwright tests that assert status codes and minimal response shapes for each critical endpoint.

## Out of Scope

- Modifying UI behavior; UI remains unchanged for this feature.
- Note: Backend changes are not implemented until fail-first tests are in place; the corresponding implementation work is tracked in plan.md and tasks.md.

*** End of Specification ***
