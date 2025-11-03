# Feature Specification: API Alignment Fixes

**Feature Branch**: `003-api-alignment-fixes`  
**Created**: 2025-11-03  
**Status**: Draft  
**Input**: User description: "New 003 branch for solving the issues"

## Clarifications

### Session 2025-11-03

- Q: Where to enforce Courses→Tutors response shape? → A: Backend returns { tutorIds }.

## User Scenarios & Testing (mandatory)

### User Story 1 - Course Tutors response alignment (Priority: P1)

As a user of the Course details view, I need the “Fetch Course Tutors” call to return data in the format the frontend expects so the UI can render tutor lists without errors.

Why this priority: A direct user-visible defect; currently yields undefined due to mismatch and breaks UI flows.

Independent Test: API test calls GET /api/courses/{courseId}/tutors and asserts the response conforms to the agreed contract; UI e2e asserts tutors render correctly.

Acceptance Scenarios:

1. Given a valid courseId with assigned tutors, When GET /api/courses/{courseId}/tutors, Then response schema is { tutorIds: number[] } and includes all assigned tutor ids.
2. Given a valid courseId with no assigned tutors, When GET /api/courses/{courseId}/tutors, Then response is { tutorIds: [] }.
3. Given an invalid/nonexistent courseId, When GET /api/courses/{courseId}/tutors, Then either 404 or { tutorIds: [] } is returned consistently per contract docs.
4. Given an unauthenticated or unauthorized user, When GET /api/courses/{courseId}/tutors, Then 401/403 is returned per ACL rules.

---

### User Story 2 - Tests prevent regression (Priority: P2)

As QA, I need fail-first tests that precisely assert the Courses→Tutors response contract so any divergence is caught in CI.

Why this priority: Prevents silent drift between frontend expectations and backend responses.

Independent Test: Automated API tests verify the response schema; UI tests confirm the tutors list renders without errors.

Acceptance Scenarios:

1. Given seeded assignments, When API test runs, Then it asserts response has a top-level tutorIds property that is an array.
2. Given UI smoke run, When navigating to a course using seeded data, Then tutor list appears without errors.

---

### User Story 3 - Document agreed contract (Priority: P3)

As engineering, I need the OpenAPI contract and quickstart updated to reflect the agreed response body and test entry points, so future changes can be coordinated.

Why this priority: Shared understanding reduces rework and onboarding time.

Independent Test: Contract file updated; quickstart includes commands to run API-only and full suites.

Acceptance Scenarios:

1. When reviewing specs/003-api-alignment-fixes/contracts/openapi.yml, Then Courses→Tutors shows the correct response schema.
2. When running quickstart commands, Then the API-only suite runs and fails if the contract is not met.

---

### Edge Cases

- Invalid courseId handling (404 vs empty array) must be explicitly documented and tested.
- Large tutor lists must remain performant and return within standard API timeouts.
- Authorization errors return standard error envelope without leaking data.

## Requirements (mandatory)

### Functional Requirements

- FR-001: The Courses→Tutors endpoint SHALL return a top-level object with tutorIds: number[] (backend returns this canonical shape).
- FR-002: Unauthorized roles (tutor, or lecturer not assigned) SHALL receive 401/403 per ACL rules; Admin and assigned Lecturer receive 200.
- FR-003: The OpenAPI contract and API alignment tests SHALL be updated to assert the agreed response schema.
- FR-004: The UI SHALL render tutors from the agreed schema without client-side errors.

### Key Entities

- Course Tutors Response: a representation of course→tutor relationships exposed to clients; minimal list of tutor IDs as tutorIds: number[].

## Success Criteria (mandatory)

### Measurable Outcomes

- SC-001: Automated contract tests detect schema drift during integration and block promotion when failing.
- SC-002: 0 UI errors related to undefined tutorIds across the full E2E suite.
- SC-003: Contract and quickstart updated and referenced from tests.
 - SC-004: For courses with large tutor lists (up to 500 tutorIds), 95% of requests complete in <= 500ms under nominal load.

## Contracts
- Courses->Tutors contract: see `specs/003-api-alignment-fixes/contracts/openapi.yml`

## Terminology
- Use "Courses->Tutors" consistently to refer to the endpoint and relation.

## Assumptions & Dependencies

- ACL rules apply: Admin and assigned Lecturer may access Courses->Tutors; other roles receive 401/403.
- Test setup can rely on available seed/reset endpoints in the test environment.
- Authentication for Admin, Lecturer, and Tutor roles is available during testing.
