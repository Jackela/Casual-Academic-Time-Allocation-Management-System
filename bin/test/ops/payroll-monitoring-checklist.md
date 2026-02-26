# Payroll Monitoring Checklist – AO1/AO2/TU1 Focus

## Objective
Ensure the first live payroll cycle after the qualification-aware release produces correct Schedule 1 rate codes and amounts.

## Pre-Cycle
- Confirm migrations applied: `flyway_schema_history` includes `V13__Seed_schedule1_rates`.
- Review integration test results from latest build (`./gradlew.bat test`).
- Notify stakeholders of monitoring window and escalation channel.

## Day-of Monitoring
1. Enable detailed logging for `Schedule1Calculator` (if supported via config toggle).
2. Capture sample quotes:
   - ORAA with PhD/coordinator → expect `AO1_DE1`.
   - ORAA without qualification → expect `AO2_DE2`.
   - Tutorial with PhD/coordinator → expect `TU1`.
   - Tutorial standard → expect `TU2`.
3. Export preliminary payroll dataset and filter by `rateCode IN ('AO1_DE1','AO2_DE2','TU1','TU2')`.
4. Reconcile hourly rates against EA Schedule 1 (pp.213–219).

## Post-Cycle Validation
- Compare exported totals with finance ledger entries.
- Document findings (success or discrepancies) in governance tracker (Step 6).
- If issues detected:
  - Extract offending rows.
  - Record API payloads / user IDs.
  - Create incident ticket with EA clause reference and expected vs actual values.

## Tooling
- SQL template available in `docs/ops/billing-sop.md`.
- Reporting spreadsheets: update `ops/payroll-monitoring.xlsx` (create if absent).

## Communication
- Daily status summary to compliance + payroll ops until monitoring window closes.
- Final confirmation email including evidence attachments and tracker entry ID.
