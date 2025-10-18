# CATAMS - EA-Compliant Timesheet Platform

CATAMS manages casual academic timesheets for tutors, lecturers, and faculty admins. The backend is the single source of truth for Schedule 1 calculations from the University of Sydney Enterprise Agreement 2023-2026.

## Quick Start
1. **Backend:** `./gradlew bootRun`
2. **Frontend:** `cd frontend && npm ci && npm run dev`
3. **Quote Smoke Test:**
   ```bash
   curl -X POST http://localhost:8084/api/timesheets/quote \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "tutorId": 2,
       "courseId": 101,
       "taskType": "TUTORIAL",
       "qualification": "STANDARD",
       "repeat": false,
       "deliveryHours": 1.0,
       "sessionDate": "2025-08-11"
     }'
   ```

## Key Commands
| Purpose | Command |
|---------|---------|
| Backend unit + integration tests | `./gradlew test`
| Backend integration slice | `./gradlew integrationTest`
| Frontend unit tests | `cd frontend && npm run test:ci`
| Playwright E2E (mock) | `cd frontend && npm run test:e2e:mock`
| Playwright E2E (real backend) | `cd frontend && npm run test:e2e:real`

## Documentation
Start at `docs/index.md` for architecture, policy, frontend, ops, and product guides.

## Testing Matrix
High-level strategy lives in `docs/testing/strategy.md` with links to unit, integration, and Playwright suites covering the Schedule 1 calculator and quote workflow.

## Support & Contribution
- Governance and contribution rules: `CONTRIBUTING.md`
- EA compliance references: `docs/policy/`
- Raise issues in the repository tracker with the `docs` or `backend`/`frontend` labels as appropriate.
