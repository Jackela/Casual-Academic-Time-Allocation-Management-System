# Quickstart: API Alignment Fixes (003)

## Purpose
- Align Courses→Tutors response to `{ tutorIds: number[] }`
- Lock contract with Playwright API tests

## Commands

API-only alignment checks:
```bash
node scripts/e2e-runner.js --project=real --grep=@api
```

Full E2E suite:
```bash
node scripts/e2e-runner.js --project=real
```

Seed/Reset (if needed before runs):
```bash
curl -X POST "$E2E_BACKEND_URL/api/test-data/reset" -H "X-Reset-Token: ${TEST_DATA_RESET_TOKEN:-local-e2e-reset}"
```

## Contract
- See contracts at: `specs/003-api-alignment-fixes/contracts/openapi.yml`

## CI Artifacts
- JSON reporter: `frontend/playwright-report/results.json`
- JUnit reporter: `frontend/playwright-report/junit.xml`

