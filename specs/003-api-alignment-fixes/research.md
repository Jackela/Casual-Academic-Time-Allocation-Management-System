# Research: API Alignment Fixes (003)

## Decision 1: Canonical response shape for Courses→Tutors
- Decision: Backend returns a top-level object `{ tutorIds: number[] }`.
- Rationale: Matches current frontend expectation; provides a single canonical contract; simplifies tests and documentation; reduces UI mapping debt.
- Alternatives considered:
  - Frontend maps `[{ id: number }]` to `tutorIds`: avoids backend change but adds client debt and risk of drift.
  - Support both shapes temporarily: safer rollout but adds complexity and multiple code paths.

## Decision 2: Test-first enforcement
- Decision: Expand Playwright API tests to assert the exact response schema and authorization matrix for Courses→Tutors.
- Rationale: Prevents regressions and ensures CI surfaces misalignments immediately.
- Alternatives considered: Rely on UI-only tests (insufficient to detect schema-level mismatches); use unit tests only (insufficient for contract and ACL coverage).

## Decision 3: OpenAPI contract source-of-truth
- Decision: Update OpenAPI under this feature to specify `{ tutorIds: number[] }` response for GET `/api/courses/{courseId}/tutors`.
- Rationale: Keeps spec discoverable and aligned; easy to cross-check in reviews.
- Alternatives considered: Rely only on tests and prose docs.

