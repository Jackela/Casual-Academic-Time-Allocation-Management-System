# Deployment Guide

## Scope
Operational checklist for deploying the EA-compliant CATAMS backend and frontend. This replaces the legacy multi-environment playbook.

## Pre-Deployment Checklist
- Ensure `main` branch is green (`./gradlew test` and `npm run test:e2e`).
- Review Flyway migrations in `src/main/resources/db/migration` (look for new `V__` files) and confirm they have been applied to staging.
- Confirm seeded Schedule 1 data (run `SELECT code, qualification, hourly_amount_aud FROM rate_amount LIMIT 5;`).
- Verify OpenAPI specification is regenerated if contracts changed (`docs/openapi/` bundle).

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection with Flyway access |
| `JWT_SECRET`, `JWT_EXPIRATION` | Security configuration |
| `SERVER_PORT` | Backend port (default 8084) |
| `FRONTEND_URL` | CORS origin for SPA |

## Deployment Steps

1. **Build Artifacts**
   - Backend: `./gradlew clean bootJar`
   - Frontend: `cd frontend && npm ci && npm run build`

2. **Database Migration**
   - Run the application with `SPRING_PROFILES_ACTIVE=prod` or execute Flyway standalone.
   - Check `flyway_schema_history` to ensure the latest `V13`+ entries (policy seeding) applied.

3. **Application Rollout**
   - Deploy backend JAR or container.
   - Set `CATAMS_ENV=prod` (if used) and supply env vars above.
   - Wait for `GET /actuator/health` to report `UP`.

4. **Frontend Rollout**
   - Publish build artifacts (static hosting or container).
   - Update environment configuration so `/api` points at the new backend.

5. **Post-Deployment Verification**
   - Run smoke tests: `./gradlew test --tests "*TimesheetControllerIntegrationTest"` and `npm run test:e2e:smoke`.
   - Manually run a quote via `curl` to `/api/timesheets/quote` and confirm rate metadata matches expectation.
   - Confirm a tutor submission recalculates totals (check logs for `Schedule1Calculator` entries).

## Rollback
- Keep previous backend and frontend artifacts available for immediate redeploy.
- Restore database from latest snapshot if migration corrupted data.
- Document incident and capture calculator discrepancies for follow-up.

## Operations Notes
- Finance reporting depends on `rate_code` and `rate_version` fields?verify they exist in database snapshots.
- Playwright visual snapshots live under `frontend/e2e/visual`; replace if UI changes are intentional.
- Use `node tools/scripts/cleanup-ports.js` to close stray dev ports on shared hosts.

## Related Documents
- `docs/ops/troubleshooting.md`
- `docs/policy/timesheet-ssot.md`
- `docs/backend/api-timesheets.md`
