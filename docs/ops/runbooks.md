# Runbooks

## Quote Endpoint Incident
1. Confirm HTTP status and error message returned to clients.
2. Check backend logs for `Schedule1PolicyProvider` exceptions.
3. Validate policy data with `SELECT * FROM rate_amount WHERE code = ? ORDER BY effective_from DESC;`.
4. If data missing, re-run the seed migration or restore backup.

## Migration Failure
1. Inspect `flyway_schema_history` for failed row.
2. Roll back the database (if necessary) and fix migration scripts.
3. Redeploy backend once Flyway applies successfully.

## Rate Discrepancy Report
1. Retrieve stored `rateCode`, `rateVersion`, `formula`, and `clauseReference` from the affected timesheet.
2. Cross-check values with the EA Schedule 1 documentation.
3. If calculator bug suspected, add failing test to `Schedule1CalculatorTest` and coordinate hotfix.

## Payroll Cycle Verification – ORAA/Tutorial
1. Before payroll run, execute the SQL in `docs/ops/billing-sop.md` to confirm AO1/AO2/TU1/TU2 entries.
2. Generate a dry-run export and verify:
   - ORAA entries with PhD/coordinator flags use `AO1_DE1`.
   - ORAA entries without qualification use `AO2_DE2`.
   - Tutorial entries with PhD/coordinator flags use `TU1`; others use `TU2`.
3. If mismatches appear, capture payload + export row, reference EA Schedule 1 clauses (pp.213–219), and open an incident.
4. Notify compliance once corrected and document findings in governance tracker.

Document new runbooks here when incidents occur.
