# Research: Frontend EA Compliance Wiring

## Decisions
- Centralize confirm→approve workflow in shared TimesheetTable action handler.
- Role-based pending queues: Lecturer → `/api/timesheets/pending-approval`, Admin/HR → `/api/approvals/pending`.
- Service functions to add in `frontend/src/services/timesheets.ts`:
  - `getMyTimesheets()` → GET `/api/timesheets/me`
  - `getMyPendingTimesheets()` → GET `/api/timesheets/pending-approval`
  - `confirmTimesheet(id)` → PUT `/api/timesheets/{id}/confirm`
  - `getApprovalHistory(timesheetId)` → GET `/api/approvals/history/{timesheetId}`
  - `getPendingApprovals()` → GET `/api/approvals/pending`

## Rationale
- Single source of truth avoids duplicated logic and inconsistent flows across pages.
- Aligns payloads/endpoints with each role’s mental model, minimizing UI transformation.
- Keeps backend unchanged per requirement; reduces regression surface.

## Alternatives Considered
- Unify all pending into `/api/approvals/pending` for every role: rejected due to additional mapping and loss of clarity for timesheet-centric Lecturer views.
- Implement a new ApprovalWorkflow component and refactor all pages: heavier refactor, higher risk, less incremental.
