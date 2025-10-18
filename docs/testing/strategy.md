# Testing Strategy

## Layers
| Layer | Framework | Focus |
|-------|-----------|-------|
| Unit | JUnit 5, Mockito | Calculator rules, policy providers, application services |
| Integration | Spring Boot Test + Testcontainers | Controller contracts, Flyway migrations, repository behaviour |
| Contract | OpenAPI diff, controller tests | Ensures request/response payloads match spec |
| Frontend Unit | Vitest + Testing Library | Component rendering, quote hook behaviour |
| E2E | Playwright | Quote API usage, submission flow, role-based dashboards |
| Visual | Playwright Visual | Detect UI regressions in modal and dashboard views |

## Calculator Test Matrix
- Tutorial standard vs repeat
- Tutorial coordinator vs PhD
- Lecture P01-P04 variations
- Marking scenarios (M03-M05)

## CI Expectations
- All unit and integration tests run on every PR.
- Playwright mock suite and selected visual tests run on nightly builds.
- Real E2E executes on staging verification before release.

## Data Fixtures
- Test profile seeds rate data via Flyway migrations (V13+).
- Additional fixtures can be added under `src/test/resources/data/` when necessary.

## References
- `docs/backend/api-timesheets.md`
- `docs/frontend/testing.md`
- `docs/ops/release-checklist.md`
