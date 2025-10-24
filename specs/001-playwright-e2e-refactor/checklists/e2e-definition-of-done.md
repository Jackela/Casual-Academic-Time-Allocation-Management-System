# E2E Definition of Done (Real Suite)

- [ ] Uses programmatic login (UI login covered only in smoke)
- [ ] Selectors use data-testid exclusively (no brittle CSS/XPath)
- [ ] No focused tests committed (no `it.only`/`test.only`/`describe.only`)
- [ ] No `page.waitForTimeout` (use locator waits or expect.poll)
- [ ] No `page.route` network interception; tests hit real backend
- [ ] Spec delegates actions to POMs; assertions via helpers
- [ ] JSDoc added/updated for new or changed POM methods and utils
- [ ] Contract assertions present where applicable (OpenAPI shape/status semantics)
- [ ] Tags include priority and domain (e.g., `@p0`, `@timesheet`)
- [ ] Runtime budget respected (P0 flow < 3 minutes locally/CI)
- [ ] Flake candidates documented/updated in `frontend/e2e/real/fixtures/flake-log.md`
- [ ] New data-testids captured/updated in `frontend/e2e/real/fixtures/missing-testids.md`
- [ ] Reports/traces on failure verified (HTML, trace, screenshot)
