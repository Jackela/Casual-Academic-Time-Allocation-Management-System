# Quickstart: API Alignment Tests

**Branch**: 002-api-alignment-tests

## Prerequisites

- Backend and frontend reachable
- Environment variables:
  - `E2E_BACKEND_URL` (e.g., http://localhost:8084)
  - `E2E_FRONTEND_URL` (e.g., http://localhost:5174)
  - `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`
  - `E2E_LECTURER_EMAIL`/`E2E_LECTURER_PASSWORD`
  - `E2E_TUTOR_EMAIL`/`E2E_TUTOR_PASSWORD`

## Run Fail-First API Tests

```bash
npm --prefix frontend run test:e2e -- frontend/e2e/real/api/courses-tutors.spec.ts
npm --prefix frontend run test:e2e -- frontend/e2e/real/api/tutor-assignments.spec.ts
npm --prefix frontend run test:e2e -- frontend/e2e/real/api/lecturer-assignments.spec.ts
```

Expected now: failing with 404/500 (or forbidden) where endpoints or ACLs are misaligned. Failures print the exact URL, status, and body to aid diagnosis.

## Seed/Reset Cross-Check

From repo root, reset and seed before full runs:

```bash
# Reset backend data (requires TEST_DATA_RESET_TOKEN)
curl -X POST "$E2E_BACKEND_URL/api/test-data/reset" -H "X-Reset-Token: ${TEST_DATA_RESET_TOKEN:-local-e2e-reset}"

# Seed lecturer resources used by tests (IDs from frontend/.env.e2e)
curl -X POST "$E2E_BACKEND_URL/api/test-data/seed/lecturer-resources?lecturerId=2"
curl -X POST "$E2E_BACKEND_URL/api/test-data/seed/lecturer-resources?lecturerId=3"

# Optional: run only API alignment suite
node scripts/e2e-runner.js --project=real --grep=@api

# Full suite
node scripts/e2e-runner.js --project=real
```

## CI Execution & Exit Codes

- The Playwright config enables JSON + JUnit reporters. CI can collect artifacts from `frontend/playwright-report/`.
- Tests run headless and `forbidOnly` is enabled on CI; any failure returns a non‑zero process exit code.
- Recommended CI command examples:

```bash
# API-only alignment in CI
node scripts/e2e-runner.js --project=real --grep=@api

# Full suite in CI
node scripts/e2e-runner.js --project=real

# Direct invocation (if runner not used)
cd frontend && npx playwright test --project=real --reporter=junit,json
```

Non‑zero exit behavior is enforced by Playwright and propagated by the runner. Any failing test will fail the CI job.

## Contracts

See OpenAPI sketch: `specs/002-api-alignment-tests/contracts/openapi.yml`.

