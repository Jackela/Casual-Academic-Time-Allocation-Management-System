# Config Mock Contract

The Playwright mock for the configuration API (`/api/config` and `/api/timesheets/config`) guarantees that end-to-end tests always receive layout metadata aligned with the Sprint 1 SSOT refactor. This document captures the expectations for that mock so contributors understand what stays in sync and where to evolve it.

## Purpose
- Provide deterministic UI layout data for mock E2E runs so dashboards render with the same breakpoints, column widths, and feature flags used in production.
- Prevent flaky regressions caused by stale design tokens by forcing tests to consume the same values that drive the live UI.

## Sources of Truth
- **Design tokens:** `frontend/src/styles/design-tokens.css` — authoritative definitions for breakpoints, column widths, toast offsets, and z-index layers.
- **Mock implementation:** `frontend/e2e/fixtures/base.ts` — `registerConfigRoutes` registers interceptors that fulfill configuration requests with `MOCK_UI_LAYOUT_CONFIG`.

Any update to the design tokens **must** be mirrored in the mock payload to keep functional and visual tests accurate.

## Contracted Payload
`MOCK_UI_LAYOUT_CONFIG` is the canonical structure returned by the mock routes. Key fields that must remain synchronized with the design tokens include:

- **Feature flags**
  - `ENABLE_ACTIVITY_COLUMN: false`
  - `ENABLE_LAST_UPDATED_COLUMN: true`
  - `ENABLE_CONFIG_DRIVEN_COLUMNS: false`
  - `ENABLE_CARD_VIEW: false`
- **Responsive breakpoints**
  - `mobile: 768px`
  - `tablet: 1024px`
  - `tabletLandscape: 1280px`
  - `desktop: 1440px`
  - `desktopWide: 1920px`
- **Timesheet column widths**
  - `weekStarting: 140px`
  - `hours: 100px`
  - `rate: 110px`
  - `totalPay: 130px`
  - `status: 160px`
  - `actions: 200px`
  - `lastUpdated: 150px`
- **Toast safe-zone constraints**
  - `topClearance: 80px`
  - `maxWidth: 420px`
  - `rightOffset: 16px`
- **Z-index layers**
  - `header: 100`
  - `banner: 200`
  - `popover: 400`
  - `overlay: 900`
  - `modalBackdrop: 950`
  - `modal: 1000`
  - `toast: 1500`
  - `tooltip: 2000`

## Update Workflow
1. Modify the desired value in `frontend/src/styles/design-tokens.css`.
2. Update the corresponding entry in `MOCK_UI_LAYOUT_CONFIG` within `frontend/e2e/fixtures/base.ts`.
3. Regenerate affected visual baselines and rerun `npm run test:e2e:mock` to confirm the dashboards still render as expected.
4. Record the change in this document if new contract fields are introduced.

Maintaining this contract ensures that the Playwright mock remains a reliable reflection of the live UI contract and prevents divergent layouts between test and production environments.
