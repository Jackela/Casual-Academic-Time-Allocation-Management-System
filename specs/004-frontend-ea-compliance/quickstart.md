# Quickstart: Frontend EA Compliance Wiring

This guide summarizes how to validate the EA-compliant wiring for feature `004-frontend-ea-compliance`.

## Endpoints used by the frontend

- Tutor dashboard list: `GET /api/timesheets/me`
- Lecturer pending queue: `GET /api/timesheets/pending-approval`
- Admin/HR pending queue: `GET /api/approvals/pending`
- Tutor confirmation: `PUT /api/timesheets/{id}/confirm`
- Approval history: `GET /api/approvals/history/{timesheetId}`

## Local testing

1) Install and run frontend

```bash
cd frontend
npm ci
npm run dev
```

2) Unit tests (targeted)

```bash
# Services (new endpoints)
npm run test -- src/services/timesheets.test.ts

# Dashboard and tables
npm run test -- src/components/dashboards/TutorDashboard/TutorDashboard.test.tsx -t tutor-scoped
npm run test -- src/components/shared/TimesheetTable/TimesheetTable.test.tsx -t US2

# Approval history UI
npm run test -- src/components/shared/TimesheetDetail/ApprovalHistory.test.tsx
```

3) Behavior expectations

- TutorDashboard only fetches current user’s timesheets.
- Clicking Approve (Lecturer role) triggers confirm→approve in that order.
- TimesheetDetail displays Approval History when present; shows empty state when none.
- Pending queues use the role-appropriate endpoints and show empty states when no items.

## Notes

- Confirmation is idempotent; repeating it should not fail. UI shows a friendly “Already confirmed” notice when applicable.
- E2E test runs require backend/API reachable at `api:8080` per project docker compose.

