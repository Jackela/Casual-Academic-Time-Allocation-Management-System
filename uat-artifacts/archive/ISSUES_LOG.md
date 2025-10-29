# UAT Issues Log - CATAMS

## Critical Issues

### ❌ ISSUE-001: Timesheet Creation Returns 400 Bad Request
**Severity**: CRITICAL  
**Scenario**: Scenario 1  
**Description**: POST /api/timesheets fails with 400 Bad Request after successful Quote API validation  
**Evidence**: scenario1_results.md, scenario1_create_failed.png  
**Impact**: Blocks primary lecturer workflow, prevents auto-submit testing  
**Status**: RESOLVED (requires deterministic reset prior to Scenario 1)  
**Fix**: Added `npm run e2e:reset` workflow + Docker restart guidance to guarantee clean dataset (no duplicate weeks).

---

## High Priority Issues

### ❌ ISSUE-002: Request Modification Feature Not Implemented
**Severity**: HIGH  
**Scenario**: Scenario 6  
**Description**: "Request Modification" button missing from UI, feature appears not implemented  
**Evidence**: scenario6_results.md, scenario6_before_modification.png  
**Impact**: Cannot test modification workflow, listed in UAT plan and API matrix  
**Status**: RESOLVED  
**Fix**: Implemented Request Modification action in lecturer/admin dashboards with comment modal and automated tests.

---

## Medium Priority Issues

### ⚠️ ISSUE-003: Missing lecturer2 Test Account for Cross-Course RBAC Testing
**Severity**: MEDIUM  
**Scenario**: Scenario 7 (7.4-7.9)  
**Description**: Only 3 test users exist (admin, lecturer, tutor). Both courses (COMP1001, COMP2001) assigned to same lecturer.  
**Location**: `src/main/java/com/usyd/catams/config/E2EDataInitializer.java` lines 81-113  
**Impact**: Cannot test cross-course authorization (lecturer2 attempting to approve lecturer1's course)  
**Fix**: Default seed now provisions `lecturer2@example.com` with dedicated courses (COMP3001/EDEV10xx) and exposed credentials.  
**Status**: RESOLVED  

### ⚠️ ISSUE-004: No Loading Indicators for Async Actions
**Severity**: MEDIUM  
**Scenario**: Scenario 8.6  
**Description**: Refresh Data button works but shows no loading spinner/skeleton during fetch  
**Evidence**: scenario8_results.md  
**Impact**: Poor UX - users may double-click thinking action didn't register  
**Status**: OPEN  

---

## Low Priority / Informational

### ℹ️ ISSUE-005: Mobile Responsiveness Testing Blocked by Tool Limitation
**Severity**: LOW  
**Scenario**: Scenario 8.7  
**Description**: MCP resize_page tool error: "Restore window to normal state before setting content size"  
**Impact**: Cannot test 375px mobile layout via automation  
**Workaround**: Manual testing on real devices/emulators required  
**Status**: ACKNOWLEDGED  

### ℹ️ ISSUE-006: Keyboard Navigation Testing Limited by Tool Capabilities
**Severity**: LOW  
**Scenario**: Scenario 8.9  
**Description**: MCP tools cannot simulate Tab/Enter/Esc key events  
**Impact**: Cannot verify tab order, focus indicators, keyboard shortcuts  
**Observation**: Semantic HTML elements properly used (good foundation)  
**Workaround**: Manual keyboard testing required  
**Status**: ACKNOWLEDGED  

---

## Test Coverage Gaps

### ⚠️ GAP-001: Backend API 403 Enforcement Not Tested
**Scenarios**: 7.2-7.3 (tutor create), 7.4-7.9 (cross-course)  
**Description**: Only frontend RBAC validated, backend API responses not tested  
**Recommendation**: Direct API testing with unauthorized requests  

### ⚠️ GAP-002: Boundary/Input Validation Not Tested
**Scenarios**: 8.1-8.5  
**Description**: No testing of edge cases (invalid hours, XSS, SQL injection, etc.)  
**Reason**: Time constraints, requires form access  

### ⚠️ GAP-003: Performance Testing Not Executed
**Scenarios**: 8.8  
**Description**: Quote API speed, dashboard load time, large datasets not measured  
**Reason**: Requires specialized tooling and data seeding  

### ⚠️ GAP-004: Network Resilience Not Tested
**Scenarios**: 8.11-8.12  
**Description**: Session expiration, offline mode, retry mechanisms not validated  
**Reason**: Requires network interception and time manipulation  

---

**Log Created**: 2025-10-27  
**Last Updated**: 2025-10-28
