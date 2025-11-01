CATAMS API Documentation (Overview)

Format: concise Markdown catalogue; responses use RFC 7807 problem+json on errors.

Auth
- POST /api/auth/login
  - Body: { email: string, password: string }
  - 200: { token: string, user: { id, role, name, email } }
  - 401: problem+json (invalid credentials)

- GET /api/auth/whoami
  - 200: { id, role, name, email }
  - 401: problem+json

Timesheet Quote
- POST /api/timesheets/quote
  - Body: { courseId, tutorId, weekStartDate, taskType, qualification, isRepeat, deliveryHours }
  - 200: { rateCode, qualification, associatedHours, payableHours, hourlyRate, amount, formula, clauseReference? }
  - 400: problem+json (e.g., Tutorial deliveryHours must be 1.0)
  - 401/403: problem+json

Timesheets
- GET /api/timesheets
  - Query: courseId?, from?, to?, status?
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
- GET /api/timesheets/mine
  - 200: current user’s timesheets (Draft, Pending Approval, Approved, Rejected)

Approvals
- POST /api/timesheets/submit/{id}
  - Effect: DRAFT → PENDING_LECTURER_APPROVAL
- GET /api/lecturer/pending
  - 200: items awaiting lecturer action
- POST /api/lecturer/approve/{id}
  - Effect: PENDING_LECTURER_APPROVAL → APPROVED_BY_LECTURER (triggers HR notification)
- POST /api/lecturer/reject/{id}
  - Body: { reason }
  - Effect: PENDING_LECTURER_APPROVAL → REJECTED
- POST /api/timesheets/request-change/{id}
  - Tutor requests modification post-feedback

Lecturer Dashboard
- GET /api/lecturer/dashboard-summary?courseId={id}&from={date}&to={date}
  - 200: { tutors: [{ tutorId, hours, amount }], budget: { total, used, remaining }, statuses: { draft, pending, approved, rejected } }

Admin/HR
- GET /api/hr/pending
  - 200: pending after lecturer approval

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

