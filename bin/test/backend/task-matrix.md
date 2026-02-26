# Task Matrix

Quick reference for the most common developer tasks. Each command runs from the repository root unless noted.

| Workflow | Command(s) | Notes |
| --- | --- | --- |
| Install backend deps | `./gradlew dependencies` | Wrapper bootstraps Gradle automatically |
| Install frontend deps | `cd frontend && npm ci` | Always use `npm ci` to ensure lockfile parity |
| Backend unit tests | `node tools/scripts/test-backend.js unit` | Delegates to Gradle with curated filters |
| Backend integration tests | `./gradlew integrationTest` | Spins up Testcontainers PostgreSQL (`node tools/scripts/test-backend.js integration` remains a wrapper) |
| Backend full suite (fallback) | `./gradlew clean test` | Use when Node orchestration is unavailable |
| Frontend unit/component/api | `npm run test:ci` (inside `frontend/`) | Vitest with coverage and reporters enabled |
| Frontend linting | `npm run lint` (inside `frontend/`) | Automatically picks up `.eslintrc` |
| Playwright mock E2E | `npm run test:e2e:mock` (inside `frontend/`) | Uses MSW to stub backend |
| Playwright real E2E | `npm run test:e2e:real` (inside `frontend/`) | Requires backend running on `:8084` |
| Playwright visual pass | `npm run test:e2e:visual` (inside `frontend/`) | Generates baseline under `frontend/playwright-report/visual` |
| Contract generation | `./gradlew generateContracts` | Produces Java/TypeScript artifacts + updates `schema/contracts.lock` |
| Schema drift gate | `./gradlew verifyContracts` | Validates fingerprints and `frontend/src/contracts/generated` |
| Spin up full stack (dev) | `docker compose up` | Defined in `docker-compose.yml` |
| Stop lingering processes | `node tools/scripts/cleanup-ports.js --ports=8084,5174` | Safe on Windows/macOS/Linux |
| Refresh agent metadata | `npm run bmad:refresh` | Rehydrates `.devtools/agents` when required |

_Add new workflows whenever tooling changes to keep this matrix discoverable._
