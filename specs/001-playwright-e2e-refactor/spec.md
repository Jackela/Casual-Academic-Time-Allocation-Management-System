# Feature Specification: Refactor CATAMS Playwright E2E (frontend/e2e/real)

**Feature Branch**: [001-playwright-e2e-refactor]  
**Created**: 2025-10-22  
**Status**: Draft  
**Input**: User description: "Title: Refactor CATAMS Playwright E2E (frontend/e2e/real) Context / Why: - Core frontend and backend logic has changed: Timesheet creation is now restricted to Lecturers/Admins; Tutor creation UI removed; Lecturer creation UI added; Admin User Management API (PATCH activate/deactivate) is available; DTOs no longer accept calculated financial fields; Old E2E tests are partially inaccurate in selectors, assertions, workflows, and permissions. Goals (What): 1) Identify and remove obsolete test cases related to the previous Tutor self-creation workflow and assertions; 2) Update still-valid test cases (selectors, assertions, workflows) to align with the current UI structure (e.g., LecturerDashboardShell, AdminUsersPage) and API contracts (SSOT); 3) Ensure critical user paths are covered by E2E tests (prioritized P0 > P1): P0: Lecturer successfully creates a Timesheet (happy path); Tutor is restricted (negative path); Full approval chain (Draft -> Tutor Confirm -> Lecturer Approve -> Admin Approve); P1: Modification request and rejection flows (Lecturer/Admin), including visibility of notifications/status changes; P1: Admin user management (create user, activate/deactivate, including form validation for password policies and success feedback); 4) Improve stability and readability: unify Page Object Model usage; unify data-testid usage; remove brittle selectors; reduce arbitrary waits; 5) Ensure regression reliability: 'npm run test:e2e:real' passes 100% in a stable environment. Non-Goals (Out of Scope): - Do not refactor unit/component tests in this task (plan separately); - Do not introduce new backend test data channels (prioritize reusing existing factory/seed; if missing, design minimally in the plan). Success Criteria: - All P0 use cases are added or fixed, and pass; P1 use cases cover at least the happy path; - Old files related to the Tutor creation path are cleaned up; Commit/PR messages clearly justify deletions/changes/additions; - Key assertions cover both UI and contract layers (OpenAPI fields, status codes, error semantics are consistent). Risks & Mitigations: - Brittle selectors -> Unify via data-testid; - Environment instability -> Define clear login strategy (UI for smoke, Programmatic Login for others), reduce unnecessary network dependencies; - Contract drift -> Use OpenAPI as SSOT, prioritize contract alignment in case of discrepancies, add comments and TODOs. Deliverable: - Generate 'specs/e2e-refactor/spec.md' (this document), and create branch 'e2e-refactor/playwright-real-tests'."

## Clarifications

### Session 2025-10-22

- Q: What password policy must Admin user creation enforce? → A: Min 8 chars; at least 1 upper, 1 lower, 1 digit, 1 special.
- Q: Where are notifications presented? → A: In-app banner + status badge on the item.
- Q: Can Admin approve without Lecturer approval? → A: Admin approval requires prior Lecturer approval.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lecturer creates timesheet (Priority: P0)

Lecturer can create a new timesheet successfully following the updated UI flows and permissions, without entering any calculated financial fields.

**Why this priority**: Critical path for payroll operations and timesheet submission.

**Independent Test**: Create a timesheet from Lecturer dashboard, verify SSOT behaviour (server-calculated fields only) and success confirmation.

**Acceptance Scenarios**:

1. Given a Lecturer is authenticated and on LecturerDashboardShell, When they create a timesheet with valid instructional inputs, Then the system saves it and displays a success state with server-computed financial results.
2. Given server returns validation errors for instructional inputs, When the Lecturer submits, Then the UI shows clear inline errors and prevents submission.
3. Given SSOT policy, When the Lecturer attempts to supply any financial fields, Then the system ignores client values and persists server-calculated fields only.

---

### User Story 2 - Tutor is restricted from creating timesheets (Priority: P0)

Tutor cannot create a timesheet and is guided to the correct flow/permissions.

**Why this priority**: Prevents policy violations and invalid data entry.

**Independent Test**: Login as Tutor and attempt to access creation entry point; verify restriction messaging and absence of creation UI.

**Acceptance Scenarios**:

1. Given a Tutor is authenticated, When they navigate to timesheet creation entry points, Then access is denied and they see a clear restriction message.
2. Given role-based routes, When a Tutor deep-links to a creation URL, Then the system redirects to an allowed location with an explanation.

---

### User Story 3 - Full approval chain (Priority: P0)

End-to-end approval flow from Draft → Tutor Confirm → Lecturer Approve → Admin Approve.

**Why this priority**: Ensures core business workflow and compliance.

**Independent Test**: Progress a single timesheet through the full chain, verifying visible status changes and final approval state.

**Acceptance Scenarios**:

1. Given a Draft timesheet exists, When the Tutor confirms, Then status becomes Tutor Confirmed and a confirmation indicator is visible to the Lecturer.
2. Given Tutor Confirmed, When Lecturer approves, Then status becomes Lecturer Approved and is visible to Admin.
3. Given Lecturer Approved, When Admin approves, Then status becomes Fully Approved and is visible in Admin dashboards with audit metadata.
4. Given a timesheet is not yet Lecturer Approved, When Admin attempts to approve, Then the action is rejected with an explanatory message and no status change.

---

### User Story 4 - Modification request and rejection (Priority: P1)

Lecturer/Admin can request modifications or reject a timesheet with visibility of notifications and status changes.

**Why this priority**: Common exception flow impacting throughput and user clarity.

**Independent Test**: Trigger a modification request and a rejection; verify status transitions and notifications display.

**Acceptance Scenarios**:

1. Given a submitted timesheet, When Lecturer requests modification with a reason, Then status updates to Needs Modification and the Tutor sees an in-app banner and a status badge on the item with the reason text.
2. Given a submitted timesheet, When Admin rejects with a reason, Then status updates to Rejected and the originator sees an in-app banner and a status badge with the rejection reason.

---

### User Story 5 - Admin user management (Priority: P1)

Admin can create users and activate/deactivate accounts with clear validation and feedback.

**Why this priority**: Operational need for account lifecycle management.

**Independent Test**: Create a user; activate/deactivate; verify validation messages and feedback banners.

**Acceptance Scenarios**:

1. Given an Admin is on AdminUsersPage, When they create a user with valid inputs, Then the user appears in the list with Active status.
2. Given password policy (min 8 chars; ≥1 upper, ≥1 lower, ≥1 digit, ≥1 special), When inputs fail policy, Then the form displays precise validation messages and blocks submission.
3. Given a user exists, When Admin deactivates the user, Then status changes to Inactive and login is prevented; reactivation restores access.

---

### Edge Cases

- Deactivated user attempts to log in; system prevents access with clear message.
- Stale quote detected; user prompted to refresh before saving to satisfy SSOT.
- Concurrent approval/modify operations; later action is rejected with an explanation.
- Deep-link access to forbidden pages respects role restrictions and provides guidance.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Only Lecturers/Admins can initiate timesheet creation; Tutors are restricted with explanatory messaging.
- **FR-002**: Timesheet create/update accepts instructional inputs only; system ignores client-sent financial fields in line with SSOT policy.
- **FR-003**: Successful timesheet creation shows server-computed financial results and a success acknowledgment.
- **FR-004**: Validation errors are presented inline with field-specific messages; submission is blocked until resolved.
- **FR-005**: Full approval chain supports state transitions: Draft → Tutor Confirm → Lecturer Approve → Admin Approve with visible status across roles.
- **FR-006**: Modification requests capture a reason and update status to Needs Modification; the originator sees the reason and can edit/resubmit.
- **FR-007**: Rejection captures a reason and updates status to Rejected; the originator sees the reason.
- **FR-008**: Admin can create users with required fields and receives confirmation on success.
- **FR-009**: Admin can activate/deactivate users; deactivated users cannot authenticate; reactivation restores access.
- **FR-010**: Notifications for modification/rejection are visible to the impacted party in their primary dashboard context and surfaced via an in-app banner and a status badge on the affected item (including reason text).
- **FR-011**: All primary flows avoid brittle selectors by using stable data attributes for UI element targeting.
- **FR-012**: Automated wait strategies avoid arbitrary sleeps; interactions proceed when UI is ready.
- **FR-013**: Key assertions verify both UI state and alignment with documented request/response semantics.
- **FR-014**: E2E coverage prioritizes P0 flows; P1 flows ensure at least one happy path per scenario.
- **FR-015**: Contract alignment is treated as the source of truth; discrepancies are documented and resolved.
- **FR-016**: Password policy is enforced for Admin user creation: minimum 8 characters with at least one uppercase, one lowercase, one digit, and one special character; violations produce specific field errors.
- **FR-017**: Admin approval requires prior Lecturer approval; attempts to approve earlier are rejected with an explanatory message and no status change.

### Key Entities *(include if feature involves data)*

- **Timesheet**: Instructional inputs, server-calculated financial results, and approval status.
- **User**: Roles (Tutor, Lecturer, Admin) with permissions impacting available actions.
- **Approval**: State transitions with reasons where applicable.
- **Notification**: User-facing indicators/messages for status changes and requests.
- **AdminAction**: Create user; activate/deactivate; validation outcomes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All P0 user scenarios complete successfully without errors in a stable test environment.
- **SC-002**: P1 scenarios cover at least one complete, successful path each.
- **SC-003**: All UI element interactions use standardized, stable selectors; no brittle selectors remain.
- **SC-004**: User-facing validation and status messages are clear and specific for all covered flows.
- **SC-005**: Primary flows complete within reasonable user interaction time (under 3 minutes per flow) without undue waiting.
- **SC-006**: For any discrepancy with documented contracts, outcomes are documented and reconciled before completion.

## Assumptions

- Test accounts exist for roles: Tutor, Lecturer, Admin, with stable credentials in the test environment.
- Existing seed/factory data supports creating and transitioning timesheets through the workflow.
- Programmatic login is used for most flows; UI login is limited to smoke validation unless specified otherwise.
- OpenAPI documented fields and error semantics represent the intended behavior and serve as SSOT for request/response validation.

