# CATAMS System Workflow and Functionality Report

## Core Workflows

### Timesheet Creation
- **Initiation:** New timesheets are initiated by lecturers (for their own courses) or administrators (for any tutor) using the secured `POST /api/timesheets` endpoint, which now enforces `@PreAuthorize("hasAnyRole('ADMIN','LECTURER')")`. Tutors can no longer open the creation flow; they only interact with drafts that were created on their behalf (TimesheetController.java:77-100, DefaultTimesheetPermissionPolicy.java:144-172).
- **Input capture:** The form collects course, task type, qualification band, repeat flag, delivery hours, and descriptive notes. Currently the course list is a static placeholder (`CS101`, `CS102`), while task type and qualification enumerate the EA-aligned values (TimesheetForm.tsx:588-738, TimesheetTaskType.java:8-16, TutorQualification.java:9-16).
- **Real-time quote:** Every material input change triggers `POST /api/timesheets/quote`, returning authoritative associated hours, payable hours, rate code, hourly rate, total amount, and clause reference. The UI renders these values read-only to embody the SSOT policy (TimesheetForm.tsx:351-738, TimesheetService.quoteTimesheet call at TimesheetForm.tsx:477-505, TimesheetController.java:63-76, docs/policy/timesheet-ssot.md).
- **Submission:** When a tutor submits, the frontend omits all calculator-managed fields; the backend recalculates using `Schedule1Calculator` before persisting and responds with the stored totals (TimesheetController.java:79-120, TimesheetApplicationService.java:216-270, docs/backend/api-timesheets.md). Creation enforces one timesheet per tutor/course/week and Monday-aligned week start dates (TimesheetApplicationService.java:306-369).
- **Post-submission visibility:** Freshly saved drafts or pending items surface in the Tutor Dashboard table and in the role-specific dashboard summaries that are driven by `DashboardServiceImpl` aggregations (DashboardServiceImpl.java:42-147).

### Approval Cycle
- **Status model:** The workflow progresses through `DRAFT → PENDING_TUTOR_CONFIRMATION → TUTOR_CONFIRMED → LECTURER_CONFIRMED → FINAL_CONFIRMED`, with `REJECTED` and `MODIFICATION_REQUESTED` as exception states (ApprovalStatus.java:17-126).
- **Tutor confirmation:** Tutors review submitted timesheets awaiting their acknowledgement and issue `TUTOR_CONFIRM` actions from the dashboard table. The UI exposes the `Confirm` button only when the status and capability matrix allow it (TimesheetActions.tsx:59-118, tutor-capabilities.ts:9-24, ApprovalAction.java:21-59, Timesheet.java:536-544).
- **Lecturer approval:** Lecturer dashboards show pending tutor-confirmed rows with bulk selection, urgency filters, and a rejection modal for feedback. Approvals call `LECTURER_CONFIRM`, while rejection paths open a reason modal (LecturerDashboardShell.tsx:35-309, LecturerFiltersPanel.tsx:9-87, LecturerPendingTable.tsx:15-146, Timesheet.java:550-558).
- **Admin/HR finalisation:** Admins see lecturer-confirmed rows, perform final approval via `HR_CONFIRM`, or reject with justification (AdminDashboardShell.tsx:24-209, AdminPendingReviewPanel.tsx:7-48, AdminRejectionModal.tsx:9-156, ApprovalAction.java:42-73, Timesheet.java:564-572).
- **State transitions & audit:** Each action appends an approval history entry and enforces state machine invariants, ensuring users cannot re-confirm or edit finalised entries (Timesheet.java:501-639, ApprovalAction.java:128-219, ApprovalApplicationService.java:49-160).

### Modification Requests
- Lecturers and admins can request edits instead of rejecting or approving by issuing `REQUEST_MODIFICATION`. The domain layer transitions the entry back to `MODIFICATION_REQUESTED`, requires a comment, and exposes the action to tutors for resubmission (ApprovalAction.java:77-109, Timesheet.java:596-606). Tutors regain edit/submit capabilities in this status while the UI surfaces the feedback note at the top of the form (TimesheetForm.tsx:566-605, tutor-capabilities.ts:11-24).
- End-to-end tests assert the guard-rails around this workflow, confirming only lecturers/admins can trigger the action and that tutors must resubmit before the item re-enters the approval cycle (frontend/e2e/real/workflows/timesheet-exception-workflows.spec.ts:82-206).

### Rejection
- Rejections require a justification and immediately move the record to the terminal `REJECTED` state, preventing further submissions until a new timesheet is created (Timesheet.java:577-591, ApprovalStatus.java:69-119). The admin UI enforces the comment requirement in its modal, and the tutor dashboard displays the rejection banner with the provided message (AdminRejectionModal.tsx:9-140, TimesheetForm.tsx:566-605).
- E2E coverage validates that rejected items remain locked and that tutors cannot bypass the restriction via API calls (frontend/e2e/real/workflows/timesheet-exception-workflows.spec.ts:208-283).

## Page Functionality by Role

### Tutor Experience

#### Tutor Dashboard
- **Overview panels:** Quick stats summarise total earnings, hours, average weekly contribution, and draft/in-progress counts derived from tutor metrics (useTutorDashboardViewModel.ts:171-227, QuickStats.tsx:6-65).
- **Progress & support:** Sidebar widgets show completion progress, pay summary, workload deadlines, and curated support resources to guide compliance (TutorDashboard.tsx:137-336).
- **Timesheet table:** Tutors see course, hours, calculated totals, rate metadata, and action buttons that respect the capability matrix, with batch submission available for drafts they are allowed to edit or resubmit (TimesheetTable.tsx:90-284, TimesheetActions.tsx:59-118).
- **Notifications:** Inline banners surface submission outcomes, quote errors, or action locks to keep the user informed (TutorDashboard.tsx:188-470).

#### Timesheet Form & Modal
- **Inputs:** Course selection (currently static placeholder), task type, qualification, repeat checkbox, week picker (Monday enforced), delivery hours, and descriptive notes (TimesheetForm.tsx:588-745).
- **Calculation summary:** Read-only cards display rate code, qualification, associated/payable hours, hourly rate, total amount, clause reference, and formula with live updates per quote (TimesheetForm.tsx:695-739).
- **Validation & autosave:** Client validation enforces EA limits and Monday/week rules, provides error messaging, and periodically autosaves draft state (TimesheetForm.tsx:323-415, 675-693).
- **Submission flow:** For tutors, the form is used to update or confirm timesheets that a lecturer or administrator created; the submit handler refreshes the cache after calling the appropriate mutation (TimesheetForm.tsx:513-555, useTutorDashboardViewModel.ts:107-162).

### Lecturer Experience

#### Lecturer Dashboard
- **Creation entry points:** Dedicated actions allow lecturers to initiate new timesheets for tutors assigned to their courses; submissions flow through the secured backend endpoint that accepts only lecturer/admin principals (TimesheetController.java:77-100).
- **Summary banner:** Displays welcome message, urgent count, and metrics such as pending approvals, total timesheets, current-week hours/pay, and lecturer-approved totals (LecturerSummaryBanner.tsx:8-77).
- **Filtering tools:** Toggle for urgent-only queue, course filter dropdown populated from lecturer-authorised courses, free-text search, and refresh with loading states (LecturerFiltersPanel.tsx:9-87).
- **Pending table:** Shows tutor and course context, timesheet financials, status badges, and action buttons. Batch approval/rejection is available when all selected rows share compatible statuses (LecturerPendingTable.tsx:15-170).
- **Error handling:** Global banners surface approval errors with expandable details; rejection modal requires explanatory text before submitting `REJECT` (LecturerDashboardShell.tsx:107-324).
- **Data pipeline:** Metrics and tables are sourced from `DashboardServiceImpl` lecturer aggregations and `TimesheetService.getPendingTimesheets`, respecting access control (DashboardServiceImpl.java:85-173, TimesheetService.java:198-219, usePendingTimesheets.ts:21-88).

### Admin Experience

#### Admin Dashboard
- **Header controls:** Search field, dashboard refresh with lockable state, urgent indicator combining escalation counts (AdminDashboardHeader.tsx:10-63).
- **Metrics panel:** System-wide totals for timesheets, approvals pending, hours, payroll, and active tutor coverage, backed by admin-role aggregates (AdminMetricsPanel.tsx:9-78, DashboardServiceImpl.java:174-258).
- **Creation capabilities:** Admins can raise timesheets on behalf of any tutor when operational adjustments are required, leveraging the same restricted creation endpoint as lecturers (TimesheetController.java:77-100).
- **Tabs:** Overview (metrics) and Pending Review (final approval queue). Additional tabs (`User Management`, `Reports`, `Settings`) are flagged “Coming soon” in navigation (AdminNavTabs.tsx:8-47).
- **Pending review panel:** Presents lecturer-confirmed rows with multi-selection, action state tracking, and reject modal launching (AdminPendingReviewPanel.tsx:11-46).
- **Rejection flow:** Admins must provide a descriptive reason; the modal displays tutor/course context and disables confirmation until validation passes (AdminRejectionModal.tsx:9-156).

#### Admin User Management
- **Dedicated page:** Accessible at `/admin/users`, allowing admins to list, search (by name/email), and create users with assigned roles and temporary passwords (AdminUsersPage.tsx:24-231).
- **Backend support:** Protected REST endpoints (`GET/POST /api/users`) enforce admin-only access and operate through `UserService` (UserController.java:31-72).
- **Feedback & error handling:** The page surfaces loading states, form validation, submission feedback, and modal dialogs with accessibility hooks (AdminUsersPage.tsx:50-224).

## Role-Based Permissions & Definitions
- **Creation and editing:** Admins and lecturers can create or edit timesheets for any tutor/course they manage; tutors are limited to their own records. Status-aware rules ensure only draft or modification-requested entries are editable (DefaultTimesheetPermissionPolicy.java:101-279).
- **View access:** Tutors see personal records, lecturers see courses they coordinate, and admins have unrestricted visibility. Additional policies govern dashboard access and course budget views (DefaultTimesheetPermissionPolicy.java:184-272).
- **Approval actions:** `ApprovalAction` enumerates permitted transitions per role, with tutors limited to submissions and confirmations, lecturers able to submit, confirm, reject, or request modifications, and admins able to perform any action including final approval (ApprovalAction.java:21-115).
- **Task type & qualification dictionaries:** The application recognises EA Schedule 1-aligned task types (`LECTURE`, `TUTORIAL`, `ORAA`, `DEMO`, `MARKING`, `OTHER`) and qualification tiers (`STANDARD`, `PHD`, `COORDINATOR`), ensuring consistent rate resolution across UI and backend (TimesheetTaskType.java:8-16, TutorQualification.java:9-16, TimesheetForm.tsx:620-656).

## Data & API Sources
- **Quote contract:** `TimesheetQuoteRequest` and `TimesheetQuoteResponse` define the minimal payload and full calculator output returned by `/api/timesheets/quote` (TimesheetQuoteRequest.java:14-73, docs/backend/api-timesheets.md).
- **Persistence contract:** `TimesheetCreateRequest` and `TimesheetUpdateRequest` illustrate validation constraints while the backend recalculates financials before saving (TimesheetCreateRequest.java:23-164, TimesheetUpdateRequest.java:23-162, TimesheetController.java:79-123).
- **Timesheet response schema:** API responses include tutor/course metadata, delivery/associated hours, rate code, formula, clause reference, editability flags, rejection reason, and approval history (TimesheetResponse.java:24-212).
- **Dashboard aggregates:** `DashboardSummaryResponse` bundles counts, pending items, budget usage, and workload analysis tailored per role (DashboardSummaryResponse.java:15-92). Pending items classify into approval, modification, HR review, budget, and system alerts with priority levels (PendingItem.java:17-73, PendingItemType.java:9-17, Priority.java:9-16).

## Alignment with Source Requirements
- The original brief emphasised lecturer entry, tutor visibility, dual approval, and HR final review. These stages are implemented in code and UI components described above, maintaining transparency through dashboards and read-only EA calculations (docs/product/requirements/Individual-Casual Academic Time Allocation Management System (CATAMS).pdf, docs/frontend/ux-spec.md, docs/product/user-guide.md).
- SSOT and EA compliance mandates—quote-on-change, server-side recalculation, clause display, and audit trail—are enforced across controllers, services, and UI (docs/policy/timesheet-ssot.md, docs/backend/api-timesheets.md, TimesheetController.java:63-164, TimesheetForm.tsx:695-739).

## Observations & Considerations
- **Course selection data:** The tutor form currently seeds a static course list; integrating it with the authenticated user’s course assignments (likely via a course API) will be necessary before production (TimesheetForm.tsx:596-599).
- **Modification UI gaps:** While backend and tests support `REQUEST_MODIFICATION`, the lecturer/admin dashboards presently surface reject/approve actions. Extending the UI to offer “Request changes” would expose the full workflow defined in `ApprovalAction` (TimesheetActions.tsx:99-118).
- **Tab placeholders:** Admin navigation advertises upcoming `User Management`, `Reports & Analytics`, and `System Settings` tabs; only the overview and pending review content are active today (AdminNavTabs.tsx:8-47, AdminDashboardShell.tsx:96-207).

This report consolidates the implemented workflows and role-specific interfaces across the CATAMS codebase, ensuring that engineering, product, and UX stakeholders share a consistent understanding of current capabilities and outstanding gaps.
