# Implementation Plan: API Alignment Tests

**Branch**: `002-api-alignment-tests` | **Date**: 2025-11-03 | **Spec**: specs/002-api-alignment-tests/spec.md
**Input**: Feature specification from `/specs/002-api-alignment-tests/spec.md`

**Note**: Generated via planning workflow; adheres to Test-First gate.

## Summary

Add fail-first automated API alignment tests to detect critical frontend↔backend contract mismatches reported in the API Alignment Review (404s and path/verb drift). Tests focus on:
- GET `/api/courses/{courseId}/tutors` access control and existence
- Admin Tutor Assignments: GET `/api/admin/tutors/{tutorId}/assignments`, POST `/api/admin/tutors/assignments`
- Admin Lecturer Assignments: GET `/api/admin/lecturers/{lecturerId}/assignments`, POST `/api/admin/lecturers/assignments`

Approach: Playwright API tests (headless) that assert status codes and minimal response shapes, failing with explicit URL/method/body logging when mismatches occur. No code changes occur until tests fail per TDD.

## Technical Context

**Language/Version**: TypeScript (Node 18+ for E2E), Java 17 (backend reference)  
**Primary Dependencies**: Playwright Test; Vitest (optional for API probes)  
**Storage**: N/A for tests (backend uses RDBMS; unchanged)  
**Testing**: Playwright (API tests under `frontend/e2e/real/api`)  
**Target Platform**: Web app (frontend + backend, local dev or CI)  
**Project Type**: web (frontend + backend monorepo)  
**Performance Goals**: API alignment tests complete < 2 min locally; CI < 5 min  
**Constraints**: Deterministic seeds, headless CI, explicit logging on failure  
**Scale/Scope**: Three endpoint families and role-based access checks

NEEDS CLARIFICATION (to resolve in Phase 0 research):
- Tutor list response shape (minimal fields asserted)
- POST assignments success code (200 vs 204)
- Error envelope fields used in assertions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gate: Test-First is mandatory (TDD). This plan defines tests first, to fail on current mismatches, before any implementation changes. Integration testing focus aligns with constitution’s emphasis on inter-service contracts. Gate PASS.

## Project Structure

### Documentation (this feature)

```text
specs/002-api-alignment-tests/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
```

### Source Code (repository root)

```text
backend/
└── src/main/java/com/usyd/catams/...

frontend/
└── e2e/real/api/
    ├── courses-tutors.spec.ts
    ├── tutor-assignments.spec.ts
    └── lecturer-assignments.spec.ts
```

**Structure Decision**: Web app; API tests live under `frontend/e2e/real/api/` with supporting config in `frontend/e2e/config/e2e.config.ts`.

## Complexity Tracking

No constitution violations introduced.

