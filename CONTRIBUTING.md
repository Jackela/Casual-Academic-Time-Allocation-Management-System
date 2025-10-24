# Contributing

This document highlights the conventions and guardrails for maintaining a clean architecture and a stable, maintainable E2E suite.

## Local Setup

- Node.js ≥ 18 and npm installed
- Install frontend deps:
  - `cd frontend && npm ci`
- Optional: set up pre-commit hooks to enforce E2E guardrails
  - `pwsh scripts/setup-git-hooks.ps1`

## E2E Environment

Real E2E uses environment variables. Copy and fill the example:

- `frontend/e2e/real/.env.example`

Required variables:

- `BASE_URL`
- `E2E_LECTURER_EMAIL`, `E2E_LECTURER_PASSWORD`
- `E2E_TUTOR_EMAIL`, `E2E_TUTOR_PASSWORD`
- `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`

Do not commit secrets. Use your shell env or CI secrets.

Quick preflight (local/CI):
- `cd frontend && node scripts/e2e-preflight.cjs`
  - Verifies `BASE_URL`/`E2E_FRONTEND_URL` and all role credentials are set
  - Checks the deployed frontend is reachable

## Running Tests

- Lint and typecheck: `cd frontend && npm run lint && npx tsc -b`
- Real E2E (Chromium-only): `cd frontend && npm run test:e2e:real`
- P0 subset: name specs under `e2e/real/specs/` (CI runs this folder as the P0 lane)
- Smoke (UI login): name files `*smoke*.spec.ts` under `e2e/real/tests/` (CI runs these by filename)

## E2E Guardrails (enforced)

- ESLint override for `frontend/e2e/real/**`:
  - Disallow `.only` in tests/suites
  - Disallow `page.waitForTimeout(..)`
  - Warn on very large functions and deep nesting
- Pre-commit hook checks (optional, via `scripts/setup-git-hooks.ps1`):
  - Blocks `.only` and `waitForTimeout` from being committed in real E2E
  - Warns if a spec under `e2e/real/specs/` is missing a priority tag like `@p0`/`@p1`
  - Blocks `page.route(...)` network interception; tests must exercise the real backend

## Best Practices

- Use `data-testid` selectors exclusively; avoid brittle CSS/XPath
- Prefer programmatic login; UI login only in smoke
- Keep specs thin: actions in Page Objects, assertions in helpers
- Contract-first: assert request/response shape via OpenAPI helpers
- Tag tests by priority (`@p0`, `@p1`) and domain (`@admin`, `@timesheet`)
- Record flake sources in `frontend/e2e/real/fixtures/flake-log.md`
- Maintain `specs/001-playwright-e2e-refactor/checklists/e2e-definition-of-done.md`

## CI

- Lint and typecheck always run
- Real E2E P0 runs when `BASE_URL` and user secrets are provided
- Playwright HTML report uploaded as artifact on failure
