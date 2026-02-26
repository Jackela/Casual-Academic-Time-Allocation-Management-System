# Release Checklist

1. **Code Quality**
   - [ ] `./gradlew test` passes locally
   - [ ] `npm run test:e2e` (mock or real depending on release) passes
2. **Database**
   - [ ] Flyway migrations reviewed and applied to staging
   - [ ] Seeded rates verified (`SELECT COUNT(*) FROM rate_amount;`)
3. **API Contracts**
   - [ ] OpenAPI docs updated (`docs/openapi/` regenerated if endpoints changed)
   - [ ] Timesheet integration tests green
4. **Frontend**
   - [ ] Quote flow manually smoke-tested
   - [ ] Visual snapshots regenerated/approved if UI changed
5. **Documentation**
   - [ ] `docs/index.md` highlights new release in Latest Updates
   - [ ] Release notes appended (`docs/product/release-notes.md`)
6. **Post-Deploy**
   - [ ] Monitor logs for calculator warnings
   - [ ] Verify one full tutor submission end-to-end

Sign off requires all boxes checked by Engineering and Operations.
