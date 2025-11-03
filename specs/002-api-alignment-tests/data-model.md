# Data Model: API Alignment Tests

**Scope**: Testing contracts only; no schema migrations or persistence changes.

## Entities (for contract context)

- Course
  - id: number
  - code: string (informational)

- User
  - id: number
  - role: enum { ADMIN, LECTURER, TUTOR }
  - name: string

- TutorAssignment (Admin-managed)
  - tutorId: number (ref User.role=TUTOR)
  - courseIds: number[] (replace all on POST)

- LecturerAssignment (Admin-managed)
  - lecturerId: number (ref User.role=LECTURER)
  - courseIds: number[] (replace all on POST)

## Validation Rules (implicit via contracts)

- GET Course→Tutors requires role: ADMIN or LECTURER assigned to course; else 401/403
- Admin assignment POST replaces assignment set for given actor id
- GET assignments returns `{ courseIds: number[] }` (empty array allowed)

## State Transitions (assignment sets)

- POST assignments: previous set → new set (idempotent)

