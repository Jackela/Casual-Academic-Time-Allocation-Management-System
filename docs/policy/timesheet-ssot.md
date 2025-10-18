# Timesheet Single Source of Truth Policy

## Objective
The backend is the sole authority for all financial outcomes related to casual academic timesheets. This policy documents the rules that enforce compliance with the University of Sydney Enterprise Agreement Schedule 1.

## Principles
1. **Authoritative Calculations** ? `Schedule1Calculator` is the only component allowed to produce associated hours, payable hours, hourly rates, and total amounts.
2. **Minimal Client Payloads** ? UI layers submit instructional data only (course, task type, qualification, repeat flag, delivery hours, notes).
3. **Deterministic Persistence** ? `POST /api/timesheets` and `PUT /api/timesheets/{id}` ignore any client-supplied financial values and recompute the result before saving.
4. **Auditability** ? Every persisted row records the `rateCode`, `rateVersion`, `formula`, and `clauseReference` used so finance teams can trace calculations back to the EA.
5. **Transparency** ? The frontend displays the calculation formula and clause reference returned by the quote to keep tutors informed.

## Workflow Requirements

1. **Quote Requirement**
   - All UI flows must call `POST /api/timesheets/quote` whenever task parameters change.
   - Quotes expire after context changes (date, hours, qualification). Clients must re-request before saving.

2. **Server Enforcement**
   - The application service repeats the calculation during create/update operations even if a quote was just retrieved.
   - Financial fields in incoming payloads are ignored; the controller never maps them onto the entity.

3. **Testing Gate**
   - Integration tests must assert that client-sent financial data is discarded and replaced with calculator results.
   - Playwright tests mock `/api/timesheets/quote` to ensure the UI issues the call when hours change and that submit payloads exclude financial fields.

## Evolution and Governance

- Policy updates (new EA versions, corrected rates) must land via Flyway migrations and corresponding calculator tests.
- Any exception or manual override requires an RFC under `docs/rfc/` and must include rollback steps.
- When seed data changes, communicate clause updates to the product and UX teams so user-facing content remains accurate.

## References
- `docs/policy/ea-compliance-plan.md`
- `docs/backend/api-timesheets.md`
- `docs/frontend/ux-spec.md`
- `docs/testing/strategy.md`
