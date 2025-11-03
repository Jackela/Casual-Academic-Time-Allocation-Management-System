# Contracts (Frontend wiring to existing Backend)

This feature wires existing endpoints; no backend contract changes are introduced. For reference:

- GET /api/timesheets/me
- GET /api/timesheets/pending-approval
- PUT /api/timesheets/{id}/confirm
- GET /api/approvals/history/{timesheetId}
- GET /api/approvals/pending

Frontend service functions MUST call these paths as specified in the feature spec.
