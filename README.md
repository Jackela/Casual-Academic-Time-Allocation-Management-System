# CATAMS (Casual Academic Time Allocation Management System)

CATAMS is a full‑stack application for managing casual academic timesheets and approvals. The repository is organized as a Java Spring Boot backend and a React + Vite frontend, with Playwright for end‑to‑end testing.

This README focuses on the essentials: how to run locally, how to test (backend, frontend unit, and E2E), and how the simplified CI pipeline is structured.

## Prerequisites
- Node.js 20+
- Java 21 (Temurin recommended)
- Docker (required for real E2E backend)

## Quick start
Clone and install dependencies where needed.

Backend (Spring Boot):
- Build and test: `./gradlew check`
- Run locally (example): `./gradlew bootRun`

Frontend (React + Vite):
- Install: `cd frontend && npm ci`
- Dev server: `npm run dev`

## Testing

Backend tests:
- `./gradlew check`

Frontend unit tests (Vitest):
- `cd frontend && npm ci`
- `npm run test:unit`

E2E tests (Playwright, real backend):
- Install browsers once: `cd frontend && npx playwright install --with-deps chromium`
- Run canonical suite: `node scripts/e2e-runner.js --project=real`
- Faster subset: add `--grep @p0`

Runner behavior:
1) Ensures a backend is available (Docker compose mode by default)
2) Starts the frontend dev server on the configured origin
3) Resets/Seeds test data and executes Playwright specs

## CI (Basic)
The pipeline is intentionally simple and reliable:
- Backend job: `./gradlew check`
- Frontend unit job: `npm run test:unit`
- E2E job: `node scripts/e2e-runner.js --project=real` (uploads Playwright report on failure)

You can run CI locally with `act` (see `docs/testing.md`).

## Cleaning generated files
Use the provided scripts or NPM targets to clean all generated content. See `docs/cleaning.md` for details.

Common commands:
- `npm run clean` (cross‑platform)
- `npm run clean:backend`
- `npm run clean:frontend`

## Troubleshooting
- Missing Playwright browsers: `cd frontend && npx playwright install --with-deps chromium`
- Port conflicts (8084/5174): stop conflicting processes or adjust env
- Docker permissions: add your user to docker group or run elevated

