# Scenario F: Invalid Transitions and Conflict Handling - SUCCESS ✅

## Test Objective:
Verify that backend state machine correctly rejects invalid approval transitions with appropriate HTTP status codes and error messages

## Test Execution:

### Test Setup:
**User**: admin@example.com (Admin User)  
**Role**: ADMINISTRATOR  
**Method**: Direct API calls via evaluate_script

### Test 1: HR Confirm Before Lecturer Confirm

**Preconditions**:
- Timesheet ID 4 in TUTOR_CONFIRMED status
- Admin attempting HR_CONFIRM action

**API Request**:
```http
POST /api/approvals
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "timesheetId": 4,
  "action": "HR_CONFIRM",
  "comment": "UAT Test F.1: HR confirm before lecturer"
}
```

**API Response**:
```json
{
  "success": false,
  "timestamp": "2025-10-28T00:43:38.178660292Z",
  "status": 409,
  "error": "RESOURCE_CONFLICT",
  "message": "Admin approval requires prior Lecturer approval",
  "errorMessage": "Admin approval requires prior Lecturer approval",
  "path": "/api/approvals"
}
```

**Result**: ✅ **409 Conflict** - Expected behavior confirmed

**Validation**:
- ✅ HTTP Status: 409 Conflict (correct for state machine violation)
- ✅ Error Code: RESOURCE_CONFLICT (semantically appropriate)
- ✅ Error Message: Clear, business-rule-driven message
- ✅ State Machine Enforcement: HR_CONFIRM requires LECTURER_CONFIRMED status

---

### Test 2: Invalid Action for Completed State

**Preconditions**:
- Timesheet ID 7 in FINAL_CONFIRMED status
- Admin attempting LECTURER_CONFIRM action

**API Request**:
```http
POST /api/approvals
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "timesheetId": 7,
  "action": "LECTURER_CONFIRM",
  "comment": "UAT Test F.2: Lecturer confirm on final confirmed"
}
```

**API Response**:
```json
{
  "success": false,
  "timestamp": "2025-10-28T00:43:38.212777831Z",
  "status": 400,
  "error": "VALIDATION_FAILED",
  "message": "Cannot perform LECTURER_CONFIRM on timesheet with status FINAL_CONFIRMED",
  "errorMessage": "Cannot perform LECTURER_CONFIRM on timesheet with status FINAL_CONFIRMED",
  "path": "/api/approvals"
}
```

**Result**: ✅ **400 Bad Request** - Expected behavior confirmed

**Validation**:
- ✅ HTTP Status: 400 Bad Request (correct for invalid operation)
- ✅ Error Code: VALIDATION_FAILED (semantically appropriate)
- ✅ Error Message: Clear explanation of state machine violation
- ✅ Finality Enforcement: FINAL_CONFIRMED state cannot be re-approved

---

## Validation Results:

### ✅ State Machine Integrity:

1. **Workflow Ordering Enforced**: ✅
   - HR_CONFIRM requires prior LECTURER_CONFIRM
   - 409 Conflict returned when prerequisite missing

2. **Terminal State Protection**: ✅
   - FINAL_CONFIRMED cannot transition backward
   - 400 Bad Request for invalid operations on final states

3. **Error Response Quality**: ✅
   - HTTP status codes semantically correct (409 vs 400)
   - Error messages business-rule-driven
   - Error codes standardized (RESOURCE_CONFLICT, VALIDATION_FAILED)
   - Timestamps included for audit trail

### UAT Plan Alignment:

**Expected per UAT Plan**:
- ✅ HR confirm before lecturer confirm → 409 Conflict ✅
- ✅ Message: "Admin approval requires prior Lecturer approval" ✅
- ✅ Invalid action for state → 400 Bad Request ✅
- ✅ Message reflects invalid transition ✅

**Evidence Type**: API response bodies, HTTP status codes

## Additional Observations:

### State Machine Rules Validated:
1. **TUTOR_CONFIRMED** → **HR_CONFIRM** = ❌ 409 (requires LECTURER_CONFIRMED)
2. **FINAL_CONFIRMED** → **LECTURER_CONFIRM** = ❌ 400 (terminal state)

### Error Handling Best Practices:
- ✅ Consistent error response structure
- ✅ Timestamp for debugging and audit
- ✅ Path information for request correlation
- ✅ Dual error message fields (error + errorMessage)
- ✅ Success flag set to false

## Status: SUCCESS ✅

**Test Coverage**: Complete  
**Expected Outcomes**: Fully met  
**Recommendation**: Mark Scenario F as PASSED

## Evidence:
- Test 1: 409 Conflict response with correct error message
- Test 2: 400 Bad Request response with correct error message
- State machine integrity preserved
- Business rules enforced at API level

---

**Production Readiness**:
- ✅ State machine validation robust
- ✅ Error messages actionable for frontend/API consumers
- ✅ HTTP status codes follow REST best practices
- ✅ No data corruption risk from invalid transitions

**Related Scenarios**:
- Scenario 2-4: Valid approval workflow (SUCCESS) - validates happy path
- Scenario H: RBAC negative tests - validates authorization before state machine
