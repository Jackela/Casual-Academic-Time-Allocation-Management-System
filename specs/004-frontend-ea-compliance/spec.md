# Feature Specification: Frontend EA Compliance Wiring

**Feature Branch**: `[004-frontend-ea-compliance]`  
**Created**: 2025-11-03  
**Status**: Draft  
**Input**: User description: "All modifications are concentrated in the Frontend. The Backend already provides all Enterprise Agreement (EA)–compliant endpoints, but the Frontend does not call five key ones. The current Frontend (e.g., Tutor view list and Tutor submission) bypasses the required “Tutor confirmation” step and lacks the “audit trail” feature. You must modify the Frontend to call the existing Backend endpoints to meet CATAMS and EA compliance requirements. Backend: no change needed. The five unused endpoints (/api/timesheets/me, /api/timesheets/pending-approval, /api/timesheets/{id}/confirm, /api/approvals/history/{timesheetId}, /api/approvals/pending) must stay; they are required for workflow compliance. Frontend—Service layer: add five new functions in frontend/src/services/timesheets.ts: (1) getMyTimesheets() → GET /api/timesheets/me; (2) getMyPendingTimesheets() → GET /api/timesheets/pending-approval; (3) confirmTimesheet() → PUT /api/timesheets/{id}/confirm; (4) getApprovalHistory() → GET /api/approvals/history/{timesheetId}; (5) getPendingApprovals() → GET /api/approvals/pending. Frontend—Component layer: update three main React components to use them. (1) TutorDashboard: replace GET /api/timesheets with getMyTimesheets() so Tutors only see their own records. (2) ApprovalWorkflow: modify submission to a two-step process—“Submit” must first call confirmTimesheet() (PUT /api/timesheets/{id}/confirm) before going to Lecturer approval. (3) TimesheetDetailView: add an “Approval History” section calling getApprovalHistory() to show a full audit log for HR and Lecturer. Summary: Backend logic is correct; Frontend is incomplete. Implement five service functions and update three core components to activate Tutor confirmation and audit history."

## Clarifications

### Session 2025-11-03

- Q: Where should the confirm→approve two-step workflow be enforced in the UI for consistency? → A: Centralize in the shared TimesheetTable action handler (single source of truth across pages).
- Q: Which pending endpoint should each approver role use? → A: Lecturer uses GET /api/timesheets/pending-approval; Admin/HR use GET /api/approvals/pending.

## User Scenarios & Testing (mandatory)

### User Story 1 - Tutor sees only own timesheets (Priority: P1)

As a Tutor, I can view only my own timesheets so that my dashboard reflects my personal workload and status.

**Why this priority**: Prevents data leakage; foundational to compliant workflow.

**Independent Test**: Calling the dashboard list triggers GET /api/timesheets/me and returns only records belonging to the authenticated Tutor.

**Acceptance Scenarios**:
1. Given an authenticated Tutor, When opening TutorDashboard, Then the UI loads timesheets via /api/timesheets/me and shows only that Tutor’s records.
2. Given no records for the Tutor, When opening TutorDashboard, Then an empty state is displayed (no other users’ data).

---

### User Story 2 - Tutor confirmation step is explicit (Priority: P1)

As a Tutor, when I submit a drafted timesheet, the system requires an explicit Tutor confirmation before it moves to Lecturer approval.

**Why this priority**: EA compliance requires explicit confirmation by the Tutor prior to Lecturer approval.

**Independent Test**: Submitting a draft triggers PUT /api/timesheets/{id}/confirm and only then proceeds to Lecturer approval. The server responds 200 with a payload whose status is in {'PENDING_TUTOR_CONFIRMATION','TUTOR_CONFIRMED'}; the UI treats both as “Tutor confirmed” and allows Lecturer approval only when the status is 'TUTOR_CONFIRMED'.

**Acceptance Scenarios**:
1. Given a DRAFT timesheet, When Tutor clicks Submit, Then the app calls PUT /api/timesheets/{id}/confirm, receives 200, and the returned status is one of {'PENDING_TUTOR_CONFIRMATION','TUTOR_CONFIRMED'}. The UI enables the Lecturer approval path only when status is 'TUTOR_CONFIRMED'.
2. Given a non-DRAFT timesheet, When Tutor attempts confirmation, Then the UI disables or shows a validation message.
3. Given a timesheet already confirmed by Tutor, When Tutor repeats confirmation, Then the server returns 200 with unchanged status and the UI shows a non-blocking “Already confirmed” toast without changing navigation.

---

### User Story 3 - HR/Lecturer can view approval audit trail (Priority: P2)

As HR/Lecturer, I can see the approval history for a timesheet so that I can audit who acted and when.

**Why this priority**: EA compliance requires a transparent audit trail.

**Independent Test**: Viewing TimesheetDetail shows data loaded from GET /api/approvals/history/{timesheetId}.

**Acceptance Scenarios**:
1. Given a timesheet with history, When opening TimesheetDetailView, Then an “Approval History” section displays actor, action, timestamp, and comments.
2. Given no history, When opening TimesheetDetailView, Then the section shows an empty state.

---

### User Story 4 - Approver sees pending items (Priority: P2)

As a Lecturer/HR/Admin, I can view pending approvals via the dedicated endpoints so that I can action what’s required.

**Why this priority**: Ensures approvers work from compliant queues.

**Independent Test**: Calling getMyPendingTimesheets() loads /api/timesheets/pending-approval; calling getPendingApprovals() loads /api/approvals/pending.

**Acceptance Scenarios**:
1. Given pending items exist, When an approver opens their queue, Then items are fetched from the correct endpoints.
2. Given no pending items, When an approver opens the queue, Then an empty state is shown.

### Edge Cases
- Network failure during confirmation: UI reports failure (toast), does not advance workflow, and allows retry.
- Unauthorized user attempts to load approvals: UI shows access error; no data leaked.
- Timesheet already confirmed (idempotent): PUT /confirm returns 200 with unchanged status; UI shows a non-blocking “Already confirmed” toast and remains on the current screen.

## Requirements (mandatory)

### Functional Requirements
- **FR-001**: Frontend MUST call GET /api/timesheets/me for TutorDashboard list (not generic /api/timesheets with tutorId).
- **FR-002**: Frontend MUST call PUT /api/timesheets/{id}/confirm before enabling Lecturer approval flow.
  - Server response MUST be 200 with payload status in {'PENDING_TUTOR_CONFIRMATION','TUTOR_CONFIRMED'}.
  - Repeated confirm MUST be idempotent: return 200 with unchanged status; UI shows a non-blocking “Already confirmed” toast.
- **FR-003**: Frontend MUST call GET /api/approvals/history/{timesheetId} and render an “Approval History” section in TimesheetDetailView.
- **FR-004**: Frontend MUST implement service functions in frontend/src/services/timesheets.ts: getMyTimesheets, getMyPendingTimesheets, confirmTimesheet, getApprovalHistory, getPendingApprovals.
- **FR-005**: Frontend MUST call GET /api/timesheets/pending-approval and GET /api/approvals/pending for pending queues used by approvers.
  - Lecturer queue MUST use GET /api/timesheets/pending-approval.
  - Admin/HR queue MUST use GET /api/approvals/pending.
- **FR-006**: Existing backend endpoints MUST remain unchanged; only the frontend wiring changes.
- **FR-007**: The confirm→approve two-step workflow MUST be centralized in the shared TimesheetTable action handler so all dashboards/views using it inherit compliant behavior consistently.

### Key Entities
- **Timesheet**: id, tutorId, courseId, status, hours, description, rates, dates.
- **ApprovalEvent**: timesheetId, actor(role/id), action, timestamp, comment.

## Success Criteria (mandatory)

### Measurable Outcomes
- **SC-001**: 100% of TutorDashboard list loads use /api/timesheets/me (validated via tests/mocks).
- **SC-002**: 100% of “Submit” actions perform PUT /api/timesheets/{id}/confirm before any Lecturer approval call.
- **SC-003**: Approval History section appears for 95%+ timesheet detail views with history data under normal conditions.
- **SC-004**: Approver pending views use the correct endpoints and complete under 2 seconds median in test env.
