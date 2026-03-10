# E2E Test Failure Analysis

## Test Results Summary
- **Total**: 115 tests
- **Passed**: 108 (93.9%)
- **Failed**: 6 (5.2%)
- **Skipped**: 1 (0.9%)

## Fixed Issues

### 1. ✅ tutor-workflow.spec.ts - REJECTED timesheet editable
**File**: `frontend/src/components/shared/TimesheetTable/tutor-capabilities.ts:21`
**Issue**: REJECTED status had `canEdit: true, canSubmit: true`
**Fix**: Changed to `canEdit: false, canSubmit: false, canConfirm: false`
**Impact**: REJECTED timesheets now correctly show no-actions placeholder

### 2. ✅ admin-overview-alignment.spec.ts - Missing Bearer token
**File**: `frontend/e2e/real/specs/admin-overview-alignment.spec.ts:23`
**Issue**: `Authorization: token ? Bearer : ''` - syntax error
**Fix**: Changed to `Authorization: token ? \`Bearer ${token}\` : ''`
**Impact**: Admin pending approvals API call now works

### 3. ✅ modification-rejection.spec.ts - Wrong actor case
**File**: `frontend/e2e/real/specs/modification-rejection.spec.ts:47`
**Issue**: Used `'ADMIN'` instead of `'admin'`
**Fix**: Changed to lowercase `'admin'`
**Impact**: Rejection transition now uses correct actor

### 4. ✅ ea-billing-compliance.spec.ts - Syntax errors
**File**: `frontend/e2e/real/workflows/ea-billing-compliance.spec.ts`
**Issues**: 
- Line 461: `await await expect` (double await)
- Lines 494-499: Duplicate assertions
**Fixes**: 
- Removed extra `await`
- Removed duplicate expect statements
**Impact**: Test syntax now valid

## Remaining Issues

### 5. ⏳ approval-chain.spec.ts
**Test**: "draft → tutor confirm → lecturer approve → admin approve"
**Status**: Complex test with multiple fallback paths
**Observations**:
- Test has extensive SSOT (Single Source of Truth) fallback logic
- Multiple try-catch blocks for UI timing issues
- Uses API fallback when UI not ready

**Potential Issues**:
1. Timing: UI may not be ready within timeout periods
2. Backend state: LECTURER_CONFIRMED may not transition to FINAL_CONFIRMED
3. UI elements: Approve button may not be visible or clickable

**Analysis Needed**:
- Check if admin can approve LECTURER_CONFIRMED status
- Verify HR_CONFIRM action is valid from LECTURER_CONFIRMED
- Review button visibility selectors

### 6. ⏳ timesheet-exception-workflows.spec.ts
**Test**: "Admin rejection locks timesheet in final rejected state"
**Status**: API-driven test with UI verification

**Observations**:
- Uses API to reject timesheet (line 340-345)
- Expects REJECTED status in backend (line 356)
- UI verification is best-effort (line 359-364)

**Potential Issues**:
1. Rejection action may not be allowed at LECTURER_CONFIRMED state
2. UI may not update to reflect rejection
3. Timing issues with page reload

**Analysis Needed**:
- Verify REJECT action allowed from LECTURER_CONFIRMED
- Check if rejection is permanent (no re-submission allowed)

## Action Plan

### Phase 1: Verify Backend Business Rules
1. Check ApprovalStateMachine for allowed transitions:
   - LECTURER_CONFIRMED → HR_CONFIRM → FINAL_CONFIRMED
   - LECTURER_CONFIRMED → REJECT → REJECTED
2. Verify ApprovalAction enum has HR_CONFIRM and REJECT
3. Check TimesheetPermissionPolicy for admin permissions

### Phase 2: Analyze UI Components
1. Check admin approve button rendering in AdminDashboard
2. Verify status badge updates after rejection
3. Review TimesheetTable action buttons for REJECTED status

### Phase 3: Test Execution Strategy
Since E2E tests timeout in CI environment:
1. Run backend unit tests to verify state machine
2. Run frontend unit tests to verify UI components
3. Use smaller E2E test batches with increased timeouts
4. Consider running E2E tests in Docker mode for stability

## Conclusion

**Code Fixes Applied**: 4/6 issues fixed with code changes
**Remaining**: 2 tests likely have timing/integration issues rather than code bugs
**Recommendation**: Verify backend state machine transitions before re-running E2E tests
