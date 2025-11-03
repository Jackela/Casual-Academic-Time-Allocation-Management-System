# Implementation Plan: Timesheet Quote‑then‑Create Workflow

Summary
- Repair Lecturer create modal wiring and accessibility.
- Integrate quoteTimesheet to enforce EA constraints in the form.
- Map authorization/validation errors to inline, actionable guidance.
- Add API endpoint constants and refactor services to use them.

Technical Context
- App: Frontend (Vite + React 19, TypeScript)
- Services: axios client `secureApiClient` (frontend/src/services/api-secure.ts)
- Existing Timesheet service: frontend/src/services/timesheets.ts
- UI: Lecturer dashboard shell, LecturerTimesheetCreateModal, shared TimesheetForm.
- Testing: Vitest (unit), Playwright (E2E)

Project Structure (relevant)
- frontend/src/components/dashboards/LecturerDashboard/
  - LecturerDashboardShell.tsx
  - components/LecturerTimesheetCreateModal.tsx
- frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.*
- frontend/src/services/timesheets.ts
- frontend/src/types/api.ts

Key Changes
- Add API_ENDPOINTS constants: TIMESHEETS.ME, TIMESHEETS.CONFIRM, TIMESHEETS.PENDING_APPROVAL, APPROVALS.HISTORY, APPROVALS.PENDING.
- Refactor hardcoded service URLs to constants.
- In TimesheetForm: debounce quote (≈300ms), cancel in‑flight; lock deliveryHours when mandated; display associated/payable & formula/clause as read‑only.
- In LecturerTimesheetCreateModal: ensure modal opens; preload lecturer assignments to restrict Tutor/Course pickers; disable Submit with empty state.
- Error UX: 403 shows assignment guidance; 400 shows server validation inline with field focus.

Integration
- Lecturer assignments endpoint: GET /api/admin/lecturers/{lecturerId}/assignments → { tutorIds: number[], courseIds: number[] }. Map these to picker options at modal open; if request fails, show non‑blocking warning with Retry; keep Submit disabled until a valid selection is possible.

Observability & Reliability
- Emit structured logs (no PII): { kind: 'quote', durationMs, status, debounced, canceled, traceId? } and { kind: 'create', status, traceId? }.
- Block Submit until latest quote has succeeded; on quote failure show inline error and provide a Retry; do not proceed to create without a valid quote.

Acceptance
- Matches spec FR‑001..FR‑007 and SC‑001..SC‑005.
