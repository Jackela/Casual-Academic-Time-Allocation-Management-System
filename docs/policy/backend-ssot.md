# Backend SSOT Policy

## Purpose
Define how the CATAMS backend maintains single source of truth (SSOT) status for financial calculations derived from the Enterprise Agreement.

## Responsibilities
- **Engineering** ? Maintain the Schedule1 calculator, policy provider, and associated tests.
- **Operations** ? Validate Flyway migrations and monitor calculator health metrics.
- **Product/UX** ? Communicate rule changes and ensure the UI follows minimal-input design.

## Enforcement Rules
1. Only backend services may calculate Associated Hours, Payable Hours, Hourly Rate, and Amount.
2. Controllers must discard any client-supplied financial values before persistence.
3. Schedule1 policy data must be sourced directly from the EA and tracked via Flyway migrations.
4. All calculator changes require tests that assert the new behaviour and clauses.

## Monitoring
- Logs: `Schedule1Calculator` emits rate code, version, and amount for each calculation.
- Alerts: Configure log or metric alerts when calculations fail or no rate data is found.
- Audits: Regularly sample stored timesheets to confirm clause references align with the EA.

## Change Management
- Use `docs/rfc/` to document deviations or temporary overrides.
- Update `docs/policy/ea-schedule1-overview.md` when clauses change.

## Related Documents
- `docs/policy/timesheet-ssot.md`
- `docs/backend/api-timesheets.md`
- `docs/policy/ea-compliance-plan.md`
