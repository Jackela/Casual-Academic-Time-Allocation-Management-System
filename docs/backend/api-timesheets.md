# Timesheet API Contracts

This document supersedes the legacy API catalogue and focuses on the EA-compliant endpoints that interact with the Schedule 1 calculator.

Base URL (dev): `http://localhost:8084/api`
Authentication: Bearer JWT (Tutor, Lecturer, Admin roles).

## Quote Endpoint

### POST `/timesheets/quote`
Requests an authoritative calculation for a prospective session. The request is intentionally minimal because all financial values are calculated server-side.

```json
{
  "tutorId": 2,
  "courseId": 101,
  "taskType": "TUTORIAL",
  "qualification": "STANDARD",
  "repeat": false,
  "deliveryHours": 1.0,
  "sessionDate": "2025-08-11"
}
```

**Response (200)**
```json
{
  "taskType": "TUTORIAL",
  "rateCode": "TU1",
  "rateVersion": "EA-2023-2026-Schedule1:v1.0.0",
  "qualification": "STANDARD",
  "repeat": false,
  "deliveryHours": 1.0,
  "associatedHours": 2.0,
  "payableHours": 3.0,
  "hourlyRate": 65.77,
  "amount": 197.31,
  "formula": "1h delivery + 2h associated",
  "clauseReference": "Schedule 1 Item 1",
  "sessionDate": "2025-08-11"
}
```

Notes:
- Financial values are read-only and must be discarded after a timeout; always re-request before persisting.
- Validation errors (HTTP 400) include calculator rule breaches (e.g., negative hours, repeat tutorial outside seven-day window).
- HTTP 404 indicates no policy coverage for the supplied inputs.

## Configuration Endpoint

### GET `/timesheets/config`
Publishes the server-side source of truth for UI validation. The response mirrors `TimesheetsConfigResponse`:

```json
{
  "hours": { "min": 0.1, "max": 10.0, "step": 0.1 },
  "weekStart": { "mondayOnly": true },
  "currency": "AUD"
}
```

Notes:
- Clients must always consult this endpoint on load; hard-coded ranges or currency strings drift quickly with policy updates.
- `weekStart.mondayOnly` enforces the Monday guard for both quotes and persistence.
- Consumers should tolerate new fields added under `hours`, `weekStart`, or top-level keys.

## Persistence Endpoints

### POST `/timesheets`
Creates a new timesheet entry. **Only authors with `ADMIN` or `LECTURER` roles are authorised to call this endpoint; tutor-authenticated requests are rejected with HTTP 403.** Clients submit **only the instructional data** (who, what, when). The backend recalculates financial values using the EA Schedule 1 calculator and ignores any monetary fields that might be present.

```json
{
  "courseId": 101,
  "tutorId": 2,
  "weekStartDate": "2025-08-11",
  "taskType": "TUTORIAL",
  "sessionDate": "2025-08-11",
  "deliveryHours": 1.0,
  "qualification": "STANDARD",
  "repeat": false,
  "description": "Tutorial delivery and preparation"
}
```

The application service reruns `Schedule1Calculator`, updates rate metadata, and persists the authoritative totals. A successful response mirrors the stored entity:

```json
{
  "id": 5,
  "taskType": "TUTORIAL",
  "qualification": "STANDARD",
  "repeat": false,
  "deliveryHours": 1.0,
  "associatedHours": 2.0,
  "payableHours": 3.0,
  "hourlyRate": 65.77,
  "amount": 197.31,
  "rateCode": "TU1",
  "rateVersion": "EA-2023-2026-Schedule1:v1.0.0",
  "formula": "1h delivery + 2h associated",
  "clauseReference": "Schedule 1 Item 1",
  "sessionDate": "2025-08-11"
}
```

### PUT `/timesheets/{id}`
Updates an existing entry using the same rules as `POST`. The payload excludes calculator-managed fields; any provided values are ignored. The service recalculates against the current policy version and persists the new totals.

## Retrieval

- `GET /timesheets/config` shares SSOT validation rules for UI clients.
- `GET /timesheets` supports filtering by tutor, course, date range, and status. Responses include calculator outputs for transparency.
- `GET /timesheets/{id}` returns a single entry with all SSOT fields.
- `GET /timesheets/pending-final-approval` returns the lecturer-confirmed queue awaiting administrator (HR) action. Lecturers only receive rows for tutors assigned to their courses; unassigned combinations trigger `403` ProblemDetails.

## Error Handling

| Code | Scenario |
|------|----------|
| 400  | Validation failure (missing fields, delivery hour limits, tutorial repeat outside window) |
| 403  | Permission failure (tutor-course assignment missing, role mismatch, or lecturer accessing another course's queue). ProblemDetails payload always includes `traceId` for correlation. |
| 404  | Timesheet not found or no policy coverage |
| 409  | Approval workflow conflict |

## Testing

- `Schedule1PolicyProviderTest` and `Schedule1CalculatorTest` cover policy resolution and calculation rules.
- `TimesheetControllerIntegrationTest` verifies the quote endpoint and server-side recalculation paths.
- Playwright E2E test `quote-calculation-flow.spec.ts` asserts that the frontend only sends minimal fields and displays backend totals.

## Related Specifications

- `docs/openapi/` ? update `paths/timesheets.yaml` and related schemas when contracts change.
- `docs/policy/backend-ssot.md` *(planned)* ? governance for SSOT expectations.
- `docs/frontend/architecture.md` *(planned)* ? frontend quote consumption details.
