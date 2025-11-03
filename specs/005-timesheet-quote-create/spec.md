# Feature Specification: Timesheet Quote‑then‑Create Workflow

Summary
- Fix Lecturer create UI so the create modal opens reliably.
- Replace “dumb” client validation with EA Quote‑then‑Create workflow.
- Enforce EA rules from quote response (e.g., TUTORIAL deliveryHours = 1.0) in the form.
- Improve error handling: map 400/403 into actionable guidance.

Why
- Current frontend allows arbitrary hours and posts directly to /api/timesheets, causing 400 VALIDATION_FAILED and 403 AUTHORIZATION_FAILED.
- EA policy requires a Quote‑then‑Create model; backend already exposes POST /api/timesheets/quote.
- Aligning the UI with EA flow prevents invalid submissions and improves user guidance.

Scope
- Lecturer Dashboard: ensure “Create Timesheet” opens the modal (LecturerTimesheetCreateModal).
- Create Form: integrate quote flow, enforce EA constraints, render read‑only computed fields.
- Error UX: translate 400/403 into clear, role‑aware messages.
- Tech debt: centralize API endpoint constants and remove hardcoded paths in services.

Out of Scope
- Backend API behavior changes.
- Non‑timesheet features or unrelated UI refactors.

Actors
- Lecturer (creates timesheets for tutors)
- Tutor (views/acts on own timesheets; not primary creator here)
- Admin/HR (approval flows; unaffected by create mechanics)

## Clarifications

### Session 2025-11-03
- Q: How should the form prevent 403 authorization errors when choosing Tutor/Course? → A: Limit selections to assigned Tutors/Courses fetched from backend; disable submit if none available.
- Q: When is deliveryHours mandated read‑only? → A: If the quote returns a deliveryHours value that differs from current input or indicates a fixed value, set deliveryHours to the quoted value and lock the field until a subsequent quote changes it.
- Q: Which fields are critical for re‑quote on submit? → A: taskType, deliveryHours, qualification, isRepeat, sessionDate.

## User Scenarios & Testing (mandatory)

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 – Create modal opens (P1)
**Why**: Unblocks primary flow; currently broken.
**Independent Test**: Click “Create Timesheet” opens modal; ESC closes; focus trapped; ARIA labels present.
**Acceptance**:
1. Given Lecturer Dashboard, When clicking “Create Timesheet”, Then the create modal opens.
2. Given the modal is open, When pressing ESC, Then the modal closes and focus returns to the trigger.

---

### User Story 2 – Quote updates form (P1)
**Why**: Enforces EA rules client‑side before submit.
**Independent Test**: Changing taskType/deliveryHours triggers quote; deliveryHours clamps; associated/payable become read‑only per quote.
**Acceptance**:
1. Given taskType=TUTORIAL, When deliveryHours changes, Then UI calls quote and sets deliveryHours=1.0 read‑only.
2. Given quote returns associated/payable hours, Then those fields display read‑only values with formula/clause.

---

### User Story 3 – Submit after quote (P1)
**Why**: Ensures server receives EA‑compliant data.
**Independent Test**: After a successful quote, Submit posts create and list refreshes.
**Acceptance**:
1. Given valid quote, When Submit, Then create succeeds and a success toast appears.
2. Given quote is stale (critical fields changed), When Submit, Then re‑quote occurs before create.

### User Story 4 – Error UX (P2)
**Independent Test**: 403 shows authorization guidance; 400 shows field‑specific validation.
**Acceptance**:
1. Given 403 from create, Then show “Creation failed: you are not assigned to this course or tutor.”
2. Given 400 VALIDATION_FAILED, Then display server message inline and focus the offending field.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- No assignments available for lecturer: show guidance “You are not assigned to any tutor/course; contact admin” and disable Submit.
- Quote service latency/high churn: debounce quote by ~300ms and cancel inflight requests on change.
- Quote failure at submit: block Submit until a successful quote exists; show inline error and offer “Retry quote”.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements
- FR‑001: “Create Timesheet” opens LecturerTimesheetCreateModal reliably.
- FR‑002: Form calls POST /api/timesheets/quote on relevant field changes and updates UI from response.
- FR‑003: Form enforces EA constraints from quote (read‑only where mandated; show formula/clause). If the quote returns a deliveryHours value that differs from current input or indicates a fixed value, set deliveryHours to the quoted value and lock the field until a subsequent quote changes it.
- FR‑004: Submit only with EA‑consistent values. If any critical field (taskType, deliveryHours, qualification, isRepeat, sessionDate) changed since the last quote, automatically re‑quote before submitting.
- FR‑005: 403 maps to role‑aware guidance; 400 maps to inline, field‑specific messages.
- FR‑006: Add endpoint constants for ME, CONFIRM, PENDING_APPROVAL, APPROVALS.HISTORY, APPROVALS.PENDING and use them in services.
- FR‑007: Restrict Tutor/Course pickers to lecturer‑assigned entities fetched on modal open; if none are available, show empty‑state guidance and disable Submit.

### Key Entities *(include if feature involves data)*
- TimesheetCreateRequest, QuoteResponse (EA‑derived)

## Integration Dependencies

- Lecturer assignments: GET /api/admin/lecturers/{lecturerId}/assignments → { tutorIds: number[], courseIds: number[] }. Use this to restrict Tutor/Course pickers; handle empty state and retry.

## Non‑Functional Requirements

- Quote latency: p95 ≤ 500ms; show loading indicator while awaiting quote.
- Observability: log quote duration, status, debounce count, canceled requests, and create status (no PII); include backend traceId if provided.
- Security & privacy: surface non‑PII error messages; do not log sensitive user input values.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes
- SC‑001: 0% client‑side 400s for TUTORIAL across 50 test submissions following normal flow.
- SC‑002: Modal opens within 200ms click‑to‑open in test env.
- SC‑003: Quote updates fields 100% of the time and locks constrained values.
- SC‑004: 100% of 403s show authorization guidance without navigation.
- SC‑005: Unit/component/E2E create tests pass.
