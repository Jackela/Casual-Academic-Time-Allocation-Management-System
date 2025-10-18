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

## Related Docs
- `docs/frontend/architecture.md`
- `docs/backend/api-timesheets.md`
- `docs/testing/strategy.md`
