R4 — Tutor Request & Lecturer Approval Implementation Report

Frontend

- Tutor view (statuses):
  - Tutors can see their own timesheets with clear status chips/badges for: Draft, Pending Approval, Approved, Rejected. The shared TimesheetTable component formats dates, status badges, and provides basic row interactions.

- Tutor initiation (Request/Change):
  - From the tutor dashboard, a tutor can create/update a draft and submit it for lecturer approval. The Create Timesheet modal enforces EA validation up front and presents a Calculated Pay Summary so tutors can validate outcomes before submission.
  - Requesting a change after submission is supported via contextual actions (e.g., “Request modification”), which pushes the item back into a pending-modification state and surfaces an inline reason.

- Lecturer view (pending list):
  - The lecturer dashboard lists pending items requiring action. Filtering controls and a pending table highlight timesheets awaiting lecturer confirmation.

- Lecturer actions (approve/reject):
  - The lecturer can open a pending entry, review the quoted calculation, and choose Approve or Reject. Rejection requires an inline reason; approval proceeds if the entry passes EA validation.
  - The UI provides responsive, accessible controls and inline feedback for success/failure (problem+json messages roll up to a banner/toast on errors).

Backend

- API endpoints (final shape):
  - GET /api/timesheets/me — current user’s timesheets with statuses.
  - GET /api/timesheets — list with filters (tutorId, courseId, status, paging/sort).
  - GET /api/timesheets/{id} — fetch details by id.
  - POST /api/timesheets — create (Draft until submitted/confirmed).
  - PUT /api/timesheets/{id} — update with re‑validation of EA rules.
  - DELETE /api/timesheets/{id} — delete (role/ownership guarded).
  - POST /api/timesheets/quote — quote calculation (shared with create/update UI flows).
  - GET /api/timesheets/pending-approval — tutor/admin pending queue.
  - GET /api/timesheets/pending-final-approval — lecturer/admin final approval queue.
  - GET /api/timesheets/config — UI constraints consumed by the SPA.
  - POST /api/approvals — perform lifecycle action (SUBMIT_FOR_APPROVAL, TUTOR_CONFIRM, LECTURER_CONFIRM, HR_CONFIRM, REJECT, REQUEST_MODIFICATION).
  - GET /api/approvals/pending — role‑aware pending items.
  - GET /api/approvals/history/{timesheetId} — approval history for a timesheet.
  - GET /api/dashboard/summary — lecturer/admin/tutor dashboard summary (also GET /api/dashboard).

- State machine (lifecycle):
  - DRAFT → PENDING_LECTURER_APPROVAL → APPROVED_BY_LECTURER → PROCESSED_BY_HR
  - DRAFT → PENDING_LECTURER_APPROVAL → REJECTED
  - Transitions are enforced by service layer guards and authorization checks. Problem+json is returned on invalid transitions or role/ownership violations.

- Compliance reuse on submission:
  - The service layer uses Schedule1Calculator for both the quote and the create/submit path to guarantee consistency. This re-validates delivery/associated hours and maps to the correct EA rate codes (TU/DE/AO/Marking) at submission time.

- HR notification (R6 handshake):
  - After lecturer approval, the system notifies HR (e.g., posting to an HR queue/topic or writing to a dedicated table for HR pickup). The HR dashboard/API exposes a pending list for final review (PROCESSED_BY_HR closes the loop). Errors are surfaced via problem+json to the lecturer UI when notifications fail, but the approval state is tracked so HR can reconcile.
