# Scenario 5: Lecturer Rejects Timesheet - SUCCESS

## Test Steps Executed:
✅ 5.1: Login as lecturer - SUCCESS
✅ 5.2: Navigate to Pending Approvals - SUCCESS
✅ 5.3: Identify TUTOR_CONFIRMED timesheet - SUCCESS
  - Timesheet #3: COMP1001, 13 Oct 2025, 9h, $387
  - Status: "Tutor Confirmed"
✅ 5.4: Click Reject button - SUCCESS
✅ 5.5: Rejection dialog opened - SUCCESS
✅ 5.6: Enter rejection reason - SUCCESS
  - Reason: "UAT Test - Hours do not match session records"
✅ 5.7: Submit rejection - SUCCESS
✅ 5.8-5.11: Verify rejection - SUCCESS
  - Timesheet #3 removed from Pending Approvals list
  - Pending count decreased: 5 → 4
  - No console errors

## Validation:
- Dialog displayed proper fields (reason required)
- Rejection reason captured
- State transition: TUTOR_CONFIRMED → REJECTED

## Status: SUCCESS
## Evidence:
- scenario5_before_reject.png
- scenario5_rejected.png
