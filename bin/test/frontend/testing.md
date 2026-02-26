# Frontend Testing Guide

## Test Suites
| Suite | Command | Coverage |
|-------|---------|----------|
| Unit | `npm run test:ci` | React components, hooks, quote client |
| Mocked E2E | `npm run test:e2e:mock` | Playwright with mocked backend responses |
| Real E2E | `npm run test:e2e:real` | Playwright against running backend |
| Visual | `npx playwright test e2e/visual/tutor.spec.ts --project=visual` | Snapshot comparisons of key flows |

## Quote Flow Tests
- `e2e/quote-calculation-flow.spec.ts` ensures the form calls `/api/timesheets/quote` on input change and that `POST /api/timesheets` payload omits financial fields.
- Visual snapshots under `e2e/visual/tutor.spec.ts-snapshots/` capture the modal showing read-only calculation results; update them when the UI changes intentionally.

## Mocking Strategy
- Use MSW handlers in `frontend/e2e/mocks/` to return deterministic quotes.
- For unit tests, stub `timesheetQuoteClient` to simulate backend responses.

## Reporting
- Playwright HTML reports live under `frontend/playwright-report/`.
- Vitest coverage output stored in `frontend/coverage/`.

## Real E2E Constitution (Determinism)

- Determinism over patience: never use `waitForTimeout` in specs.
- Single sentinel + network anchors:
  - Exactly one route/region sentinel per spec via `toBeVisible({ timeout: 20000 })`.
  - Anchor critical actions with `waitForResponse`/`waitForApiOk` for list/quote/save before interacting.
- Auth warm-up: call `waitForAuthAndWhoamiOk(page)` once after navigation on protected routes, before first list fetch (e.g., `/api/users`, `/api/timesheets`).
- Policy-gated flows (EA billing, exceptions): prefer seed→edit pattern via test data factory; only keep one UI-create smoke spec when allowed by env.
- Runner: workers=1, retries=1 for the `real` project; report to `frontend/playwright-report`.
- CI guardrail: `npm run lint:e2e:timeouts` must pass (no `waitForTimeout(` in specs).

## Related Docs
- `docs/frontend/architecture.md`
- `docs/backend/api-timesheets.md`
- `docs/testing/strategy.md`
