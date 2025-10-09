# Frontend Quality Uplift Blueprint

*Last updated: 2025-10-08*  
*Source inputs: `docs/ui-ux-design-spec.md` – “Key Gaps & Recommendations” & “Maintenance Recommendations”*

This blueprint operationalises the key recommendations from the UI/UX design specification into actionable workstreams. Each section outlines objectives, concrete steps, suggested owners, artefacts to produce, and success validation.

---

## 1. Requirements Alignment Initiative
**Objective**: Establish and maintain a requirements-to-component matrix so every UI workflow can be traced to a documented requirement and backend endpoint.

### 1.1 Activities & Steps
1. **Discover Source Material**
   - Gather high-level requirement docs (`CATAMS_PM_Requirements_Assessment.md`, `docs/stories/*.story.md`, `docs/timesheet-approval-workflow-ssot.md`, PRDs).
   - Inventory existing Playwright specs and unit/component tests to understand implicit expectations.
2. **Define Matrix Schema**
   - Columns: *Requirement ID / Story*, *User Role*, *Workflow Description*, *Backend Endpoint(s)*, *Frontend Components (files & exports)*, *Test Coverage (spec file & case)*, *Owner*.
   - Agree on storage format (recommended: `docs/requirements-matrix.csv` + Notion/Sheets mirror).
3. **Populate Baseline**
   - For each major view (Login, Tutor, Lecturer, Admin), fill out entries referencing the spec and openapi endpoints.
   - Capture missing workflows (e.g., admin tab placeholders, tutor bulk submission) as “Gap” rows.
4. **Validation Review**
   - Hold cross-functional session (PM, UX, Tech Leads) to confirm accuracy.
   - Update acceptance criteria in story templates to reference matrix rows.
5. **Operationalise Maintenance**
   - Add “∆ requirements?” check to PR template; matrix must be updated when new UI features are introduced.
   - Schedule quarterly audit to retire outdated rows and confirm coverage.

### 1.2 Deliverables
- `docs/requirements-matrix.csv` (and human-readable summary).
- Change-log section in matrix documenting updates.

### 1.3 Success Indicators
- Every UI component listed in the spec references a matrix row.
- No gaps between implemented features and documented requirements during release sign-offs.

---

## 2. Functional Correctness Reinforcement
**Objective**: Ensure users always receive actionable feedback through consistent error banners and loading/disabled states.

### 2.1 Activities & Steps
1. **Audit Current Feedback**
   - Catalogue existing banners/spinners (`AdminDashboardShell`, `LecturerDashboardShell`, `TutorDashboard`, `LoginPage`) noting inconsistency or absence.
2. **Design Shared Feedback Components**
   - Create `ErrorBanner` and `LoadingOverlay` components (variants: inline, modal, full-screen).
   - Document prop conventions: `message`, `actionLabel`, `onAction`, `severity`.
3. **Integrate Across Views**
   - Replace bespoke banners with shared components.
   - Update action buttons to reflect loading state via shared helper hook (e.g., `useLoadingState`).
4. **Enhance Status Surfacing**
   - Ensure API error catches (`secureLogger.error`) also set user-visible messages.
   - Add ARIA attributes (`role="alert"`, `aria-live`) for announcements.
5. **Testing & Verification**
   - Write component/unit tests for new shared helpers.
   - Update Playwright smoke flow to confirm banners appear on simulated failures.

### 2.2 Deliverables
- `frontend/src/components/shared/feedback/ErrorBanner.tsx`
- `frontend/src/hooks/useLoadingState.ts`
- Updated dashboard/login pages using shared helpers.

### 2.3 Success Indicators
- No raw strings or ad-hoc banners remain.
- Product QA can toggle mock failures and consistently see banner feedback.

---

## 3. E2E Coverage Expansion
**Objective**: Extend Playwright suite to cover high-risk workflows currently untested.

### 3.1 New Specs
1. **Admin Rejection Lifecycle**
   - Path: `frontend/e2e/admin/admin-rejection.spec.ts`
   - Scenarios: open rejection modal, focus trap validation, submit with reason, confirm list refresh.
2. **Table Interaction Regression**
   - Path: `frontend/e2e/dashboard/table-interactions.spec.ts`
   - Scenarios: lecturer filters (urgent toggle, course select, search), batch approve, admin table sort toggles.
3. **Keyboard Navigation Smoke**
   - Path: `frontend/e2e/accessibility/keyboard-navigation.spec.ts`
   - Scenarios: tab through login form, dashboard nav, open/close modals; ensure focus outlines and trigger via Enter/Space.

### 3.2 Implementation Steps
1. **Test Data Strategy**
   - Extend Playwright fixtures `frontend/e2e/fixtures/workflows.ts` to seed necessary timesheets (draft, pending, urgent).
2. **Spec Authoring**
   - Use `page.keyboard` for keyboard tests; rely on data-testid selectors to reduce brittleness.
3. **CI Integration**
   - Update Playwright command to include new specs; ensure `npm run test:e2e` passes locally.
4. **Reporting**
   - Add key flows to `frontend/docs/reports/TEST_STATUS.md`.

### 3.3 Success Indicators
- New specs run in CI and fail when regressions occur.
- Coverage report indicates critical workflows (admin rejection, filtering, keyboard paths) are validated end-to-end.

---

## 4. Accessibility Hardening
**Objective**: Raise accessibility compliance by fixing labeling, ensuring focus management, and integrating automated audits.

### 4.1 Activities & Steps
1. **Labeling Pass**
   - Identify icon-only buttons (`TimesheetTable`, nav icons) and add `aria-label`.
   - Ensure table selection checkboxes include descriptive labels (`aria-labelledby` with row info).
2. **Modal & Focus Trap Review**
   - Standardise on shared modal component with focus trapping (adapt admin modal logic).
   - Verify Escape key closes all modals; ensure focus returns to invoker.
3. **Keyboard Navigation Audit**
   - Conduct manual walkthrough of login and each dashboard using keyboard only; log issues.
4. **Integrate axe-core**
   - Add `@axe-core/react` checks in development; integrate `axe-playwright` in E2E suite or run `npx axe` in CI.
   - Fail builds if violations exceed threshold.
5. **Documentation & Training**
   - Update `docs/ui-ux-design-spec.md` with accessibility checklist.
   - Run brown-bag session to brief devs on new standards.

### 4.2 Deliverables
- Shared modal component (`frontend/src/components/shared/Modal.tsx` or similar).
- CI job to run automated axe audit (`ci.yml` update).
- Accessibility checklist appended to spec.

### 4.3 Success Indicators
- axe-core scans return zero critical violations.
- Manual keyboard audit passes for core workflows.

---

## 5. UI Pattern Harmonisation
**Objective**: Establish and enforce a unified design system to eliminate inconsistent button/table/modal patterns.

### 5.1 Activities & Steps
1. **Pattern Inventory**
   - Catalog existing implementations (buttons, tables, modals, cards) noting variant usage.
   - Capture screenshots and code references for review.
2. **Design System Playbook**
   - Define component taxonomy (Primary/Secondary buttons, Table layouts, Modal structure).
   - Document guidelines in `docs/design-system-playbook.md` (include tokens, spacing, responsive rules).
3. **Component Library Updates**
   - Extend shadcn-based primitives with house style variants (e.g., `Button` variants for primary/secondary/destructive).
   - Create shared table wrapper (sorting hooks, selection, empty/loading states).
   - Introduce consistent modal component (overlay, animations, focus trap).
4. **Refactor Consumers**
   - Update dashboards and shared components to consume new design system primitives.
   - Remove legacy CSS classes and ad-hoc markup.
5. **Governance**
   - Add lint rule or codemod to prevent direct usage of deprecated patterns.
   - Include design-system compliance checkbox in PR template.

### 5.2 Deliverables
- `docs/design-system-playbook.md`
- Updated UI component library (`frontend/src/components/ui/`).
- Migration checklist tracking refactor progress.

### 5.3 Success Indicators
- No duplicate button/table implementations remain.
- Design system referenced in onboarding and code reviews.

---

## 6. Programme Management
- **Steering Team**: PM, UX Lead, Frontend Tech Lead, QA Lead.
- **Cadence**: Bi-weekly sync to track progress; update blueprint as work completes.
- **Tracking**: Create Jira/Linear epic “Frontend Quality Uplift” with swimlanes corresponding to Sections 1–5.
- **Communication**: Publish updates in project Slack channel; link blueprint in README for quick access.

This blueprint should be treated as a living document; update sections as initiatives reach completion or new gaps are discovered.
