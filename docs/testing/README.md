# Testing and Reports

This project uses a Clean → Generate → Test workflow.

## 1) Clean

Use the provided tasks to remove all generated artifacts and reports:

- Canonical: `node scripts/clean-all.js`
- Backend (Gradle): `./gradlew cleanAll`
- Frontend (npm): `cd frontend && npm run clean`

Artifacts removed include backend `build/`, `.gradle/`, `test-results/`; frontend `dist/`, `coverage/`, `playwright-report/`, `playwright-screenshots/`, `test-results/`, `trace-inspect/`; contracts and OpenAPI generated code under `build/generated-contracts/`, `build/generated/openapi/`, and `frontend/src/contracts/generated/`.

## 2) Generate (when needed)

Some tests depend on generated contracts and OpenAPI outputs. The Gradle build wires contract generation before compilation, and schema extraction before tests. If you need to explicitly regenerate artifacts:

- Contracts: `node scripts/generate-contracts.js` (or `--verify`)
- OpenAPI bundle: `node scripts/generate-openapi.js --bundle-only` (outputs to `build/docs/api/openapi.yaml`)

## 3) Test

- Backend unit + integration + coverage: `./gradlew check`
- Frontend unit/utility tests with coverage: `cd frontend && npm ci && npm run test:ci`
- E2E (Playwright): `node scripts/e2e-runner.js --project=real` (or `--grep @p0`, `--project=smoke`)

Karate API tests are present but skipped by default unless `karate.baseUrl` (or `KARATE_BASE_URL`) is set, ensuring they do not block CI when a backend URL is not provided.

## Reports

- Backend coverage (JaCoCo): `build/reports/jacoco/test/html/index.html`
- Frontend coverage (Vitest): `frontend/coverage/index.html`
- E2E report (Playwright): `frontend/playwright-report/`

Generated code is excluded from coverage by default:

- Backend: `com/usyd/catams/client/**` (OpenAPI) and `com/usyd/catams/contracts/**` are excluded via Gradle.
- Frontend: `src/contracts/**` (including `src/contracts/generated/**`) excluded via Vitest config.

## Hooks & Guards

- Pre-commit hook blocks generated outputs from being committed.
  - Configure once: `git config core.hooksPath .githooks`
  - Hook: `.githooks/pre-commit`
- CI guard fails when ad‑hoc generator/runner scripts are added outside `scripts/` or `tools/`.
  - Script: `node scripts/guard-allowed-generators.js`
  - Invoked in CI pipelines.

## Migration Note

- Canonical scripts (top-level):
  - `node scripts/clean-all.js`
  - `node scripts/generate-contracts.js`
  - `node scripts/generate-openapi.js`
  - `node scripts/e2e-reset-seed.js`
  - `node scripts/e2e-runner.js`
  - `node scripts/coverage-report.js`
- Older helpers under `tools/scripts/` remain as the authoritative implementations; top-level `scripts/*` are stable entry points wrapping them or Gradle tasks.
- CI and package.json now call only the canonical entry points. Remove or avoid adding ad-hoc generators outside `scripts/` or `tools/`.
- Install repo hooks to block committing generated outputs:
  - `git config core.hooksPath .githooks`
  - Verify: try staging files under ignored outputs; commit should be blocked.
