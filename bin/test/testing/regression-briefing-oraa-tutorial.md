# Regression Briefing – ORAA/Tutorial Compliance

## Summary
- New integration tests cover Schedule 1 compliance gaps for ORAA and Tutorial tasks.
- Objective: ensure QA can extend coverage and monitor regressions tied to qualification-aware rate selection.

## Existing Automated Coverage
- `TimesheetControllerIntegrationTest.calculatingRateForOraaTaskFailsWhenRateIsMissing`
  - Guards against missing AO1/AO2 seed data.
- `TimesheetControllerIntegrationTest.calculatorAutomaticallySelectsHigherRateBandForQualifiedTutor`
  - Verifies TU1 selection when `qualification = PHD`.
- Unit coverage: `Schedule1Calculator` logic branches for qualification-aware rate selection.

## Recommended Additional Scenarios
1. **Coordination Duty Override**
   - Input: `taskType=TUTORIAL`, `qualification=NONE`, `coordinationDuty=true`.
   - Expected: `rateCode=TU1`.
2. **Historical Effective Date**
   - Quote with `timestamp` prior to latest EA increment to ensure back-dated rates still resolve correctly.
3. **ORAA Repeating Sessions**
   - Multi-session ORAA request to validate calculation of payable hours alongside AO1/AO2 selection.
4. **Negative Testing**
   - Force unknown qualification to confirm system defaults to standard rate and logs warning.

## Test Data Requirements
- Seed database via Flyway up to `V13__Seed_schedule1_rates.sql`.
- Ensure test fixtures include tutor records with/without PhD flag and coordination duty.

## Tooling & Automation
- Regression suite command: `./gradlew.bat test`.
- Consider smoke test in CI that calls `/api/timesheets/quote` with canned payloads using `rest-assured`.

## Reporting
- Capture new test results in `test-results/` artefacts.
- Flag Schedule 1 coverage in QA dashboards with alias `schedule1-qualification`.
