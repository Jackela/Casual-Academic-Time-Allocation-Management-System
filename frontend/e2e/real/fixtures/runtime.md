# E2E Real Suite Runtime

- Date: 2025-10-23
- Command: `npm run test:e2e:real`
- Local runtime: ~21m 04s (Playwright output stopwatch)
- Notes:
  - Includes P1 modules and workflows; several P1 specs currently failing (admin user creation policy 400, billing workflows).
  - P0 subset (`npm run test:e2e:p0`) completes in ~2.6–3.6m and is 100% green on first run after recent fixes.

Intended PR note: add the above durations under “Test Runtime” and link to Playwright HTML report artifact.

