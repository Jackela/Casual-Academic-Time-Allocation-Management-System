**UAT Issue Log (Design Gaps And Mismatches)**

- Date: 2025-10-29
- Context: Post-UAT gap analysis capturing design vs implementation mismatches to address in upcoming work. No code changes included here.

**ISSUE-012: Delivery Hours Range/Precision Mismatch**
- Severity: Medium | Status: OPEN | Area: Quote API / Timesheet Form
- Symptoms: UI hints allow 0.25–60.0; backend enforces 0.1–10.0 with 1 decimal → 400 on quote for out-of-range or >1dp.
- Evidence:
  - Backend validation `@DecimalMin 0.1`, `@DecimalMax 10.0`, 1dp: `src/main/java/com/usyd/catams/dto/request/TimesheetQuoteRequest.java:1`
  - UI fallback constraints 0.25–60.0: `frontend/src/lib/config/ui-config.ts:1`
  - Client validation (>10 rejected): `frontend/src/services/timesheets.ts:180`
- Recommendation: Implement `/api/timesheets/config` to publish min/max/step; UI consumes and aligns texts and inputs.
- Acceptance: Conformant inputs quote 200; invalid blocked client-side with clear message; UI help text consistent.

**ISSUE-013: Repeat Tutorial Pay Preview Lacks Explanation**
- Severity: Low/Medium | Status: OPEN | Area: Calculated Pay Summary UX
- Symptoms: With Repeat checked, Task=Tutorial, 10h shows TU4 with Payable 2.0h; users may think input is truncated.
- Evidence: Policy logic and capping in calculator: `src/main/java/com/usyd/catams/service/Schedule1Calculator.java:1`
- Recommendation: Add short explanation or link for TUx repeat rules; display clause reference prominently.
- Acceptance: Users understand why payable hours differ from entered hours.

**ISSUE-014: Admin Create Tutor — Cannot Bind Course/Lecturer Visibility**
- Severity: Medium | Status: OPEN | Area: Admin Users
- Symptoms: Role=TUTOR creation flow lacks course assignments; no visibility scope.
- Evidence:
  - Admin create form fields: `frontend/src/features/admin-users/AdminUsersPage.tsx:476`
  - Create payload has no bindings: `frontend/src/services/users.ts:18`
  - Backend DTO lacks fields: `src/main/java/com/usyd/catams/dto/request/UserCreateRequest.java:1`
- Recommendation: Model `TutorAssignment(tutorId, courseId)` and CRUD; expose in Admin UI as multiselect.
- Acceptance: Tutor can be created with bound courses; lists/approvals scope accordingly.

**ISSUE-015: Admin Create Tutor — Cannot Set Default Tutor Qualification**
- Severity: Medium | Status: OPEN | Area: Admin Users / Policy Defaults
- Symptoms: Qualification only selected in Timesheet form; no default at profile level.
- Evidence: No qualification in user DTO/entity; Timesheet form has qualification select: `frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.tsx:891`
- Recommendation: Decide strategy — A) keep per-timesheet only; or B) add `defaultQualification` to user profile (timesheet can override).
- Acceptance: If B, Admin can set default; Timesheet defaults and can override.

**ISSUE-016: Sorting Parameter Contract Mismatch**
- Severity: Low/Medium | Status: OPEN | Area: Lists
- Symptoms: Frontend sends `sortBy`/`sortDirection`; backend expects `sort=field,dir`, causing fallback sorting.
- Evidence:
  - Frontend query: `frontend/src/services/timesheets.ts:89`
  - Backend parse expects `sort`: `src/main/java/com/usyd/catams/controller/TimesheetController.java:200`
- Recommendation: Align to `sort` param or support both on server.
- Acceptance: Deterministic ordering consistent with UI choices.

**ISSUE-017: Week Start Monday Enforcement Inconsistent**
- Severity: Low | Status: OPEN | Area: Validation
- Symptoms: UI requires week start Monday; backend appears not to enforce.
- Evidence: UI constraint: `frontend/src/lib/config/ui-config.ts:1`; server creation path lacks Monday check.
- Recommendation: Either enforce server-side or make UI advisory only; ideally publish this rule via config endpoint.
- Acceptance: Single source of truth; consistent failures across UI/API.

**ISSUE-018: Missing Server Constraints Endpoint**
- Severity: Medium | Status: OPEN | Area: Config / UX Consistency
- Symptoms: UI has plumbing to fetch constraints from `/api/config` or `/api/timesheets/config`, but server doesn’t expose them; UI falls back to defaults.
- Evidence: Client endpoint resolver: `frontend/src/lib/config/server-config.ts:1`; no server mapping found.
- Recommendation: Implement `/api/timesheets/config` with hours min/max/step, currency, mondayOnly.
- Acceptance: UI adjusts automatically; quote 400s due to mismatch disappear in normal use.

**ISSUE-019: Hours Field Semantics Ambiguity**
- Severity: Low | Status: OPEN | Area: DTO Clarity / UI Labels
- Symptoms: `TimesheetResponse.hours` used to compute `totalPay = hours * hourlyRate`; may represent payable hours, not delivery hours.
- Evidence: `src/main/java/com/usyd/catams/dto/response/TimesheetResponse.java:324`
- Recommendation: Clarify docs or rename; ensure UI aggregates use the right field (payable vs delivery).
- Acceptance: UI/Docs consistently refer to payable/delivery/associated hours without confusion.

**ISSUE-020: Approval Helper Payload Style Inconsistent (Docs/Tools)**
- Severity: Low | Status: OPEN | Area: UAT Tooling
- Symptoms: `uat-helpers.sh` posts JSON then appends `?timesheetId=` in body line; works but confusing.
- Evidence: `uat-helpers.sh:112`
- Recommendation: Use pure JSON `{timesheetId, action, comment}` body for clarity.
- Acceptance: Helper matches frontend payload; easier debugging.

**ISSUE-009: Dashboard Counters Not Refreshing (Reference)**
- Severity: Medium | Status: OPEN | Area: Dashboard Freshness
- Note: Root cause and plan documented; fix via React Query focus/interval refresh, scoped staleTime, precise invalidation.

**ISSUE-008: UAT Guide Credentials Mismatch (Reference)**
- Severity: Critical | Status: OPEN | Area: Docs/Seed
- Note: To be addressed via SSOT manifest + machine verification flow.

