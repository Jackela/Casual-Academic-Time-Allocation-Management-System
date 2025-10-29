# Scenario 6: Request Modification Flow - BLOCKED

## Test Steps Executed:
✅ 6.1: TUTOR_CONFIRMED timesheet available - SUCCESS
  - Timesheet #5: COMP2001, 29 Sept 2025, 8.5h, $374
  - Status: "Tutor Confirmed"
❌ 6.2: Look for "Request Modification" button - FAILED

## Issue Details:
**Missing Feature**: "Request Modification" button not found in UI

**Current Available Actions**:
- Approve button (uid=38_72)
- Reject button (uid=38_73)

**Expected According to Plan**:
- Plan expects "Request Modification" button (uid: "button-request-modification-{TIMESHEET_ID}")
- Feature allows lecturer to request changes before approving

**UI State**:
- Page: Lecturer Dashboard > Pending Approvals
- Timesheet Status: TUTOR_CONFIRMED
- Available actions limited to binary approve/reject

## Console Errors:
- No console errors or warnings

## Validation:
- ❌ Modification request feature not implemented in current UI
- ⚠️  Cannot test modification workflow as designed in plan
- ⚠️  Cannot validate REQUEST_MODIFICATION action
- ⚠️  Cannot test resubmission after modification

## Status: BLOCKED
**Reason**: Feature not implemented - "Request Modification" functionality missing from UI

## Evidence:
- scenario6_before_modification.png (shows only Approve/Reject buttons)

## Recommendation:
- Verify if modification request feature is planned but not yet implemented
- If implemented elsewhere, update test plan with correct navigation path
- Consider if this is expected behavior or missing functionality
