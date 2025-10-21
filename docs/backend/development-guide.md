# Backend Development Guide

This guide outlines day-to-day workflows for working on the EA-compliant CATAMS backend.

## Environment Setup

1. Install Java 21, Node.js 18, and Docker (for Testcontainers).
2. Run `./gradlew dependencies` once to warm caches.
3. Copy `.env.example` to `.env.e2e` if Playwright tests will mock the API.

## Useful Commands

| Task | Command |
|------|---------|
| Clean build + unit tests | `./gradlew clean test`
| Integration tests (Testcontainers) | `./gradlew integrationTest`
| Run backend locally | `./gradlew bootRun`
| Generate OpenAPI bundle | `./gradlew openApiGenerate` (once schemas are refreshed)
| Apply code formatting | `./gradlew spotlessApply`

Scripts under `tools/scripts/` wrap these commands for CI automation; see `docs/ops/automation.md` after it is authored.

## Schedule 1 Workflow

1. **Quote First** ? implement endpoints or UI changes against `POST /api/timesheets/quote`.
2. **Calculator Usage** ? invoke `Schedule1Calculator` via application services; never instantiate it directly in controllers.
3. **Policy Data** ? rely on `Schedule1PolicyProvider` with date-effective queries. Tests should cover new clauses or rates before code changes.
4. **Persistence** ? always re-run the calculator before saving a timesheet. Integration tests enforce that requests never include `amount`, `hourlyRate`, `payableHours`, or related financial fields—the backend recalculates them on every create/update.

## Testing Strategy

- **Unit Tests**: Place under `src/test/java/...`. Use Mockito sparingly; favour real collaborators when possible.
- **Spring Boot Integration Tests**: Annotate with `@SpringBootTest` and `@ActiveProfiles("test")`. Use `@Sql` or repository inserts to seed required data.
- **Calculator Matrix**: Extend `Schedule1CalculatorTest` with boundary cases (repeat tutorials, lectures, marking) when adding new rules.
- **API Tests**: `TimesheetControllerIntegrationTest` is the source of truth for controller contracts.

Run `./gradlew test` before pushing. If migrations are modified, add explicit tests that prove legacy data still loads.

## Database Migrations

- Place files under `src/main/resources/db/migration` with incremental versions (e.g., `V15__add_demo_rates.sql`).
- Migrations must be reversible (use `DELETE` for seed cleanups) and include comments referencing EA clauses.
- After adding seed data, update calculator tests to reference a specific policy row so the suite proves the data is used.

## Debugging Tips

- Enable SQL logging by setting `logging.level.org.hibernate.SQL=debug` in `application.yml` (temporary).
- Use `./gradlew bootRun --args='--spring.profiles.active=local'` to load a custom profile.
- Testcontainers caches Docker images; run `docker system prune` if environments drift.

## Code Style

- Follow Spring conventions; service classes are package-private unless externally shared.
- DTOs live in `com.usyd.catams.dto`; map using dedicated mapper classes.
- Prefer constructor injection; avoid field injection.

## Related Docs

- `docs/backend/api-timesheets.md`
- `docs/backend/data-model.md`
- `docs/policy/timesheet-ssot.md`
- `docs/policy/ea-compliance-plan.md`
