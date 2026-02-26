# Billing SOP – Schedule 1 Rates

## Scope
- Applies to quote calculation and payroll export steps for Schedule 1 activities (Tutorials, ORAA, Demonstrations).
- Incorporates AO1/AO2/TU1 automation delivered in October 2025.

## Pre-Run Checklist
1. Confirm Flyway migration `V13__Seed_schedule1_rates` has executed in the target environment.
2. Validate reference data:
   ```sql
   SELECT code, qualification, task_type, hourly_rate, clause_reference
   FROM rate_amount
   WHERE code IN ('AO1_DE1', 'AO2_DE2', 'TU1', 'TU2')
   ORDER BY effective_from DESC;
   ```
3. Ensure EA reference copy (`University-of-Sydney-Enterprise-Agreement-2023-2026.pdf`) is accessible to operators.

## Quote Calculation
- Quotes submitted through `/api/timesheets/quote` auto-select rate codes based on task type and qualification.
- ORAA:
  - `qualification=PHD` or `coordinationDuty=true` ⇒ `AO1_DE1`.
  - Otherwise ⇒ `AO2_DE2`.
- Tutorial:
  - `qualification=PHD` or `coordinationDuty=true` ⇒ `TU1`.
  - Otherwise ⇒ `TU2`.
- Document clause references from EA Schedule 1 pages 213–219 in exported artefacts.

## Payroll Export
1. Generate hourly summaries grouped by `rateCode`.
2. Spot-check at least one ORAA and one Tutorial entry per run to confirm correct rate bands.
3. If discrepancies found, escalate to engineering with API payload, calculated rate, and expected EA clause.

## Exception Handling
- Missing policy ⇒ re-run migration or restore seed data.
- Unexpected rate selection ⇒ capture request payload, computed result, and EA reference for triage.
- Update QA with new edge case so it can be modelled in integration tests.

## Documentation
- Keep user guide (`docs/product/user-guide.md`) aligned with the current automation.
- Record approvals and incidents in governance tracker.
