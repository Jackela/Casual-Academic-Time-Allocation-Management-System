CATAMS E2E Audit Report – 2025-10-24

**Execution Summary**
- Backend profile: `e2e-local` (booted via runner); effective port observed: 8084; runner also supported 8090 via env.
- Frontend dev server: Vite `--mode e2e`, origin `http://127.0.0.1:5174`.
- Workers: 1; Retries: 1.

- P0 Acceptance (`npm run test:e2e:p0`)
  - Result: 3 passed, 0 failed, 2 skipped
  - Exit code: 0

- Contract Lane (`npm run test:e2e:real -- --grep contract`)
  - Result: 6 passed, 1 failed, 0 skipped; 1 retried (still failed)
  - Exit code: 1
  - Notable failure: Timesheet API Contract – server-side SSOT create (courses fetch not OK)

- Full Real Suite (`npm run test:e2e:real`)
  - Result: 54 passed, 31 failed, 4 flaky, 3 skipped (93 total)
  - Exit code: 1
  - Failures/flaky concentrated in tutor/lecturer workflow modules and admin UIs when auth warm-up lags.

**Static Findings**
- Prohibited waits
  - No occurrences of `waitForTimeout(` found under `frontend/e2e/real/specs/`.

- Readiness waits (determinism-over-patience)
  - Multiple readiness-style `toBeVisible` checks observed per test in a few specs. Recommend consolidating to one route-level sentinel, then scoped interactions.
  - Examples:
    - `frontend/e2e/real/specs/approval-chain.spec.ts:31` and `:33` and `:36` use multiple `toBeVisible` after navigation. Suggest collapse to a single sentinel (e.g., `admin-dashboard` or the `Pending Review` region) and rely on response anchoring.
    - `frontend/e2e/real/specs/lecturer-create-timesheet.spec.ts:41, :44, :45` similarly stack readiness checks. Keep one sentinel (e.g., `lecturer-dashboard`) plus explicit `waitForResponse` for data fetch.

- Deep-link vs. tab clicks
  - Good: `approval-chain.spec.ts` deep-links to `'/dashboard?tab=pending'`.
  - No tab-click navigation anti-patterns found in `specs/`. Other flows use direct routes (`/admin/users`, `/timesheets/create`).

- Data-testid sentinels
  - Required sentinels are present and used (e.g., `admin-dashboard`, `timesheets-table`, `lecturer-create-modal`, `calculated-preview`).
  - Cross-check with `frontend/e2e/real/fixtures/missing-testids.md:1` confirms no open gaps for P0.

- SSOT payload assertions
  - `lecturer-create-timesheet.spec.ts:146–174` captures payload for POST `/api/timesheets` and asserts `expectNoFinancialFields(payload)`; also asserts quote via `waitForResponse('/api/timesheets/quote')`.
  - No other `requestSubmit()` patterns in specs observed lacking an SSOT assertion.

**Runtime Findings**
- Authentication warm-up gaps
  - Early requests in several specs returned 401/403 despite global auth state being set. Examples in full suite logs show repeated `API GET /api/users` 401s before stabilizing; this accounts for a share of admin/user list test instability.
  - Tag: Policy-Skipped/Patience-Bound for specs that skip when auth or preflight checks fail (e.g., contract suite preflight and some lecturer flows).

- UI timing gaps (not anchored to responses)
  - Observed `CanceledError` for GET `/api/timesheets` during dashboard re-renders (e.g., `approval-chain` startup). Tests recovered via subsequent polls but indicate polling where anchoring to `waitForResponse` would be stronger.
  - Tag: Patience-Bound for specs relying on multiple `toBeVisible` plus `expect.poll` without a single readiness sentinel.

- Contract lane specifics
  - 1 failure: `e2e/real/api/timesheets.contract.spec.ts:109` (server-side SSOT payload). Failure reason: dependent resource fetch `GET /api/courses` not OK; likely env seed timing or auth token not accepted for that request.
  - Tag: Patience-Bound (backend data precondition reliance) with a hint of Auth Warm-up.

- Deterministic vs. Flaky tags
  - Deterministic: `tutor-restricted.spec.ts:8`, `lecturer-create-timesheet.spec.ts:23` (passes in P0 with SSOT checks and sentinels), `approval-chain.spec.ts:11` (P0 pass; deep-link + response anchoring present, minor extra waits remain).
  - Patience-Bound: `admin-user-management.spec.ts:7` (depends on `/api/users` readiness), modules/tutor-workflow suite entries (several flaky reports in full run), parts of examples/UAT flows.
  - Policy-Skipped: Negative invariants in `approval-chain.spec.ts:88` skip when environment permits earlier approvals; some lecturer happy paths skip when preflight endpoints are not ready.

**Recommendations**
- Auth readiness standardization
  - Add a shared `waitForAuthAndWhoamiOk()` readiness helper and use it once per test after navigation. Gate first list fetch on a validated `whoami` probe to eliminate 401 bursts.

- Replace stacked visibility waits with a single sentinel + network anchoring
  - Use exactly one route-level sentinel per page (already present). After it is visible, gate critical UI interactions by `waitForResponse` for the specific list or POST that enables the action. Remove duplicate `toBeVisible` chains.

- Harden contract lane preconditions
  - Add a lightweight `seedOrVerifyCourses(lecturerId=2)` step in the contract suite setup using existing `/api/test-data/seed/lecturer-resources`. Fail fast with a clear message if unavailable instead of timing out mid-test.

- Stabilize dashboard fetches
  - For admin/lecturer dashboards, add an initial `waitForResponse(/\/api\/timesheets.*GET/)` after app-ready before asserting on region/table content to avoid `CanceledError` during hydration.

- Enforce workers=1 and retries=1 at the runner level
  - Keep `--workers=1` in `PLAYWRIGHT_ARGS` for all lanes. Consider setting `retries: 1` at the project level only for known-flaky group and `0` elsewhere to surface regressions deterministically.

- Next Iteration Tasks
  - Add `auth-warmup` helper and apply across real specs; replace repeated readiness checks.
  - Consolidate readiness to one sentinel per spec; remove extra `toBeVisible` calls.
  - Add `waitForResponse` anchors for dashboard list loads in admin/lecturer routes.
  - Extend contract suite setup with deterministic course/tutor seeding + assertion.
  - Review flaky tutor workflow specs to add route-level sentinels and network anchors.

