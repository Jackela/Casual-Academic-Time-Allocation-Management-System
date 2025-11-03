# Research: API Alignment Tests

**Date**: 2025-11-03  
**Branch**: 002-api-alignment-tests  
**Spec**: specs/002-api-alignment-tests/spec.md

## Decisions

- Decision: Tutor list response shape = array of minimal tutor summaries
  - Rationale: Tests should be robust against non-breaking additions; assert minimal required fields
  - Chosen Shape: `[{ id: number, name?: string }]` (tests assert array and `id` numeric when feasible)
  - Alternatives considered:
    - Full user object (id, name, email, role): too strict for alignment tests, causes churn
    - Array of ids only: limits UI usefulness and parity with typical list APIs

- Decision: POST assignments success code = 204 No Content
  - Rationale: Idempotent update APIs commonly return 204; avoids brittle body assertions
  - Alternatives considered:
    - 200 with body echo: acceptable but unnecessary; tests accept 200 or 204 for flexibility

- Decision: Error envelope expectations
  - Rationale: Tests should report exact URLs, status, and raw bodies without enforcing a schema to maximize signal while minimizing flakiness
  - Chosen: Log raw response body on failure; do not assert error schema
  - Alternatives considered:
    - Enforce `{ code, message }`: not currently standardized; risks false negatives

- Decision: Access control for Course→Tutors
  - Rationale: Least privilege and R4/R5 scope alignment
  - Chosen: Admin and assigned Lecturer → 200; non‑assigned Lecturer/Tutor → 403/401
  - Alternatives considered:
    - Admin only: blocks legitimate lecturer flows
    - Everyone: violates least privilege

## Resolved NEEDS CLARIFICATION

- Tutor list minimal contract: array present, optionally validate `id` numeric when body is JSON array
- POST success code: accept 204 or 200
- Error envelope: no schema assertion, only log

