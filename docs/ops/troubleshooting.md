# Troubleshooting Guide

## Quote Failures
- **HTTP 400** during `POST /api/timesheets/quote` usually indicates invalid delivery hours or repeat rules. Validate inputs on the frontend and review calculator logs for the clause triggered.
- **HTTP 404** means no rate data exists for the given task type/qualification/date. Confirm `rate_code` and `rate_amount` tables contain the expected rows for the year.

## Migration Issues
- Check `flyway_schema_history` to confirm the newest version executed.
- If Flyway stops on `V13__Seed_schedule1_rates.sql`, ensure the database user has permission to insert into the policy tables.

## Calculation Mismatch
1. Compare the stored `rateCode`, `rateVersion`, and `formula` with the EA schedule.
2. Re-run the quote via `curl` to verify the calculator output.
3. If the backend returns unexpected values, inspect `Schedule1PolicyProvider` logs to see which rate rows were loaded.

## API Errors
- `403 Forbidden`: role lacks permission. Confirm `TimesheetPermissionPolicy` rules and JWT claims.
- `409 Conflict`: status transition invalid (e.g., attempting to approve an already approved timesheet).

## Frontend Symptoms
- Read-only financial fields show `--`: the quote request likely failed. Inspect network tab for `/api/timesheets/quote` and retry after correcting inputs.
- Form submits with financial data: ensure the quote service strips calculated fields. The Playwright test `quote-calculation-flow.spec.ts` should catch regressions.

## Logs & Monitoring
- Backend logs include entries such as `Calculated quote for TU1@EA-2023-2026-Schedule1:v1.0.0 amount=197.31`.
- Enable DEBUG logging for `com.usyd.catams.service.Schedule1PolicyProvider` when diagnosing policy selection.

## Support
Escalate persistent calculator discrepancies to the operations team with the affected `rateCode`, `rateVersion`, and clause reference.
