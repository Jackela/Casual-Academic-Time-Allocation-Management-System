# Real E2E Suite (Playwright)

This folder contains the Chromium-only “real” end‑to‑end suite focused on critical user journeys. It follows stability‑first practices and thin‑spec architecture.

## Layout
- pages/: Page Objects (single responsibility, composed helpers)
- specs/: P0 user‑story specs (CI P0 lane runs this folder)
- tests/: supplemental/speculative or smoke tests (UI login smoke named `*smoke*.spec.ts`)
- utils/: shared helpers (login, selectors, contract, ssot)
- fixtures/: flake log, missing test IDs, runtime notes

## Conventions
- Selectors: use `data-testid` or `getByTestId` exclusively
- Login: programmatic by default; UI login only in smoke
- Specs: keep thin; actions in POMs, assertions in helpers
- Contracts: assert request/response with `utils/contract.ts` when applicable
- Tags: optionally include `@p0` for P0 and domain tags like `@timesheet` in spec text
- Budgets: target P0 flows < 3 minutes; suite ≤ 10 minutes in CI

## CI Selection
- P0 lane: runs files under `specs/`
- Smoke lane: runs files matching `tests/*smoke*.spec.ts`

## Definition of Done
See `specs/001-playwright-e2e-refactor/checklists/e2e-definition-of-done.md` for the checklist used during reviews.

## Local Run
- Install deps: `npm ci`
- Real E2E: `npm run test:e2e:real`
- P0 by folder: `npx playwright test e2e/real/specs --config=e2e/real/playwright.config.ts`
- Smoke by filename: `npx playwright test e2e/real/tests/*smoke*.spec.ts --config=e2e/real/playwright.config.ts`

Environment variables for real E2E are documented in `.env.example`.

