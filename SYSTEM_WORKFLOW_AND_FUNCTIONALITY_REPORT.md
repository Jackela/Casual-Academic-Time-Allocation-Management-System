# CATAMS System Workflow and Functionality Report

## Core Workflows

### Timesheet Creation
- **Initiation:** New timesheets originate from lecturers (limited to their assigned courses) or administrators (any tutor) through the secured `POST /api/timesheets` endpoint. Tutors cannot launch the creation flow; they only edit or confirm drafts issued on their behalf (TimesheetController.java, DefaultTimesheetPermissionPolicy.java).
- **Input capture:** `LecturerTimesheetCreateModal` hydrates tutor and course pickers from live APIs (`fetchLecturerCourses`, `fetchTutorsForLecturer`). `TimesheetForm` captures course, task type, session date, repeat flag, delivery hours, qualification (read-only), and description while reflecting the selected tutor’s attributes. EA enumerations for task type and qualification remain the authoritative option sets (TimesheetTaskType.java, TutorQualification.java, TimesheetForm.tsx).
- **Real-time quote:** Every meaningful change triggers `TimesheetService.quoteTimesheet` and renders associated hours, payable hours, rate code, hourly rate, total amount, formula, and clause reference as read-only SSOT fields (TimesheetForm.tsx, docs/policy/timesheet-ssot.md).
- **Submission:** The frontend submits only directive fields (tutorId, courseId, weekStartDate, sessionDate, deliveryHours, description, taskType, qualification, repeat). The backend recalculates financials via `Schedule1Calculator` and persists the definitive values (TimesheetApplicationService.java, docs/backend/api-timesheets.md). Domain rules enforce Monday week starts and one draft per tutor/course/week.
- **Post-submission visibility:** Drafts and pending items rehydrate immediately through React Query caches feeding the Tutor, Lecturer, and Admin dashboards (`useTimesheetQuery`, `useTimesheetDashboardSummary`, DashboardServiceImpl.java).

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
- **Quick actions:** Refresh and “View Pay Summary” are the sole tutor-facing quick actions, both implemented with lucide icons and permission-aware disabled states (TutorDashboard.tsx).
- **Overview panels:** Quick stats, completion progress, earnings breakdown, and deadlines are sourced from the tutor dashboard view model with skeleton, empty, and error fallbacks (useTutorDashboardViewModel.ts, QuickStats.tsx, CompletionProgress.tsx, UpcomingDeadlines.tsx).
- **Support resources:** Curated links adapt between empty placeholders and active resources using consistent copy styles (SupportResources.tsx).
- **Timesheet table:** Tutors see course metadata, calculated totals, EA clause references, and capability-gated action buttons with batch submission restricted to drafts they may confirm (TimesheetTable.tsx, TimesheetActions.tsx).
- **Notifications:** Inline banners and toast routes surface submission outcomes, quote errors, or action locks (TutorDashboard.tsx, notificationRouter.ts).

#### Timesheet Form & Modal
- **Inputs:** Lecturer mode loads tutor/course options from live APIs; tutor edit mode bypasses selectors and sets qualification/task type from the saved record. Common controls include Monday-enforced week picker, repeat toggle, delivery hours, and descriptive notes (LecturerTimesheetCreateModal.tsx, TimesheetForm.tsx).
- **Calculation summary:** Read-only fields render rate code, qualification, associated/payable hours, hourly rate, total amount, clause reference, and formula using the latest quote response (TimesheetForm.tsx).
- **Validation:** Client validation and server responses guard EA limits, ensuring quotes succeed before submission. Errors produce inline messaging and disable the submit CTA until resolved (TimesheetForm.tsx, useUiConstraints.ts).
- **Submission flow:** Tutors submit updates to drafts already created for them; lecturers and admins use the same component in creation mode. Successful mutations invalidate dashboard queries to keep tables in sync (TimesheetForm.tsx, useTimesheetCreate.ts, useTimesheetUpdate.ts).

### Lecturer Experience

#### Lecturer Dashboard
- **Creation entry points:** “Create Timesheet” opens a modal that loads lecturer-authorised tutors/courses, enforces read-only qualification, and submits via the lecturer/admin-protected endpoint (LecturerTimesheetCreateModal.tsx, TimesheetController.java).
- **Summary banner:** Displays welcome message, urgent count, and metrics such as pending approvals, total timesheets, current-week hours/pay, and lecturer-approved totals (LecturerSummaryBanner.tsx:8-77).
- **Filtering tools:** Toggle for urgent-only queue, course filter dropdown populated from lecturer-authorised courses, free-text search, and refresh with loading states (LecturerFiltersPanel.tsx:9-87).
- **Pending table:** Shows tutor/course context, financials, status badges, and action buttons with batch approval when rows share compatible states. Empty states now explain that approved records live in reporting archives instead of linking to placeholder pages (LecturerPendingTable.tsx).
- **Error handling:** Global banners surface approval errors with retry hooks, and the rejection modal requires descriptive comments before issuing `REJECT` (LecturerDashboardShell.tsx, AdminRejectionModal.tsx).
- **Data pipeline:** Metrics and tables are sourced from `DashboardServiceImpl` lecturer aggregations and `TimesheetService.getPendingTimesheets`, respecting access control (DashboardServiceImpl.java:85-173, TimesheetService.java:198-219, usePendingTimesheets.ts:21-88).

### Admin Experience

#### Admin Dashboard
- **Header controls:** Search field, dashboard refresh with lockable state, urgent indicator combining escalation counts (AdminDashboardHeader.tsx:10-63).
- **Metrics panel:** System-wide totals for timesheets, approvals pending, hours, payroll, and active tutor coverage, backed by admin-role aggregates (AdminMetricsPanel.tsx:9-78, DashboardServiceImpl.java:174-258).
- **Creation capabilities:** Admins can raise timesheets on behalf of any tutor when operational adjustments are required, leveraging the same restricted creation endpoint as lecturers (TimesheetController.java:77-100).
- **Tabs:** Navigation now exposes only the implemented tabs—Overview and Pending Approvals—to avoid signalling unavailable areas (AdminNavTabs.tsx, AdminDashboardShell.tsx).
- **Pending review panel:** Presents lecturer-confirmed rows with multi-selection, action state tracking, and reject modal launching (AdminPendingReviewPanel.tsx:11-46).
- **Rejection flow:** Admins must provide a descriptive reason; the modal displays tutor/course context and disables confirmation until validation passes (AdminRejectionModal.tsx:9-156).

#### Admin User Management
- **Dedicated page:** Accessible at `/admin/users`, allowing admins to list, search, create, edit, and activate/deactivate users. Password fields are masked and support secure random generation (AdminUsersPage.tsx).
- **Backend support:** Protected REST endpoints (`GET/POST/PATCH /api/users`) enforce admin-only access and operate through `UserService` (UserController.java).
- **Feedback & error handling:** The page surfaces loading states, form validation, submission feedback, and modal dialogs with accessibility hooks (AdminUsersPage.tsx).

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
- **Resource coverage:** Lecturer creation depends on course/tutor endpoints returning active assignments. Empty states are handled, but additional UX copy may be desirable when no tutors are linked to a lecturer (LecturerTimesheetCreateModal.tsx).
- **Modification UI gaps:** While backend and tests support `REQUEST_MODIFICATION`, the lecturer/admin dashboards presently surface reject/approve actions. Extending the UI to offer “Request changes” would expose the full workflow defined in `ApprovalAction` (TimesheetActions.tsx).
- **Future enhancements:** Reporting/analytics and system settings remain roadmap items; the admin navigation now only shows implemented tabs, so future releases should reintroduce additional tabs once the underlying features land (AdminNavTabs.tsx).

This report consolidates the implemented workflows and role-specific interfaces across the CATAMS codebase, ensuring that engineering, product, and UX stakeholders share a consistent understanding of current capabilities and outstanding gaps.
