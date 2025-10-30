# UAT Plan Addendum: Issue Remediation & Freshness Validation

Date: 2025-10-29
Scope: Validate critical/open issues from UAT and newly logged design gaps without changing business rules. Focus on: credentials SSOT (Issue #008), dashboard freshness (Issue #009), quote 400s due to constraints mismatch (Issue #012/#018), Calculated Pay Summary explanation (Issue #013), and Admin tutor scoping/qualification (Issue #014/#015).

## Preconditions
- Clean reset using a single entry point: `npm run e2e:reset`
- Load seed users printed by reset script; do not hardcode passwords in docs
- Backend/API running at `http://localhost:8084`; UI at `http://localhost:5174`

## S1 — Credentials Single Source of Truth (Issue #008)
- Goal: Guide credentials match seed; machine-checkable.
- Steps:
  1. Run `npm run e2e:reset` and capture emitted test users.
  2. Open `E2E_UAT_EXECUTION_GUIDE.md` “Accounts” section and follow login with printed credentials.
  3. Run verification script (to be added in CI) that diffs guide vs seed manifest.
- Acceptance:
  - Guide logins succeed for Tutor, Lecturer, Admin without edits.
  - CI check passes (guide ↔ seed sync); any drift fails the gate.

## S2 — Dashboard Freshness <1s on focus / 30s auto (Issue #009)
- Goal: Counters update promptly and at interval without request storms.
- Steps:
  1. Open a dashboard tab and a separate role tab (e.g., Tutor + Lecturer).
  2. Approve/reject on role tab, then switch focus back to dashboard.
  3. Observe update occurs within 1 second; leave tab visible for 2 minutes.
- Acceptance:
  - Focus switch triggers refresh <1s when tab is visible.
  - Auto refresh occurs every ~30s while visible, no duplicate timers.
  - Dev counters show ≤1 summary request/30s/dashboard page.

## S3 — Quote 400 Bad Request Prevention (Issues #012, #018; error logs)
- Goal: No 400s in normal use; UI aligns with server constraints.
- Steps:
  1. Load Timesheet form and read help text for Delivery Hours (min/max/step).
  2. Enter values exactly at min, max, and one invalid (below min, above max, >precision).
  3. Trigger quote; observe client-side validation for invalids; valid values return 200.
- Acceptance:
  - Help text matches server-published constraints.
  - Invalid inputs are blocked client-side with specific error text.
  - Valid inputs produce a successful quote and render the pay preview.

## S4 — Calculated Pay Summary Explanation (Issue #013)
- Goal: Repeat Tutorial preview explains capped payable hours clearly.
- Steps:
  1. Create quote: Task=Tutorial, Repeat=ON, Hours=10.0.
  2. Inspect Calculated Pay Summary for TUx line items and capped payable hours.
  3. Locate explanatory text or info link with clause reference.
- Acceptance:
  - An inline note explains the cap rule and rationale.
  - Screen reader announces update (aria-live) when preview re-renders.

## S5 — Admin Create Tutor: Course/Lecturer Visibility (Issue #014)
- Goal: Admin can bind tutor to one or more courses at creation or edit.
- Steps:
  1. In Admin → Users → Create Tutor, select courses (multi-select) and save.
  2. Log in as that Tutor; verify visibility limited to assigned courses.
  3. Attempt to access unassigned course: list/details/approval endpoints.
- Acceptance:
  - Tutor creation persists course bindings and UI reflects scope.
  - API returns 403 for unassigned accesses; UI filters lists accordingly.

## S6 — Admin Create Tutor: Default Qualification (Issue #015)
- Goal: If default qualification is added, Timesheet defaults accordingly.
- Steps:
  1. In Admin, set default qualification for a Tutor profile (if supported).
  2. Start a new timesheet as that Tutor; verify default is pre-selected, but can be changed.
- Acceptance:
  - Default qualification appears automatically and is overrideable.
  - If not supported by design, guide explicitly documents per-timesheet-only behavior.

## S7 — Regression: Three-tier Approval & Audit Trail (Reference)
- Goal: Ensure core flow remains 100% pass.
- Steps:
  1. Tutor create → Lecturer approve → Admin final approve across two timesheets.
  2. Verify 12+ audit entries across three timesheets as before.
- Acceptance:
  - No regression in approvals; audit trail intact and complete.

## Negative Tests (Targeted)
- Submit non-Monday date if UI allows (should be blocked or 4xx); verify consistency with guide.
- Attempt quote with hours > server max and > client precision; verify consistent error messaging.
- Rapid tab switching across multiple dashboards; ensure no request storm.

## Evidence to Capture
- Screenshots for S2 focus <1s and 30s auto refresh.
- Network HAR or console logs showing no 400s during S3 valid paths.
- Screenshot of Calculated Pay Summary with the explanation in S4.
- Admin Create Tutor form with course bindings (S5) and default qualification (S6).

## Exit Criteria
- All acceptances above met with evidence.
- ISSUE-008 and ISSUE-009 downgraded to RESOLVED in ISSUE_LOG.md.
- ISSUE-012/013/014/015 validated per acceptance and reclassified accordingly (OPEN→RESOLVED or left OPEN with agreed rationale).

