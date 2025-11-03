# Implementation Plan: API Alignment Fixes (003)

Branch: `003-api-alignment-fixes` | Spec: specs/003-api-alignment-fixes/spec.md | Date: 2025-11-03

## Technical Context
- Scope: Align GET `/api/courses/{courseId}/tutors` response to `{ tutorIds: number[] }`; update contract and tests. No dual-shape fallback is permitted.
- Unknowns: None (response shape clarified to backend returns `{ tutorIds }`).
- Constraints: Maintain existing ACL (Admin and assigned Lecturer → 200; others → 401/403). Keep tests headless with JSON/JUnit reporters.

## Constitution Check
- Test-first: Mandatory — write/adjust API tests to fail if response not aligned.
- Integration focus: Contract tests in Playwright for endpoint + ACL.
- Gate: PASS (tests-first approach, measurable success criteria).

## Phases

### Phase 0: Research (Complete)
- research.md documents decisions, rationale, and alternatives.

### Phase 1: Design & Contracts
- data-model.md defines `CourseTutorsResponse`.
- contracts/openapi.yml sets `{ tutorIds: number[] }` schema for GET `/api/courses/{courseId}/tutors`.
- quickstart.md includes API-only and full-run commands.

### Phase 2: Implementation Outline (to be executed)
1) Backend: Update controller to return `{ tutorIds }` body.
2) Tests: Add/adjust Playwright API spec to expect `{ tutorIds }` (and update UI usage if needed).
3) Validate: Run `--grep=@api` then full suite; ensure non-zero exit on failures in CI.

## Success Criteria
- API suite passes with `{ tutorIds }` schema.
- Full E2E suite shows no UI errors related to tutor list.
- Contract and quickstart updated and referenced by tests.
