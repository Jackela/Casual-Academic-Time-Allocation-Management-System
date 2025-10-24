# Implementation Checklist: Refactor CATAMS Playwright E2E (frontend/e2e/real)

**Purpose**: Guide execution and validation of the E2E refactor per spec and plan
**Created**: 2025-10-22
**Feature**: [specs/001-playwright-e2e-refactor/spec.md](../../specs/001-playwright-e2e-refactor/spec.md)

## Pre‑Flight

 - [x] CHK001 On branch `001-playwright-e2e-refactor`
- [ ] CHK002 Environment ready: `BASE_URL`, role accounts (Tutor/Lecturer/Admin), Admin active
- [ ] CHK003 Install deps: `npm ci` completed without errors
 - [x] CHK004 Playwright config set to Chromium-only for real suite (cross-browser covered in smoke)

## Constitution Gates (Must Pass)

 - [x] CHK010 SSOT: Client payloads exclude financial fields; server recompute verified in save flow
 - [x] CHK011 Quote on input change exercised in Lecturer create flow
 - [x] CHK012 API Contract alignment: assertions match OpenAPI fields and status codes
- [ ] CHK013 Security/Workflow: Tutor restricted from creation; approval invariant enforced
- [ ] CHK014 Observability/Audit unaffected; rate metadata verified via response fields when available
- [ ] CHK015 Documentation: JSDoc on shared helpers; spec/plan updated if drift detected

## Cleanup & Structure

 - [x] CHK020 Remove obsolete Tutor self‑creation tests and files
 - [x] CHK021 Consolidate Page Objects under `frontend/e2e/real/pages`
 - [x] CHK022 Replace brittle selectors with `data-testid` usage across specs
 - [x] CHK023 Programmatic login helper implemented and reused; UI login remains in smoke only
- [ ] CHK024 If required data-testid attributes are missing in UI, raise minimal UI PR or document TODOs with file paths

## P0 Coverage (Must Exist and Pass)

- [x] CHK030 Lecturer creates timesheet (happy path) — SSOT assertions included
- [x] CHK031 Tutor restricted (negative path) — route guard + message verified
- [x] CHK032 Full approval chain: Draft → Tutor Confirm → Lecturer Approve → Admin Approve
- [x] CHK033 Negative: Admin approval blocked before Lecturer approval with clear message
  - Note: Initially observed a transient render churn; stabilized via route sentinels and explicit error banner assertion. Suite currently green; one retry flagged as flaky on the first run.

## P1 Coverage (Happy Path Minimum)

- [ ] CHK040 Modification request flow — in‑app banner + status badge + reason text
- [ ] CHK041 Rejection flow — in‑app banner + status badge + reason text
- [ ] CHK042 Admin user management — create user (validation messages), activate/deactivate lifecycle
- [ ] CHK043 Password policy enforced (min 8; 1 upper/lower/digit/special)

## Stability & Readability

 - [x] CHK050 Eliminate `waitForTimeout`/arbitrary sleeps; use conditions/expect
- [ ] CHK051 Flake audit: retries minimized; selectors stable
- [x] CHK052 Test data independence or reset between specs
  - [x] CHK053 Enable Playwright trace on failure and publish HTML report locally

## Contracts & Data

 - [x] CHK060 Verify requests/responses vs `contracts/openapi-e2e-refactor.yaml`
 - [x] CHK061 No financial fields sent from client in create/update payloads
 - [x] CHK062 Quote endpoint hit on instructional input change

## CI & Reporting

- [ ] CHK070 Local run: `npm run test:e2e:real` 100% pass
  - [ ] CHK071 Runtime within 10 minutes target (document actual time)
  - [x] CHK072 Add tags for filtering: `@p0`, `@admin` where applicable
- [ ] CHK073 PR description: lists removed/updated/added specs with rationale
- [ ] CHK074 CI publishes Playwright HTML report and traces for failures

## Notes

- Check items off as completed: `[x]`
- Link commits or file paths next to items when helpful
- Record actual runtime and any flake observations
