# CATAMS (Casual Academic Time Allocation Management System)

CATAMS is a full‑stack system for managing casual academic timesheets and approvals. It is aligned with both “Individual‑Casual Academic Time Allocation Management System (CATAMS).pdf” and “University‑of‑Sydney‑Enterprise‑Agreement‑2023‑2026”. The system provides:
- Timesheet create/edit/quote (EA rules: Tutorial fixed 1.0h delivery; associated caps for standard/repeat)
- Approval workflow (Tutor submit, Lecturer approval, HR final confirmation)
- Lecturer dashboard (hours by tutor, budget used/remaining, status breakdown)
- Unified error responses (problem+json) and end‑to‑end tests running under Docker

## Documentation / SSOT Quick Links
- Docs Home: `docs/index.md` (SSOT map and navigation)
- Product Requirements (SSOT): `docs/product/requirements/University-of-Sydney-Enterprise-Agreement-2023-2026.pdf` + `docs/product/requirements/University-of-Sydney-Enterprise-Agreement-2023-2026.txt`
- API Contract (SSOT): `docs/openapi.yaml` (source) → bundle `docs/openapi.bundled.yaml`
- Architecture (SSOT): `docs/architecture/overview.md` (see ADRs in `docs/adr/`)
- Backend Dev (SSOT): `docs/backend/development-guide.md`
- Frontend Architecture (SSOT): `docs/frontend/architecture.md`
- Testing (SSOT): `docs/testing/README.md`

## Tech Stack
- Backend: Java, Spring Boot, Spring Security (JWT), JPA/Hibernate, Flyway, Testcontainers (PostgreSQL)
- Frontend: React (Vite), TypeScript, Tailwind UI
- Testing: JUnit 5, Testcontainers, Vitest, Playwright
- DB: PostgreSQL (runtime / test containers)

## Running Locally (with Docker Testcontainers)

### Prerequisites
- Java 17+ (or 21)
- Node.js 20+
- Docker Desktop (for Testcontainers and E2E)

### 1) Install dependencies
```bash
git clone <repo-url>
cd Casual-Academic-Time-Allocation-Management-System
npm --prefix frontend install
```

### 2) Start backend (Testcontainers PostgreSQL)
```bash
./gradlew bootRun --args="--spring.profiles.active=e2e-local --server.port=8084"
```
Notes: the e2e/e2e-local profiles enable Testcontainers (or equivalent Postgres) and run Flyway migrations.

### 3) Start frontend (fixed 5174 for E2E)
```bash
npm --prefix frontend run dev:e2e
# open http://127.0.0.1:5174
```

## Testing (all on Docker)

### Backend (unit/integration, Testcontainers)
```bash
./gradlew cleanTest test
```

### Frontend (Vitest unit/component)
```bash
npm --prefix frontend test -- --reporter=verbose
```

### End‑to‑End (Playwright + Docker backend)
```bash
# Install browsers once
npm --prefix frontend exec playwright install --with-deps chromium

# Run full suite (auto check/reuse backend, start frontend, reset/seed data, execute specs)
node frontend/scripts/run-e2e-tests.js --project=real

# Run a subset
node frontend/scripts/run-e2e-tests.js --project=real --grep "@p0|@p1"
```
Reports/screenshots: `frontend/playwright-report` (or test-results per runner output).

## API Overview (brief)
- Auth: `POST /api/auth/login`, `POST /api/auth/logout` (204)
- Timesheets: `GET /api/timesheets`, `GET /api/timesheets/{id}`, `POST /api/timesheets`, `PUT /api/timesheets/{id}`, `DELETE /api/timesheets/{id}`
- My Timesheets: `GET /api/timesheets/me`
- Timesheet Queues: `GET /api/timesheets/pending-approval` (Tutor/Admin), `GET /api/timesheets/pending-final-approval` (Lecturer/Admin)
- Quote: `POST /api/timesheets/quote`
- Timesheets Config (UI constraints): `GET /api/timesheets/config`
- Approvals: `POST /api/approvals` (actions: SUBMIT_FOR_APPROVAL / TUTOR_CONFIRM / LECTURER_CONFIRM / HR_CONFIRM / REJECT / REQUEST_MODIFICATION)
- Approvals Pending: `GET /api/approvals/pending` (role‑aware)
- Approvals History: `GET /api/approvals/history/{timesheetId}`
- Dashboard: `GET /api/dashboard/summary?courseId=...&startDate=...&endDate=...` (also `GET /api/dashboard`)

> For the full OpenAPI specification, see the API documentation section or internal docs. All errors use problem+json (success=false, message, error, traceId).

## Key Business Rules (summary)
- Tutorial: fixed 1.0h delivery; associated caps standard ≤2.0h, repeat ≤1.0h; Rate Codes TU1/TU2 (non‑repeat), TU3/TU4 (repeat)
- ORAA/DEMO: hourly; high band (AO1/DE1) vs standard (AO2/DE2); educational delivery includes set up/pack down
- Marking: hourly for non‑contemporaneous only; contemporaneous goes into Tutorial associated
- Quote/Create rely on Schedule1Calculator + PolicyProvider for consistent EA rules

## Design & Error Handling
- DDD layering: Controller (thin validation and orchestration) → Service/Calculator/PolicyProvider (core rules)
- Fail‑fast: validate at API boundary (Monday session date, Tutorial=1.0h) to avoid downstream misuse
- Errors: problem+json (success=false, message, error, traceId); frontend shows Banner/Toast

## CI (basic)
- Backend: `./gradlew cleanTest test`
- Frontend unit: `npm --prefix frontend test -- --reporter=verbose`
- E2E: `node frontend/scripts/run-e2e-tests.js --project=real`

### Run GitHub Actions locally with act

This repo ships a preconfigured `.actrc` so you can run the CI locally:

- Requirements: Docker running; install act (https://github.com/nektos/act)
- The provided `.actrc` does the following:
  - Maps `ubuntu-latest` to `catthehacker/ubuntu:act-latest`
  - Mounts Docker socket and enables privileged mode for `docker compose`
  - Adds `host.docker.internal` gateway so containers can reach host services
  - Overrides E2E URLs to talk to host: `http://host.docker.internal:8084` and `http://host.docker.internal:5174`

Common commands:
- `act -l`                # list jobs
- `act -j backend`        # run backend job
- `act -j frontend-unit`  # run frontend unit tests
- `act -j e2e`            # run E2E job

Notes:
- If your Linux kernel doesn’t support `host-gateway`, replace `host.docker.internal` with your host IP in `.actrc`.
- Artifacts (e.g., Playwright reports) are saved under `./logs/act-artifacts` when using `actions/upload-artifact`.

## Troubleshooting
- Playwright browsers: `npm --prefix frontend exec playwright install --with-deps chromium`
- Port conflicts (8084/5174): stop conflicting processes or change ports
- Docker permissions: ensure your user can access Docker

