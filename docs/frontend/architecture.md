# Frontend Architecture

## Runtime & Tooling
- React 18 + TypeScript served by Vite.
- Tailwind CSS with design-token backed custom layers (`src/index.modern.css`, `src/styles/*`).
- React Query (TanStack Query) for server state and cache orchestration.
- Secure Axios wrapper (`src/services/api-secure.ts`) shared by feature services.

## Core Feature Modules

### Lecturer-led Timesheet Creation
- **Entry point:** `frontend/src/components/dashboards/LecturerDashboard/components/LecturerTimesheetCreateModal.tsx` wraps `TimesheetForm` and wires the create mutation exposed by `useTimesheetCreate`.
- **Data dependencies:** Courses (`services/courses.ts`) and tutors (`services/users.ts`) fetched on modal open, normalised into `TimesheetForm` option lists.
- **Form engine:** `TimesheetForm.tsx` (re-used by tutor edit flows) owns validation, quoting, and SSOT enforcement. It calls `TimesheetService.quoteTimesheet` directly and persists only directive fields (courseId, tutorId, deliveryHours, etc.). Read-only quote results (payableHours, hourlyRate, amount) stay in local state until submit.
- **Permissions:** Form props expose `mode` so lecturer-created sessions automatically hide tutor-edit-only controls and ensure qualification/task type permissions follow role rules.

### Dashboards
- **Tutor / Lecturer / Admin shells:** Each dashboard composes shared layout primitives (`layout-container`, `layout-grid`) and opts into React Query hooks for domain data (`useTimesheetQuery`, `useTimesheetDashboardSummary`, `useApprovalAction`, etc.).
- **Data SSOT:** Summary panels and tables read directly from service-backed hooks; mock values were removed in Phase 3. Admin statistics, lecturer pending tables, and tutor quick stats now all source `TimesheetService` responses.
- **State surfaces:** Mutations (approve, reject, create) trigger query invalidations to maintain a single source of truth across dashboards.

### Admin User Management
- **Create flow:** `features/admin-users/AdminUsersPage.tsx` manages a modal with secure password entry (no defaults) and uses `createUser` service call.
- **Activation & edits:** Table rows expose status badges and PATCH actions through the shared `updateUser` service (PATCH `/api/users/{id}`) to toggle `isActive` and update names.
- **Tests:** `AdminUsersPage.test.tsx` mocks service calls to cover password masking, status toggles, and optimistic refresh.

## Styling & Layout
- Design tokens defined in `styles/design-tokens.css` and layout grid rules in `styles/unified-grid.css` ensure consistent spacing, breakpoints, and z-indices.
- Components consume Tailwind utility classes layered on top of these tokens; modal overlays and dashboard shells share the `layout-*` utilities.
- Icons standardised on `lucide-react` in interactive surfaces (e.g., tutor quick actions) to avoid emoji drift.

## Error & Loading Patterns
- Page-level boundaries (`components/ErrorBoundary`) isolate crashed widgets and render `GlobalErrorBanner` or `PageLoadingIndicator` states.
- Tables and stat cards surface loading/empty/error states via shared patterns (`TimesheetTable`, skeleton utilities).

## Testing Strategy
- Vitest + Testing Library for unit/integration coverage (forms, modals, dashboards).
- Playwright component tests validate navigation props (e.g., `DashboardLayout.ct.tsx`).
- React Query hooks mocked via MSW or local stubs in tests to assert cache invalidation and SSOT behaviour.

## Related Documents
- `docs/frontend/ux-spec.md`
- `docs/frontend/testing.md`
- `docs/backend/api-timesheets.md`
