# Testing Guide

This repository keeps CI focused on three jobs: backend tests, frontend unit tests, and real E2E tests.

Prerequisites
- Node.js 20+
- Java 21 (Temurin recommended)
- Docker (for E2E real backend)

Backend tests
- Run: `./gradlew check`
- Coverage/Reports: see `build/reports` under backend

Frontend unit tests
- Install deps: `cd frontend && npm ci`
- Run: `npm run test:unit`
- Coverage: `frontend/coverage/`

E2E tests (real)
- Install browsers once: `cd frontend && npx playwright install --with-deps chromium`
- Start via the canonical runner:
  - `node scripts/e2e-runner.js --project=real`
  - Optional subsets (faster): `--grep @p0` or `--grep contract`
- What it does
  1. Ensures backend (Docker compose mode) or reuses if running
  2. Starts frontend dev server at the expected origin
  3. Resets/Seeds test data (idempotent) and executes Playwright suites

Running CI locally with act
- Install act and a compatible runner image
  - `act -l` to list jobs
  - `act push -W .github/workflows/ci.yml -j backend -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-24.04`
- Tips
  - First runs are slow due to image/tooling downloads
  - E2E can be long; filter with `--grep @p0` for a quicker pass

Troubleshooting
- Playwright error about missing browsers: run `npx playwright install --with-deps chromium` in `frontend/`
- Port conflicts: ensure ports 8084 (backend) and 5174 (frontend) are free or adjust env
- Docker permission denied: add your user to the `docker` group or run elevated

