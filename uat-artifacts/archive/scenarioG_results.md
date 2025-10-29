# Scenario G: Backend Validation and Defensive Checks - SUCCESS ✅

## Test Objective:
Verify that backend enforces business rules and data integrity constraints with appropriate validation errors

## Test Execution:

### Test Setup:
**User**: admin@example.com (Admin User)  
**Role**: ADMINISTRATOR  
**Method**: Direct API calls via evaluate_script  
**Test Data**: Tutor ID 3, Course IDs 1 & 2

---

### Test 1: Non-Monday weekStartDate Validation

**API Request**:
```http
POST /api/timesheets
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "tutorId": 3,
  "courseId": 1,
  "taskType": "TUTORIAL",
  "qualification": "STANDARD",
  "repeat": false,
  "deliveryHours": 2.0,
  "weekStartDate": "2025-11-05",  // Wednesday (not Monday)
  "description": "UAT Test G.1: Non-Monday weekStartDate"
}
```

**API Response**:
```json
{
  "success": false,
  "timestamp": "2025-10-28T00:45:14.535145632Z",
  "status": 400,
  "error": "VALIDATION_FAILED",
  "message": "Business rule violated: Week start date must be a Monday. Provided date: 2025-11-05 (WEDNESDAY)",
  "errorMessage": "Business rule violated: Week start date must be a Monday. Provided date: 2025-11-05 (WEDNESDAY)",
  "path": "/api/timesheets"
}
```

**Result**: ✅ **400 Bad Request** - Expected behavior confirmed

**Validation**:
- ✅ HTTP Status: 400 Bad Request (correct for business rule violation)
- ✅ Error Code: VALIDATION_FAILED
- ✅ Error Message: Clear explanation including:
  - Business rule context ("Week start date must be a Monday")
  - Actual provided value ("2025-11-05")
  - Day of week identified ("WEDNESDAY")
- ✅ Day of Week Calculation: Backend correctly identifies non-Monday dates

---

### Test 2: Duplicate Timesheet Uniqueness Constraint

**Preconditions**:
- Existing timesheet for Tutor ID 3, Course ID 2, Week 2025-10-20 (created in test data)

**API Request** (Attempting Duplicate):
```http
POST /api/timesheets
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "tutorId": 3,
  "courseId": 2,
  "taskType": "LECTURE",  // Different task type
  "qualification": "ADVANCED",
  "repeat": true,
  "deliveryHours": 3.0,
  "weekStartDate": "2025-10-20",  // Same week as existing timesheet
  "description": "UAT Test G.2: Duplicate attempt"
}
```

**API Response**:
```json
{
  "success": false,
  "timestamp": "2025-10-28T00:45:25.023225357Z",
  "status": 400,
  "error": "VALIDATION_FAILED",
  "message": "Business rule violated: Timesheet already exists for this tutor, course, and week. Tutor ID: 3, Course ID: 2, Week: 2025-10-20",
  "errorMessage": "Business rule violated: Timesheet already exists for this tutor, course, and week. Tutor ID: 3, Course ID: 2, Week: 2025-10-20",
  "path": "/api/timesheets"
}
```

**Result**: ✅ **400 Bad Request** - Expected behavior confirmed

**Validation**:
- ✅ HTTP Status: 400 Bad Request (correct for uniqueness violation)
- ✅ Error Code: VALIDATION_FAILED
- ✅ Error Message: Clear explanation including:
  - Business rule context ("Timesheet already exists")
  - Specific conflict details (Tutor ID, Course ID, Week)
- ✅ Uniqueness Enforcement: Constraint (tutor + course + week) enforced
- ✅ Independence of Other Fields: Task type, qualification, hours don't bypass uniqueness check

---

## Additional Validation Discovered:

### Test 3: Future Date Validation

**Observation**: Backend also validates that `weekStartDate` cannot be in the future

**API Response**:
```json
{
  "success": false,
  "timestamp": "2025-10-28T00:45:14.560965587Z",
  "status": 400,
  "error": "VALIDATION_FAILED",
  "message": "Week start date cannot be in the future",
  "errorMessage": "Week start date cannot be in the future",
  "path": "/api/timesheets"
}
```

**Result**: ✅ Additional business rule validated (not in UAT plan, but good practice)

---

## Validation Results:

### ✅ Business Rules Enforced:

1. **Week Start Date Must Be Monday**: ✅
   - Backend calculates day of week
   - Rejects non-Monday dates with 400 Bad Request
   - Error message includes actual day name

2. **Uniqueness Constraint (Tutor + Course + Week)**: ✅
   - Database-level or service-level uniqueness check
   - Returns 400 Bad Request with conflict details
   - Prevents duplicate timesheets for same context

3. **Future Date Prevention**: ✅
   - Additional validation (bonus finding)
   - Prevents timesheets for future weeks

### ✅ Error Response Quality:

1. **Consistent Structure**: ✅
   - `success: false`, `status: 400`, `error: "VALIDATION_FAILED"`
   - Timestamps for audit trail
   - Path information for request correlation

2. **Actionable Error Messages**: ✅
   - Business rule explanation
   - Specific field values causing violation
   - Sufficient detail for frontend error display

### UAT Plan Alignment:

**Expected per UAT Plan**:
- ✅ Non-Monday weekStartDate → 400 Bad Request ✅
- ✅ Business rule message present ✅
- ✅ Duplicate (tutor+course+week) → 400 Bad Request ✅
- ✅ Uniqueness message present ✅

**Evidence Type**: API response bodies, HTTP status codes

---

## Status: SUCCESS ✅

**Test Coverage**: Complete  
**Expected Outcomes**: Fully met  
**Additional Findings**: Future date validation (bonus)  
**Recommendation**: Mark Scenario G as PASSED

## Evidence:
- Test 1: 400 error for Wednesday date with day-of-week detection
- Test 2: 400 error for duplicate tutor+course+week with conflict details
- Test 3: 400 error for future dates (additional validation)
- All error messages business-rule-driven and actionable

---

**Production Readiness**:
- ✅ Business rules enforced at API level
- ✅ Data integrity constraints validated
- ✅ Clear error messages for frontend integration
- ✅ Defensive programming prevents invalid state

**Related Scenarios**:
- Scenario 1: Timesheet Creation (FAILED) - validates happy path (blocked by other issue)
- Scenario F: Invalid transitions - validates state machine rules
- Scenario H: RBAC negative tests - validates authorization rules
