CATAMS API Documentation (Overview)

Format: concise Markdown catalogue; responses use RFC 7807 problem+json on errors.

Auth
- POST /api/auth/login
  - Body: { email: string, password: string }
  - 200: { token: string, user: { id, role, name, email } }
  - 401: problem+json (invalid credentials)

- POST /api/auth/logout
  - 204 No Content (stateless JWT)

Timesheet Quote
- POST /api/timesheets/quote
  - Body: { courseId, tutorId, weekStartDate, taskType, qualification, isRepeat, deliveryHours }
  - 200: { rateCode, qualification, associatedHours, payableHours, hourlyRate, amount, formula, clauseReference? }
  - 400: problem+json (e.g., Tutorial deliveryHours must be 1.0)
  - 401/403: problem+json

Timesheets
- GET /api/timesheets
  - Query: tutorId?, courseId?, status?, page=0, size=20, sort="createdAt,desc"
  - 200: [{ id, courseId, tutorId, taskType, weekStartDate, status, rateCode, deliveryHours, associatedHours, payableHours, amount }]
- GET /api/timesheets/{id}
  - 200: detailed timesheet
  - 404: problem+json
- POST /api/timesheets
  - Body: create payload (as in quote with description)
  - 201: created entity with computed fields
  - 400/401/403: problem+json
- PUT /api/timesheets/{id}
  - Body: update payload
  - 200: updated entity
  - 400/401/403/404: problem+json
- DELETE /api/timesheets/{id}
  - 204 on success
  - 401/403/404: problem+json

Tutor Convenience
- GET /api/timesheets/me
  - 200: current user’s timesheets (Draft, Pending Approval, Approved, Rejected)

Approvals
- POST /api/approvals
  - Body: { timesheetId, action: one of [SUBMIT_FOR_APPROVAL, TUTOR_CONFIRM, LECTURER_CONFIRM, HR_CONFIRM, REJECT, REQUEST_MODIFICATION], comment? }
  - 200: ApprovalActionResponse (previousStatus, newStatus, actor, timestamp)
- GET /api/approvals/pending
  - 200: items pending action for the current role (Admin/Lecturer/Tutor)
 - GET /api/approvals/history/{timesheetId}
  - 200: array of approval actions for a timesheet

Dashboard
- GET /api/dashboard/summary?courseId={id}&startDate={date}&endDate={date}
  - 200: { tutors: [{ tutorId, hours, amount }], budget: { total, used, remaining }, statuses: { draft, pending, approved, rejected } }
 - GET /api/dashboard
  - 200: default summary (delegates to /summary)

Timesheet Queues
- GET /api/timesheets/pending-approval
  - Tutor/Admin: items awaiting first-level approval
- GET /api/timesheets/pending-final-approval
  - Lecturer/Admin: items awaiting final approval by lecturer

Timesheets Config
- GET /api/timesheets/config
  - 200: UI constraints used by the SPA to validate forms

Users (Admin)
- GET /api/users?role={role}&active={true|false}
  - 200: filtered users (admin always; lecturers in e2e profile for tutor lists)
- POST /api/users
  - 201: created user
- PATCH /api/users/{id}
  - 200: updated user

Error Format (problem+json)
- Content-Type: application/problem+json
- Example:
  {
    "type": "https://api.catams/errors/validation",
    "title": "Validation failed",
    "status": 400,
    "detail": "Tutorial delivery hours must be exactly 1.0",
    "traceId": "..."
  }
