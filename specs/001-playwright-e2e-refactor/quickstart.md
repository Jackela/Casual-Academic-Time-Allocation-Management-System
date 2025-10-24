# Quickstart: Refactor CATAMS Playwright E2E (real)

## Prerequisites
- Node.js >= 18
- Test environment with Tutor/Lecturer/Admin accounts
- BASE_URL and credentials available to tests

## Login Strategy
- Programmatic login for most flows
- UI login covered in a smoke scenario only

## Running the Suite
- Install deps (if needed): npm ci
- Run real E2E: npm run test:e2e:real
- Filter by tag (examples):
  - P0 flows: @p0
  - Admin management: @admin

## Selector Policy
- Use data-testid exclusively for element targeting
- No brittle CSS/XPath; avoid arbitrary waits — use expect.poll or await conditions

## SSOT Assertions
- No client financial fields in payloads
- Quote request on input change; verify server-calculated results on save

## Troubleshooting
- Flaky tests: verify data-testid presence and login helper
- Environment: confirm BASE_URL and user activation state
