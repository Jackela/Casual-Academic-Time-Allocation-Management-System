# Contracts: Timesheets Create & Quote (High-Level)

## GET /api/admin/lecturers/{lecturerId}/assignments
- Response 200: `{ tutorIds: number[], courseIds: number[] }`

## POST /api/timesheets/quote
- Request: TimesheetDraft
- Response 200: QuoteResult
- Errors:
  - 400 VALIDATION_FAILED: `{ field: string, message: string }`
  - 403 AUTHORIZATION_FAILED: `{ message: string }`

## POST /api/timesheets
- Request: TimesheetDraft merged with QuoteResult‑consistent fields
- Response 201: `{ id: number, status: string }`
- Errors mirror quote + domain errors

