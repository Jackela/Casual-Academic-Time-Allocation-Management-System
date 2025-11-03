# Feature Specification: API Alignment Tests (TDD)

**Feature Branch**: [004-api-alignment-tests]  
**Created**: 2025-11-03  
**Status**: Draft  
**Input**: User description: "Review failed. Your API Alignment Review proves the existing test suite is inadequate. We must follow a strict TDD cycle. Your new task is to first review and fix the test plan before fixing the code. 1. Review the existing UAT plan (E2E_UAT_EXECUTION_GUIDE.md) and identify why it failed to catch the critical 404 errors reported in the API Alignment Review(e.g.,/api/courses/{courseId}/tutorsand the path mismatch forgetTutorAssignments). 2. Propose new, high-priority integration tests (Vitest or Playwright) that specifically assert these failing frontend-to-backend API calls. 3. Do not proceed with any code fixes until these new tests are defined and failing as expected."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Detect 404s on course→tutors (Priority: P1)

As a reviewer, I need automated integration tests to call the "course→tutors" endpoint so that any path mismatch or missing route returns a failing test (surfacing 404s immediately).

**Why this priority**: This route mismatch is a known critical failure blocking core user journeys; catching it prevents silent regressions.

**Independent Test**: Run the API integration test that requests /api/courses/{courseId}/tutors with a seeded valid course; test asserts non-404 response and expected contract keys.

**Acceptance Scenarios**:

1. Given a valid course ID, When the test requests /api/courses/{courseId}/tutors, Then the test fails if the response status is 404 or 405.
2. Given a valid course ID, When the test validates the response shape (e.g., contains 	utorIds list), Then the test fails if keys are missing or types mismatch.

---

### User Story 2 - Catch path mismatch for tutor assignments (Priority: P1)

As a reviewer, I need a targeted test for the frontend service method that loads tutor assignments so that a wrong path (e.g., orgetTutorAssignments vs. getTutorAssignments) is immediately detected by a failing assertion.

**Why this priority**: The misnamed/mismatched path caused broken functionality but slipped past tests; this directly addresses that gap.

**Independent Test**: Execute a service-level integration/unit test that verifies the exact request path used for tutor assignments and asserts the backend returns a non-404; fail on any 404 or unexpected URL pattern.

**Acceptance Scenarios**:

1. Given the service is invoked with a valid course ID, When it issues the request, Then the asserted path matches the documented contract and the test fails if not.
2. Given the backend responds, When the status is 404, Then the test fails with a clear message pointing to the path mismatch.

---

### User Story 3 - Lecturer assignments endpoint coverage (Priority: P2)

As a reviewer, I want API tests that exercise lecturer assignment endpoints so that 404/500 issues are detected early and contracts remain aligned.

**Why this priority**: Lecturer flows power approval queues; missing endpoints or contract drift break R4/R5 flows.

**Independent Test**: Run API tests for GET and POST lecturer assignment routes using seeded data; assert non-404 and minimal schema keys.

**Acceptance Scenarios**:

1. Given an existing lecturer and course, When fetching assignments, Then the test fails if status is 404/500 or payload omits required identifiers.
2. Given valid lecturer+course IDs, When posting an assignment, Then the test fails if status is 404/405 or the follow-up GET does not reflect the association.

---

### Edge Cases

- Misconfigured base URL/proxy leading to false 404s; tests must surface configuration context in error output.
- Unauthorized requests return 401/403; tests must authenticate before asserting 404/200 to avoid false positives.
- Nonexistent IDs should intentionally return 404; tests must differentiate expected vs. unexpected 404s.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Provide an automated integration test that exercises /api/courses/{courseId}/tutors and fails on 404/405.
- **FR-002**: Validate the minimal response contract for course→tutors (presence and type of the tutor identifier collection) and fail on mismatch.
- **FR-003**: Provide a targeted test that asserts the frontend uses the documented tutor-assignments path; fail if the requested path deviates.
- **FR-004**: Provide API tests covering lecturer assignment read/write routes that fail on 404/500 or contract drift.
- **FR-005**: Ensure tests authenticate before contract assertions to avoid authorization-related false negatives.
- **FR-006**: Surface precise diagnostics (requested URL, method, status, body excerpt) on failures to speed alignment.

### Key Entities *(include if feature involves data)*

- **Endpoint Contract**: The documented path, method, status expectations, and minimal response fields used by the frontend.
- **Test Case**: An automated scenario with preconditions (auth, seed data), action (HTTP request), and assertions (status, shape).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The new tests fail on current code where path mismatches/404s exist, within one test run.
- **SC-002**: After backend alignment (outside this task), all new tests pass without changing the tests themselves.
- **SC-003**: Test failure output includes URL, method, status, and a payload excerpt in 100% of negative cases.
- **SC-004**: Coverage of high-risk API paths increases (at least the three listed flows) and remains enforced in CI.