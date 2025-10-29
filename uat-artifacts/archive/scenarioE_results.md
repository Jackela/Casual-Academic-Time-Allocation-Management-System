# Scenario E: Approval History and Audit Trail - PARTIAL SUCCESS

## Test Objective:
Verify that approval history API exists and returns chronological audit trail with actor, action, status transitions, and timestamps

## API Endpoint Verification:

### ✅ API Exists
**Endpoint**: `GET /api/approvals/history/{timesheetId}`  
**Location**: `ApprovalController.java` lines 68-76  
**Authorization**: `@PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")`

**Implementation Details**:
```java
@GetMapping("/history/{timesheetId}")
@PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
public ResponseEntity<java.util.List<ApprovalActionResponse>> getConfirmationHistory(
        @PathVariable("timesheetId") Long timesheetId) {
    Long requesterId = authenticationFacade.getCurrentUserId();
    var approvals = approvalService.getApprovalHistory(timesheetId, requesterId);
    var responses = approvals.stream().map(approvalMapper::toResponse).collect(Collectors.toList());
    return ResponseEntity.ok(responses);
}
```

## Test Execution:

### Test 1: API Call for Timesheet #2
**Request**:
```javascript
GET /api/approvals/history/2
Authorization: Bearer {tutor_token}
```

**Response**:
```json
{
  "status": 200,
  "data": []
}
```

**Result**: ✅ **API responds successfully** but returns **empty array**

### Observations:
1. ✅ API endpoint accessible and returns 200 OK
2. ✅ Authentication working (tutor token accepted)
3. ⚠️ Empty response - no approval history records found
4. ℹ️ Database appears to have been reset (timestamps changed to 28 Oct 2025, 11:34 am)

## Root Cause Analysis:

**Why Empty Response**:
1. Database was reset between UAT sessions (all timesheets reset to initial state)
2. Previous approval actions (Scenarios 2-4) performed on old data
3. Current timesheets don't have approval history yet

**Evidence**:
- Timesheet timestamps: "28 Oct 2025, 11:34 am" (all identical)
- Previous UAT timestamps: "27 Oct 2025, 10:xx pm"
- Data mismatch indicates database reset occurred

## Expected Response Format:

Based on controller implementation, expected response should include:
```json
[
  {
    "id": number,
    "timesheetId": number,
    "action": "TUTOR_CONFIRM" | "LECTURER_CONFIRM" | "HR_CONFIRM" | "REJECT" | "REQUEST_MODIFICATION",
    "actorId": number,
    "actorName": string,
    "previousStatus": string,
    "newStatus": string,
    "comment": string | null,
    "timestamp": "ISO-8601 datetime",
    "approverId": number
  }
]
```

## What Cannot Be Tested:

Due to database reset and empty approval history:
- ❌ Cannot verify chronological ordering of approval entries
- ❌ Cannot verify actor information (id, name) is captured
- ❌ Cannot verify previous/new status transitions are logged
- ❌ Cannot verify comments are persisted for rejection/modification
- ❌ Cannot verify timestamp accuracy
- ❌ Cannot test UI display of approval history (if exists)

## What Was Verified:

✅ **API Infrastructure**:
1. Endpoint exists at correct path (`/api/approvals/history/{timesheetId}`)
2. RBAC protection in place (TUTOR, LECTURER, ADMIN roles)
3. Returns proper HTTP status codes (200 OK)
4. Returns valid JSON response (empty array is valid)
5. Authorization token validation working

## Recommendations:

### To Complete This Test:
1. **Execute approval workflow** (Scenarios 2-4) on fresh data
2. **Immediately test history API** before database reset
3. **Verify response contains**:
   - All approval actions in chronological order
   - Actor information for each action
   - Status transition details
   - Comments for rejection/modification actions
   - Accurate timestamps

### Production Considerations:
4. **Data persistence**: Verify approval history survives across deployments
5. **Retention policy**: Define how long approval history should be kept
6. **Audit requirements**: Ensure meets compliance/audit trail requirements
7. **UI integration**: Verify if UI displays approval history to users

---

## Status: PARTIAL SUCCESS

**API Verification**: ✅ SUCCESS (endpoint exists, returns 200, RBAC working)  
**Data Validation**: ❌ BLOCKED (database reset, no historical data available)  
**Recommendation**: Retest with live approval workflow data

## Evidence:
- API response: `{"status":200,"data":[]}`
- Controller code location: `ApprovalController.java:68-76`
- Database reset observed: timestamps all "28 Oct 2025, 11:34 am"
