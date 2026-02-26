# Automation Reference

## Node Scripts (tools/scripts)
| Script | Purpose |
|--------|---------|
| `test-backend-unit.js` | Runs `./gradlew test` with unit filters.
| `test-backend-integration.js` | Executes integration tests (Testcontainers).
| `test-frontend-unit.js` | Runs `npm run test:ci` in the frontend.
| `test-frontend-e2e.js` | Kicks off Playwright suites.
| `cleanup.js` | Frees ports and temp resources after test runs.
| `cleanup-ports.js` | Kill processes bound to specific ports (used in CI cleanup).

## Other Automation
- GitHub Actions workflows run the scripts above sequentially (see `.github/workflows/`).
- Use `npm run bmad:refresh` to regenerate BMAD agent metadata when instructions change.

Keep this list in sync with new scripts or renamed utilities.
