# Flake Audit — P0 Suite

Incident: US3 negative intermittently flaky on first run.

Symptoms:
- Occasionally no actionable row appeared in the Pending Review panel before click.
- First run would mark as flaky; retry passed.

Root cause:
- Cross‑test shared variable `approved` (in approval-chain.spec.ts) flipped to true in the positive case and was not reset before the negative case, leading to an empty list state.

Fixes applied:
- Test isolation: reset `approved = false;` at the start of each test.
- Deterministic scoping: scope all row/button queries to `data-testid="timesheets-table"` within `data-testid="admin-pending-review"`.
- UI oracle: assert `approval-error-banner` is visible and persists ≥1s after 409 response.

Status:
- P0 suite passes 100% on first run after fixes.

Notes:
- Keep shared state out of describe scope where possible; prefer per‑test local state or fixtures.

Determinism Constitution (added):
- One sentinel per spec; anchor lists/quote/save via network waits.
- Add whoami auth warm-up once after navigation on protected routes.
- No `waitForTimeout(` in specs; use `waitForStableVisible` only as optional post-sentinel micro-window.

