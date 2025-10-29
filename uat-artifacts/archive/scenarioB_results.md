# Scenario B: Tutor Sees Auto-Submitted Timesheet - SUCCESS ✅

## Test Objective:
Verify that tutor can see newly auto-submitted timesheets in "Pending Tutor Review" list with proper status and available actions

## Test Execution:

### Login State:
**User**: tutor@example.com (John Doe)  
**Role**: TUTOR  
**Dashboard**: Tutor Dashboard

### Observations:

#### Found 2 Pending Tutor Review Timesheets:

**Timesheet #1**:
- **Course**: Course 1 - Introduction to Programming
- **Week Starting**: 27 Oct 2025
- **Hours**: 10h
- **Rate**: $45.00
- **Total Pay**: $450.00
- **Status Badge**: "Pending Tutor Review"
- **Description**: "Tutorial sessions and marking for COMP1001"
- **Submitted**: 28 Oct 2025, 11:34 am
- **Last Updated**: 28 Oct 2025, 11:34 am
- **Available Actions**: "Confirm" button ✅

**Timesheet #2**:
- **Course**: Course 2 - Data Structures and Algorithms
- **Week Starting**: 20 Oct 2025
- **Hours**: 8h
- **Rate**: $50.00
- **Total Pay**: $400.00
- **Status Badge**: "Pending Tutor Review"
- **Description**: "Lab supervision and student consultations"
- **Submitted**: 28 Oct 2025, 11:34 am
- **Last Updated**: 28 Oct 2025, 11:34 am
- **Available Actions**: "Confirm" button ✅

## Validation Results:

### ✅ Expected Behavior Confirmed:

1. **Visibility**: ✅ Auto-submitted timesheets appear in tutor's dashboard
2. **Status Display**: ✅ Status badge shows "Pending Tutor Review"
3. **Timestamp Accuracy**: ✅ Submitted and Last Updated timestamps present
4. **Action Availability**: ✅ "Confirm" button visible and enabled
5. **No Edit Permission**: ✅ No "Edit" button present (read-only for tutor)
6. **Information Completeness**: ✅ All timesheet details visible (course, hours, pay, description)

### Additional Observations:

- **Dashboard Statistics**: Shows "5 In Progress" timesheets (includes pending tutor review)
- **Tab Organization**: "In Progress (5)" tab contains pending tutor review items
- **Notification Banner**: "2 timesheets require revision before approval" (referring to REJECTED/MODIFICATION_REQUESTED items)

## UAT Plan Alignment:

**Expected per UAT Plan**:
- ✅ Tutor dashboard includes the item under Pending list
- ✅ No edit action available
- ✅ Confirm button visible

**Evidence Type**: UI observation, accessibility tree analysis

## Status: SUCCESS ✅

**Test Coverage**: Complete  
**Expected Outcome**: Fully met  
**Recommendation**: Mark Scenario B as PASSED

## Evidence:
- Tutor dashboard snapshot captured
- 2 timesheets in PENDING_TUTOR_CONFIRMATION state
- Confirm buttons present for both items
- No edit permissions visible (RBAC enforced)
- Status badges correctly display "Pending Tutor Review"

---

**Related Scenarios**:
- Scenario 2: Tutor Confirms Timesheet (SUCCESS) - validates the confirm action
- Scenario 7: RBAC Testing (PARTIAL) - validates tutor cannot edit
