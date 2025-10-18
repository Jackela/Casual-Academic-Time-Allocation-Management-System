# ORAA & Tutorial Rate Compliance Review Briefing

## Purpose
- Walk EA stakeholders through the updated billing engine behaviour for Schedule 1 ORAA and Tutorial activities.
- Capture explicit sign-off that AO1/AO2/TU1 rate selections comply with *University of Sydney Enterprise Agreement 2023–2026* (Schedule 1).

## Required Participants
- Compliance lead (EA authority)
- Payroll operations representative
- Engineering representative (billing engine)
- QA representative (integration test owners)

## Scenario Walk-through Checklist
1. **ORAA – PhD/Coordinator (AO1-DE1)**
   - Use `POST /api/timesheets/quote` with `taskType=ORAA`, `qualification=PHD`.
   - Expect rate code `AO1_DE1`; confirm hourly amount matches EA Schedule 1 p.217 table (Clause 1.1(a)).
2. **ORAA – Standard (AO2-DE2)**
   - Same endpoint with `qualification=NONE`.
   - Expect rate code `AO2_DE2`; verify rate against EA Schedule 1 p.217.
3. **Tutorial – Qualified Tutor**
   - `taskType=TUTORIAL`, `qualification=PHD`.
   - Expect automatic `TU1` selection per Schedule 1 p.213.
4. **Tutorial – Standard Tutor**
   - `qualification=NONE`.
   - Expect `TU2` selection.
5. **Regression sanity**
   - Spot-check unrelated rate (e.g., `LECTURE`, `WORKSHOP`) to confirm no regressions.

## Evidence to Capture
- Screenshot or log extract of each API response showing rate codes and hourly amounts.
- Reference to automated tests:
  - `TimesheetControllerIntegrationTest.calculatingRateForOraaTaskFailsWhenRateIsMissing`
  - `TimesheetControllerIntegrationTest.calculatorAutomaticallySelectsHigherRateBandForQualifiedTutor`
- Link to migration script `V13__Seed_schedule1_rates.sql` diff showing AO1/AO2 seeds.

## Sign-off Items
- [ ] EA representative confirms AO1/AO2/TU1 logic adheres to Schedule 1 definitions.
- [ ] Payroll ops confirms rate exports align with current payroll tooling.
- [ ] QA confirms automated coverage and future regression strategy.
- [ ] Engineering confirms deployment plan and rollback readiness.

## Follow-up Tracking
- Record approvals in governance tracker (Step 6).
- Log any additional edge cases or documentation updates requested by stakeholders.
