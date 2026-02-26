# Frontend UX Specification

Describes the post–Phase 3 UI behaviour for CATAMS dashboards and workflows.

## Global Principles
- Frontend surfaces remain a read-only projection of backend-calculated financial data. All calculator outputs (payable hours, hourly rate, totals) originate from `/api/timesheets/quote` and are never editable client-side.
- Roles dictate entry points: lecturers and admins create timesheets; tutors review, edit, and confirm drafts. UI affordances are hidden rather than disabled when a role lacks permission.
- Loading, empty, and error states are explicitly rendered for every primary panel (tables, stat cards, summary banners) to avoid layout jumps.
- Accessibility: quote-derived sections announce changes via polite `aria-live`, tables use semantic markup, and action buttons include tooltip/disabled reasons for assistive technology.

## Timesheet Workflows

### Lecturer Creation Flow
1. **Trigger:** Lecturer clicks “Create Timesheet” in the dashboard shell; `LecturerTimesheetCreateModal` opens.
2. **Resource loading:** Modal immediately fetches tutor and course options aligned to the lecturer (`fetchLecturerCourses`, `fetchTutorsForLecturer`). Skeleton copy and inline messages indicate loading or empty states.
3. **Form behaviour:** `TimesheetForm` runs in `mode="lecturer-create"`.
   - Tutor selector (if multiple) and course selector show Tailwind-styled empty states when datasets are empty.
   - Qualification field reflects the selected tutor’s profile and is read-only. Task type remains editable for lecturers; tutors see a locked display.
   - Delivery inputs (week start, hours, repeat) validate on change and mark invalid controls with destructive borders + helper copy.
4. **Quote updates:** Debounced requests to `TimesheetService.quoteTimesheet` update the pay summary. Failures inject inline error badges and block submission until resolved.
5. **Submission:** Clicking “Create Timesheet” calls `useTimesheetCreate`. Payload excludes calculated fields; success raises toast notifications and closes the modal. Errors surface as inline banners while preserving form state.

### Tutor Draft Review
- Tutors never see creation actions. Quick actions are limited to refresh and scroll-to-pay-summary.
- When a draft is editable, opening `TimesheetForm` (default mode) keeps both task type and qualification read-only, only exposing descriptive fields and delivery hours for edits.
- Rejection feedback surfaces in a highlighted panel at the top of the form with the lecturer/admin comment.

### Admin & Lecturer Approvals
- Pending tables display selection checkboxes only when the user can action approvals. Disabled buttons include tooltips describing unmet prerequisites (e.g., “You do not have permission to approve timesheets.”).
- Batch approval bars show contextual messaging and reuse the common `TimesheetTable` action column.

## Dashboards by Role

### Tutor Dashboard
- **Quick actions:** Two cards (Refresh Data, View Pay Summary) with lucide icons, consistent tone, and responsive layout (single column on mobile, two columns on ≥640px). No placeholder/export actions remain.
- **Statistics & breakdown:** All cards read from `useTutorDashboardViewModel`; fallback states include skeleton rows while queries resolve.
- **Timesheet table:** Shows quote metadata (rate code, clause reference tooltips) and filter/search actions. Empty states differentiate between “no timesheets” and “filters returned nothing.”

### Lecturer Dashboard
- **Summary banner:** Highlights outstanding approvals, recently created timesheets, and trend indicators using lucide icons (`ClipboardList`, `CheckCircle2`, etc.).
- **Pending table:** Empty state copy emphasises that approved records live in reporting archives; no links to non-existent history pages remain.
- **Create modal:** Covered under the lecturer flow above.

### Admin Dashboard
- **Navigation tabs:** Only “Overview” and “Pending Approvals” are visible. Disabled “coming soon” tabs were removed to avoid confusion.
- **Overview:** Metrics cards consume backend summary data (`useTimesheetDashboardSummary`). If a metric is unavailable, cards show muted fallback copy (“Data unavailable”).
- **Pending approvals:** Rejection modal enforces justification entry before submission; success and failure states propagate through the global notification system.
- **User management:** Listed in architecture doc; UI now includes status badges and edit/reactivate actions.

## Visual System & States
- Shared layout classes (`layout-container`, `layout-grid`, `layout-main`) maintain consistent spacing across dashboards.
- States:
  - **Loading:** Use dedicated skeleton components or `PageLoadingIndicator` for page-level fetches.
  - **Empty:** Copy emphasises next action (e.g., refresh filters) instead of “coming soon.”
  - **Errors:** `GlobalErrorBanner` with retry buttons where possible.

## Accessibility & Localization
- Icon buttons include textual labels; status badges expose `aria-label` for screen readers.
- Clause references and formulas remain short English strings; localisation hooks are prepared but not yet populated (`src/i18n/` placeholder).

## Testing Notes
- Vitest suites cover modal behaviour, action button permissions, and payload construction (see `TimesheetForm.test.tsx`, `LecturerTimesheetCreateModal.test.tsx`, `AdminUsersPage.test.tsx`). 
- Playwright component test (`DashboardLayout.ct.tsx`) validates navigation state after removing placeholder routes.

## Related Docs
- `docs/frontend/architecture.md`
- `docs/frontend/testing.md`
- `docs/backend/api-timesheets.md`
- `docs/policy/timesheet-ssot.md`
