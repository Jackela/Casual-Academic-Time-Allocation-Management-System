# Scenario 7: RBAC and Authorization Validation - PARTIAL SUCCESS

## Test Steps Executed:

### 7.1-7.3: Tutor Cannot Create Timesheets - SUCCESS ✅

✅ 7.1: Logout lecturer, login as tutor - SUCCESS
✅ 7.2: Navigate to tutor dashboard - SUCCESS
✅ 7.3: Verify no "Create Timesheet" button - SUCCESS

**RBAC Validation**:
- Tutor dashboard explicitly states: "Timesheets are created by your lecturer or administrator."
- No "Create Timesheet" button visible in UI
- Only available actions for tutor:
  - Confirm timesheets (PENDING_TUTOR_CONFIRMATION status)
  - Submit/Edit timesheets (MODIFICATION_REQUESTED status)

**UI Observations**:
- Quick Actions section: Only "Refresh Data" and "View Pay Summary" buttons
- No navigation to timesheet creation
- No form access for creating new timesheets

**Console**: No errors or warnings

**Conclusion**: ✅ Frontend RBAC correctly prevents tutors from creating timesheets

---

### 7.4-7.8: Cross-Course Authorization Test - NOT TESTED ⚠️

❌ Test blocked - missing lecturer2 test account

**Issue**: UAT plan requires testing cross-course authorization:
- Plan expects lecturer2 account (not assigned to COMP2022)
- Plan expects lecturer2 to attempt approving COMP2022 timesheet
- Expected result: 403 Forbidden

**Available Test Accounts** (from .env.e2e):
- admin@example.com
- lecturer@example.com (lecturer1)
- tutor@example.com
- ❌ No lecturer2@example.com

**Cannot Test**:
- Cross-course authorization enforcement
- 403 Forbidden response for unauthorized course access
- Error message: "Not authorized for this course"

---

## Summary

### Tested and Passed: ✅
1. Tutor role cannot create timesheets (UI-level RBAC)
2. Frontend properly restricts actions based on role
3. Clear user messaging about role limitations

### Not Tested: ⚠️
1. Backend API 403 enforcement (tutor create attempt)
2. Cross-course authorization (lecturer2)
3. Unauthorized approval attempts
4. Error handling for insufficient permissions

### Missing Test Data:
- lecturer2 test account for cross-course testing
- Separate course assignments for different lecturers

## Status: PARTIAL SUCCESS

**What Works**: Frontend RBAC for tutor role
**What's Missing**: Backend API validation testing, cross-course authorization

## Evidence:
- scenario7_tutor_no_create.png (tutor dashboard without create button)

## Recommendations:
1. Add lecturer2 test account to .env.e2e
2. Assign lecturer1 and lecturer2 to different courses
3. Test backend API 403 responses with unauthorized requests
4. Validate error messages and audit logging for failed authorization
