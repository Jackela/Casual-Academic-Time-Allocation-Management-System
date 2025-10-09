# CATAMS Frontend UI/UX Design & Workflow Specification

*Last updated: 2025-10-08*  
*Created by: Autonomous UI/UX Audit Agent*

This document reverse-engineers the current React implementation (`frontend/src/`) of the Casual Academic Time Allocation Management System (CATAMS) to provide a consolidated source of truth for UI structure, interactive elements, and user workflows. It aligns observed behaviour with the product requirements captured in:

- `CATAMS_PM_Requirements_Assessment.md`
- `docs/stories/*.story.md` (notably Story 2.1 – Lecturer Approval Workflow)
- `docs/timesheet-approval-workflow-ssot.md`
- `docs/openapi.yaml`

The specification is organised by major user-facing views surfaced through the main router (`frontend/src/App.tsx`) and the shared dashboard layout (`frontend/src/components/DashboardLayout.tsx`).

---

## 1. Global Layout & Navigation

### 1.1 Application Shell
- **Component**: `DashboardLayout` (`frontend/src/components/DashboardLayout.tsx`)
- **Purpose**: Wraps all authenticated routes with a header, role-aware navigation bar, and main content container.
- **Key Elements**:
  - **Header**: Displays CATAMS brand, user name, role badge (`Badge` component) and a “Sign Out” button. Logout triggers `SessionProvider.signOut()` and redirects to `/login`.
  - **Navigation Tabs** (role-filtered):
    - `/dashboard` (always visible)
    - `/timesheets`, `/approvals` (lecturer)
    - `/users`, `/reports` (admin)
  - **Accessibility**: Uses semantic `<header>`, `<nav>`, `<main>`; nav items are `<NavLink>` with active state classes. The logout button supplies `title="Sign out"` but no `aria-label`; acceptable because button text is present.

### 1.2 Shared UI Primitives
- **Buttons**: `frontend/src/components/ui/button.tsx` (shadcn variant system). Primary actions vary by context (default vs. outline/destructive).
- **Cards**: `frontend/src/components/ui/card.tsx`; used for grouping stats, tables, and forms.
- **Badge**: Role-based variants for user header display.
- **TimesheetTable** (`frontend/src/components/shared/TimesheetTable/TimesheetTable.tsx`):
  - Dynamic column composition (`showTutorInfo`, `showCourseInfo`, action columns).
  - Action handlers vary by `actionMode` (`approval` vs `tutor`) and `approvalRole`.
  - Selection support (checkboxes) toggled via `showSelection`.
  - Supports virtualization threshold (currently computed but not applied).
  - Loading and empty states rendered inline with icons.

### 1.3 Backend & Data Utilities
- **API Client**: `secureApiClient` with centralized auth handling (`frontend/src/services/api-secure.ts`).
- **TimesheetService**: Maps UI actions to OpenAPI endpoints (see §4).
- **Access Control**: `useAccessControl` governs role gating across dashboards.

---

## 2. Page Specifications

### 2.1 Login Page
- **File**: `frontend/src/components/LoginPage.tsx`
- **Purpose**: Authenticates tutors, lecturers, and admins via `/api/auth/login`.
- **Layout**: Full-screen gradient background, centered `Card` with title/subtitle, form, and optional testing credentials (gated behind `__DEV_CREDENTIALS__`).
- **Interactive Elements**:

| Element | Description | States | Data Source / Hook | Backend Endpoint | Notes |
|---------|-------------|--------|--------------------|------------------|-------|
| Email `Input` | Captures username | Disabled when `loading` true | Local `useState` (`formData.email`) | POST `/api/auth/login` | Required attribute enforces HTML validation |
| Password `Input` | Captures password | Disabled when `loading` true | `formData.password` | POST `/api/auth/login` | Password masking via `type="password"` |
| `Sign In` Button | Submits credentials | Disabled if `loading`, or empty fields; label switches to “Signing in…” | `handleSubmit` | POST `/api/auth/login` | On success, triggers `AuthContext.login` and redirect |
| Success Banner | Confirms login | Visible if `success` state true | `setSuccess(true)` post-login | n/a | Auto-hidden on navigation |
| Error Banner | Displays error message | Visible when API error occurs | `setError(resolvedMessage)` | Derived from API error or fallback message | Security logging via `secureLogger.security` |

- **Workflow**:
  1. User fills email/password; button enables once both present.
  2. Submit → `secureApiClient.post('/api/auth/login')` → `AuthContext.login` stores token & user, `secureLogger.security` logs session.
  3. Redirect to prior route or `/dashboard`.
- **Requirements Alignment**:
  - `Story 4.1` (Centralized Authentication) – aligns with AC1/AC2 via `AuthManager`.
  - `CATAMS_PM_Requirements_Assessment` §3 highlights missing UX research; this page currently follows standard form UX but lacks multi-factor or help links.
  - OpenAPI `/auth/login` (docs/openapi.yaml lines ~43-70).

### 2.2 Tutor Dashboard
- **File**: `frontend/src/components/dashboards/TutorDashboard/TutorDashboard.tsx`
- **Purpose**: Enables tutors to view, create, edit, submit, and confirm timesheets while tracking pay and deadlines.
- **Layout** (rendered through `DashboardLayoutShell`):
  - **Header (`TutorHeader`)**: Welcome message, dashboard descriptor, optional action area.
  - **Quick Stats & Pay Panels** (`QuickStats`, `PaySummary`, `EarningsBreakdown`, etc.): Visual summaries of pay and workload.
  - **Notifications Panel**: Highlights rejected/draft counts and deadlines; supports dismiss action (`handleNotificationDismiss`).
  - **Main Timesheet Section**: Tabbed view (`tabs` from view model) with:
    - Draft management (bulk select + “Submit Selected” button).
    - Tutor confirmation actions (Confirm, Submit Draft, Edit) within `TimesheetTable`.
  - **Timesheet Form Modal**: Create/edit overlay triggered from CTA buttons.

- **Interactive Elements** (selected subset):

| Element | Description | States | Data Source / Hook | Backend Endpoint(s) | Notes |
|---------|-------------|--------|--------------------|---------------------|-------|
| “Create Timesheet” Button | Opens modal | Disabled when create mutation loading | `useTutorDashboardViewModel` | POST `/api/timesheets` | Resets `editingTimesheet` state |
| Timesheet Action Buttons | Edit, Submit Draft, Confirm | Disabled when `actionLoadingId` equals row id | `handleEditTimesheet`, `handleSubmitTimesheet`, `handleConfirmTimesheet` | PUT `/api/timesheets/{id}`, POST `/api/approvals` (mapped actions) | `TimesheetTable` `actionMode="tutor"` maps to actions |
| Bulk “Select All Drafts” Checkbox | Selects draft IDs | Checked state reflects `selectedTimesheets` array | `setSelectedTimesheets` | n/a | Submits multiple IDs (future workflow; submission preview only) |
| Timesheet Form Fields | Course, week, hours, description inputs | Validation errors, loading spinner | `TimesheetForm` | POST/PUT `/api/timesheets`, validation messages inline | Auto-saves description drafts every 30s (UI feedback “Draft saved”) |
| Notifications Dismiss | Removes deadline entry | n/a | `handleNotificationDismiss` updates local state | n/a | Ensures `visibleDeadlines` updates |

- **Workflows**:
  1. **Create Timesheet**: open modal → validate fields → `createTimesheet` -> refresh queries.
  2. **Edit Draft**: open modal with pre-filled data, update -> `updateTimesheet`.
  3. **Submit Draft**: triggers `TimesheetService.approveTimesheet` with action `SUBMIT_FOR_APPROVAL`.
  4. **Tutor Confirm**: `TimesheetService.approveTimesheet` with `TUTOR_CONFIRM`.
  5. **Bulk Submission**: UI present but underlying submission call currently not implemented (button lacks handler; selection preview only) – highlight gap.
- **Requirements Alignment**:
  - `docs/timesheet-approval-workflow-ssot.md` – Tutor responsibilities (Step 2, Step 6).
  - Stories `1.x`/`2.x` (timesheet lifecycle) – ensure tutor actions match defined states.
  - OpenAPI `/api/timesheets`, `/api/approvals`.
- **Observations**:
  - Bulk submit CTA lacks implementation; add backlog item.
  - Modal uses `<div>` overlay with `onClick` to close; ensure focus management matches accessibility guidelines (currently click-outside only).
  - Support resources & quick stats content sourced from view model; check for backend parity (currently likely mocked).

### 2.3 Lecturer Dashboard
- **File**: `frontend/src/components/dashboards/LecturerDashboard/LecturerDashboardShell.tsx`
- **Purpose**: Allows lecturers to filter, review, approve, reject, or batch approve tutor-submitted timesheets; supplies status overview.
- **Layout**:
  - **Summary Banner** (`LecturerSummaryBanner`): Stats on pending approvals, total hours, etc. Displays urgent count with animated indicator.
  - **Filters Panel** (`LecturerFiltersPanel`): Buttons for “Urgent only”, course dropdown, search input, refresh and clear filters.
  - **Pending Approvals Table** (`LecturerPendingTable`):
    - States: loading spinner, empty-state, filtered-empty-state, or `TimesheetTable`.
    - Supports selection, batch approve, link to `/approvals/history`.
  - **Status Breakdown**: Card listing counts per `TimesheetStatus` with `StatusBadge`.
  - **Rejection Modal**: Inline `<Card>` overlay with textarea for rejection reason (submit triggers `handleRejectionSubmit`).

- **Interactive Elements**:

| Element | Description | States | Data Source / Hook | Backend Endpoint(s) | Notes |
|---------|-------------|--------|--------------------|---------------------|-------|
| “Urgent only” Toggle | Filters list | Variants outline/default, label changes | `filters.showOnlyUrgent` via `updateFilters` | Affects `usePendingTimesheets` query parameters | Urgent detection relies on view model computed weights |
| Course Select | Filters by course | Options from `courseOptions` | `useLecturerDashboardData` (derived from metrics) | Passes `courseId` to filters | Default “All courses” |
| Search Input | Filters by tutor/course name | Debounced through `updateFilters` | `filters.searchQuery` | n/a | Trims whitespace when checking active filters |
| Refresh Button | Refetch pending + dashboard data | Disabled when `isRefreshing` true | `refreshPending`, `refetchDashboard` | GET `/api/timesheets/pending-final-approval`, `/api/dashboard/summary` | Loading state shows spinner text |
| Timesheet Row Actions | Approve/Reject | Disabled when `approvalLoading` or action id matches row | `handleApprovalAction` (lecturer role) | POST `/api/approvals` (`LECTURER_CONFIRM` / `REJECT`) | Rejection opens modal; approval updates selection |
| Batch Approve Button | Approves selected | Disabled if no selection or `approvalLoading` | `handleBatchApproval` (calls `TimesheetService.batchApproveTimesheets`) | POST `/api/approvals` (multiple) | Selection count displayed |

- **Workflows**:
  1. **Review Pending**: Fetch via `usePendingTimesheets` (`GET /api/timesheets/pending-final-approval`).
  2. **Approve Single**: Row action -> `handleApprovalAction` -> update via `refetchPending`/`refetchDashboard`.
  3. **Reject**: Row action -> rejection modal -> comment required -> `handleRejectionSubmit` posts to API.
  4. **Batch Approve**: Select rows -> click `Batch Approve` -> processes sequential API calls.
- **Requirements Alignment**:
  - `Story 2.1` acceptance criteria for lecturer approvals/rejections.
  - `docs/timesheet-approval-workflow-ssot.md` Steps 2-4.
  - `OpenAPI` `POST /api/approvals` (lecturer actions).
- **Observations**:
  - Rejection modal lacks focus trap beyond simple overlay; consider reusing admin modal logic for consistency.
  - Batch approve does not expose failure feedback per timesheet; results aggregated silently.
  - Filtering logic is client-side; ensure API provides necessary query capabilities for scalability.

### 2.4 Admin Dashboard
- **File**: `frontend/src/components/dashboards/AdminDashboard/AdminDashboardShell.tsx`
- **Purpose**: Provides system administrators with overview metrics, pending review queue (post-lecturer approvals), and rejection workflow tooling.
- **Layout**:
  - **Header (`AdminDashboardHeader`)**: Welcome message, global search input, “Refresh” button, urgent indicator combining urgent count + pending approvals.
  - **Tabs (`AdminNavTabs`)**: `overview`, `pending`, plus conditional `users`, `analytics`, `settings` (visible when `canViewAdminDashboard`).
  - **Metrics Panel**: Cards summarizing total timesheets, pending approvals, total hours/pay, tutor coverage.
  - **Pending Review Panel**: Wraps `TimesheetTable` configured for admin approvals (selection enabled, actions for final approval/rejection).
  - **Rejection Modal**: Focus-trapped, accessible dialog requiring justification; includes spinner when `actionState.isSubmitting`.

- **Interactive Elements**:

| Element | Description | States | Data Source / Hook | Backend Endpoint(s) | Notes |
|---------|-------------|--------|--------------------|---------------------|-------|
| Dashboard Search Input | Filters dataset | Value stored in `searchQuery`, update feeds filter | `useAdminDashboardData.handleSearch` | Applies to local filtering (no API call) | Potential future global search integration |
| Refresh Button | Refetch timesheets + summary | Always enabled; triggers two parallel fetches | `refreshTimesheets`, `refetchDashboard` | GET `/api/timesheets/pending-final-approval`, `/api/dashboard/summary` (admin scope) | Displays spinner via `LoadingSpinner` in top-level loading state |
| Tabs | Switches view | Active tab gets `border-primary` styling | `tabs` derived from access; `handleTabChange` updates `currentTab` | Additional tabs currently placeholders (no content) | Consider disabling unused tabs until implemented |
| Timesheet Table Actions | Approve (HR confirm), Reject, Edit etc. | Buttons disabled while action in-flight (`actionLoadingId`) | `handleApprovalAction`, `handleRejectionSubmit` | POST `/api/approvals` with admin role mapping (`HR_CONFIRM`, `REJECT`) | Selection state used for potential bulk actions (not yet implemented) |
| Rejection Modal Buttons | Cancel / Confirm Action | Confirm shows spinner while submitting | `AdminRejectionModal` uses `actionState` | POST `/api/approvals` (REJECT) | Focus trapping & Escape key support implemented |
| Error Banners | Retry or dismiss error | Buttons for Retry (timesheets/dashboard) and Dismiss (approval) | `errors` object from hook | Retries re-run underlying queries | Provides inline remediation guidance |

- **Workflows**:
  1. **System Overview**: `useTimesheetDashboardSummary` fetches metrics (GET `/api/dashboard/summary`).
  2. **Pending Review**: `useTimesheetQuery` fetches timesheets requiring admin action (`/api/timesheets/pending-final-approval`).
  3. **Approve Final**: Action button -> `TimesheetService.approveTimesheet` with `HR_CONFIRM` → refresh list + metrics.
  4. **Reject with Reason**: Open modal, provide comment, submit -> API call -> refresh -> modal closes.
  5. **Search/Filter**: Currently client-side string filtering; no server search integration.
- **Requirements Alignment**:
  - `docs/timesheet-approval-workflow-ssot.md` Step 5 (HR/admin stage).
  - `CATAMS_PM_Requirements_Assessment` notes on dashboards being “in progress”.
  - API: POST `/api/approvals`, GET `/api/dashboard/summary`.
- **Observations**:
  - Tabs beyond “overview” and “pending” are placeholders; ensure design communicates “coming soon” or hide for MVP.
  - Search query lacks UI for clearing; consider adding clear/filters alignment with lecturer view.
  - Bulk admin approval not implemented; evaluate parity with lecturer workflow.

### 2.5 Placeholder Routes
- `/timesheets`, `/approvals`, `/users`, `/reports`, `/approvals/history` currently render `PlaceholderPage` content with informational text and minimal links (e.g., return to approvals).
- Purpose: Provide navigation continuity while modules are rebuilt; document as out-of-scope for this spec but note they need eventual replacement with fully specified flows.

---

## 3. Requirements & API Cross-Reference

| UI Workflow | Requirements Reference(s) | API Endpoint(s) | Notes |
|-------------|---------------------------|-----------------|-------|
| User authentication | `Story 4.1`, `CATAMS_PM_Requirements_Assessment` §4 | `POST /api/auth/login` | Centralised auth meets AC1–AC4; still missing MFA/usability testing |
| Tutor timesheet CRUD | `docs/timesheet-approval-workflow-ssot.md` Steps 1–2 | `POST/PUT /api/timesheets`, `POST /api/approvals` (`SUBMIT_FOR_APPROVAL`, `TUTOR_CONFIRM`) | UI supports draft submission and confirmation; bulk submit pending |
| Lecturer approvals | `Story 2.1`, SSOT Step 3–4 | `GET /api/timesheets/pending-approval`, `POST /api/approvals` (`LECTURER_CONFIRM`, `REJECT`) | Batch approve available; rejection reason form integrated |
| Admin final review | SSOT Step 5, `CATAMS_PM_Requirements_Assessment` dashboard objectives | `GET /api/dashboard/summary`, `POST /api/approvals` (`HR_CONFIRM`, `REJECT`) | Modal enforces comment requirement; search currently local |
| Navigation & role gating | `docs/timesheet-approval-workflow-ssot.md` role responsibilities | n/a | `DashboardLayout` surfaces role-specific nav links |

---

## 4. Opportunities & Gaps

1. **Documentation Debt**: No prior UI specification existed; maintain this document alongside development to prevent drift.
2. **Bulk Actions Consistency**: Tutor dashboard previews bulk submission but lacks backend integration; admin dashboard lacks equivalent.
3. **Search & Filtering**: Admin search is purely client-side; lecturer filtering mixes client filters with server data—clarify expected behaviour and update API if server-side filtering required.
4. **Placeholder Tabs**: Hide or annotate tabs without implemented content to avoid confusion.
5. **Accessibility Enhancements**:
   - Add accessible labels to icon-only buttons (especially in tables).
   - Unify modal components to guarantee focus trapping and keyboard handling across roles.
   - Ensure selection checkboxes include accessible text for screen readers (currently inline but may need `aria-labels`).
6. **Testing Coverage**:
   - Expand Playwright suite to cover admin rejection modal, lecturer filtering/batch approval, tutor create/edit workflow, and keyboard navigation across dashboard layout.

---

## 5. Maintenance Recommendations

- **Change Control**: When modifying UI components, update this specification and note requirement/story linkage in commit messages.
- **Design System Evolution**: Consolidate button, card, table variants into a documented design system to improve consistency.
- **Accessibility Baseline**: Introduce automated a11y linting (axe-core) into CI and schedule manual keyboard walkthroughs per release.
- **API Sync**: Leverage OpenAPI references in code comments or types to ensure front-end actions stay aligned with backend contract changes.

---

*This reverse-engineered specification should be treated as the living source-of-truth until formal design assets are produced. Future enhancements should cite this document to maintain alignment across engineering, product, and design stakeholders.*
