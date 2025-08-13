# Detailed Test Failure Analysis - Individual Test Breakdown

**Analysis Date**: January 8, 2025  
**Failed Tests**: 21 out of 24 contract tests  
**Methodology**: Line-by-line examination of each failed test case

## 📋 **Test-by-Test Failure Analysis**

### **Group 1: Authentication Contract Tests (4 failures)**

#### **Test 1: "should handle successful login with valid credentials"**
- **Line**: 32
- **Code**: `const result = await apiClient.login(credentials);`
- **Error**: `apiClient.login is not a function`
- **Expected Behavior**: Call login method with email/password, get AuthResponse
- **Root Cause**: ApiClient has `authenticate()` method, test expects `login()`
- **Impact**: Authentication flow testing blocked

#### **Test 2: "should handle failed login with invalid credentials"** 
- **Line**: 47
- **Code**: `await expect(apiClient.login(credentials)).rejects.toThrow();`
- **Error**: `apiClient.login is not a function`
- **Expected Behavior**: Test error handling for invalid credentials
- **Root Cause**: Same as Test 1 - missing login() method
- **Impact**: Error handling validation blocked

#### **Test 3: "should validate authentication request format"**
- **Line**: 52-58
- **Code**: Multiple `apiClient.login()` calls with invalid data
- **Error**: `apiClient.login is not a function`  
- **Expected Behavior**: Validate input parameters (empty email, empty password)
- **Root Cause**: Same as Test 1 - missing login() method
- **Impact**: Input validation testing blocked

#### **Test 4: "should handle different user roles"**
- **Line**: 72
- **Code**: `const result = await apiClient.login({ email, password });`
- **Error**: `apiClient.login is not a function`
- **Expected Behavior**: Test LECTURER, TUTOR, ADMIN role responses
- **Root Cause**: Same as Test 1 - missing login() method
- **Impact**: Multi-role authentication testing blocked

---

### **Group 2: Timesheet Listing Contract Tests (5 failures)**

#### **Test 5: "should fetch paginated timesheets with correct structure"**
- **Line**: 85
- **Code**: `const result = await apiClient.getTimesheets({ page: 0, size: 10 });`
- **Error**: `apiClient.getTimesheets is not a function`
- **Expected Behavior**: Get paginated timesheet list with page/size parameters
- **Available Methods**: `getUserTimesheets()`, `getPendingTimesheets()` (different interfaces)
- **Root Cause**: No unified `getTimesheets()` method with options parameter
- **Impact**: Pagination testing blocked

#### **Test 6: "should handle empty timesheet results"**
- **Line**: 103
- **Code**: `const result = await apiClient.getTimesheets({ tutorId: 999, page: 0, size: 10 });`
- **Error**: `apiClient.getTimesheets is not a function`
- **Expected Behavior**: Handle empty result sets gracefully
- **Root Cause**: Same as Test 5 - missing getTimesheets() method
- **Impact**: Empty state handling testing blocked

#### **Test 7: "should validate timesheet response structure"**
- **Line**: 116
- **Code**: `const result = await apiClient.getTimesheets({ page: 0, size: 5 });`
- **Error**: `apiClient.getTimesheets is not a function`
- **Expected Behavior**: Validate response schema matches OpenAPI spec
- **Root Cause**: Same as Test 5 - missing getTimesheets() method
- **Impact**: Response structure validation blocked

#### **Test 8: "should support filtering by status"**
- **Line**: 137
- **Code**: `const result = await apiClient.getTimesheetsByStatus('PENDING_LECTURER_APPROVAL');`
- **Error**: `apiClient.getTimesheetsByStatus is not a function`
- **Expected Behavior**: Filter timesheets by status field
- **Available Methods**: No status filtering method exists
- **Root Cause**: Completely missing getTimesheetsByStatus() method
- **Impact**: Status-based filtering testing blocked

#### **Test 9: "should handle pagination boundaries correctly"**
- **Line**: 147, 153, 159
- **Code**: Multiple `apiClient.getTimesheets()` calls with different pages
- **Error**: `apiClient.getTimesheets is not a function`
- **Expected Behavior**: Test first page, middle page, last page scenarios
- **Root Cause**: Same as Test 5 - missing getTimesheets() method
- **Impact**: Pagination edge case testing blocked

---

### **Group 3: Network/Mock Issues (10 failures)**

#### **Test 10: "should create timesheet with valid data"**
- **Line**: 170
- **Code**: `const result = await apiClient.createTimesheet(validRequest);`
- **Error**: `AggregateError` → Network Error
- **Method Status**: ✅ createTimesheet() method EXISTS in ApiClient
- **Root Cause**: Mock system not intercepting HTTP requests properly
- **Expected Behavior**: Create timesheet with valid OpenAPI data
- **Impact**: Timesheet creation testing blocked

#### **Test 11-13: "should validate boundary values for hours/hourlyRate/description"**
- **Lines**: 189, 221, 253
- **Code**: Multiple `apiClient.createTimesheet()` calls with boundary values
- **Error**: `AggregateError` → Network Error  
- **Method Status**: ✅ createTimesheet() method EXISTS
- **Root Cause**: Same as Test 10 - Mock system failure
- **Expected Behavior**: Test OpenAPI constraint validation (0.1-60 hours, 0.01-200 rates)
- **Impact**: Boundary value validation testing blocked

#### **Test 14-15: "should approve/reject timesheet successfully"**
- **Lines**: 285, 301
- **Code**: `await apiClient.processApproval(approvalRequest);`
- **Error**: `AggregateError` → Network Error
- **Method Status**: ✅ processApproval() method EXISTS
- **Root Cause**: Same as Test 10 - Mock system failure
- **Expected Behavior**: Test approval workflow with APPROVE/REJECT actions
- **Impact**: Approval workflow testing blocked

#### **Test 16: "should validate approval request format"**
- **Lines**: 311, 318, 325
- **Code**: Multiple `apiClient.processApproval()` calls with invalid data
- **Error**: Mixed - some pass, some Network Error
- **Method Status**: ✅ processApproval() method EXISTS
- **Root Cause**: Partial mock system failure
- **Expected Behavior**: Validate approval request parameters
- **Impact**: Input validation partially working

#### **Test 17: "should handle 401 Unauthorized errors"**
- **Line**: 338
- **Code**: `await expect(apiClient.getTimesheets({ page: 0, size: 10 })).rejects.toThrow();`
- **Error**: `apiClient.getTimesheets is not a function`
- **Root Cause**: Same as Group 2 - missing getTimesheets() method
- **Expected Behavior**: Test expired token handling
- **Impact**: Authorization error testing blocked

#### **Test 18: "should handle 403 Forbidden errors"**
- **Line**: 347
- **Code**: `await expect(apiClient.getTimesheetsByStatus('PENDING_LECTURER_APPROVAL')).resolves.toBeTruthy();`
- **Error**: `apiClient.getTimesheetsByStatus is not a function`
- **Root Cause**: Same as Test 8 - missing getTimesheetsByStatus() method
- **Expected Behavior**: Test role-based access control
- **Impact**: Permission testing blocked

#### **Test 19: "should provide structured error information"**
- **Line**: 377
- **Code**: `expect(error.response?.status).toBeDefined();`
- **Error**: `expected undefined not to be undefined`
- **Root Cause**: Error object structure doesn't match expected format
- **Expected Behavior**: Validate error response has status/data properties
- **Impact**: Error structure validation blocked

---

### **Group 4: Missing Method Tests (2 failures)**

#### **Test 20: "should return health status"**
- **Line**: 392
- **Code**: `const health = await apiClient.checkHealth();`
- **Error**: `apiClient.checkHealth is not a function`
- **Available Method**: ✅ `getHealthStatus()` EXISTS (different name)
- **Root Cause**: Method name mismatch - test expects checkHealth(), API has getHealthStatus()
- **Expected Behavior**: Return health status with components
- **Impact**: Health monitoring testing blocked

#### **Test 21: "should maintain data consistency across multiple calls"**
- **Line**: 412
- **Code**: `const created = await apiClient.createTimesheet(createRequest);`
- **Error**: `Network Error` 
- **Method Status**: ✅ createTimesheet() method EXISTS
- **Root Cause**: Same as Group 3 - Mock system failure
- **Expected Behavior**: Test data consistency across create/list operations
- **Impact**: Data integrity testing blocked

#### **Test 22: "should handle concurrent operations properly"**
- **Line**: 426-428
- **Code**: Multiple concurrent calls to getTimesheets(), getTimesheetsByStatus(), checkHealth()
- **Error**: `apiClient.getTimesheets is not a function`
- **Root Cause**: Combination of Group 2 and Group 4 issues
- **Expected Behavior**: Test concurrent API calls work correctly  
- **Impact**: Concurrency testing blocked

---

## 🎯 **Failure Pattern Summary**

### **Pattern 1: Method Name Mismatches (10 tests)**
```
❌ Test expects → ✅ ApiClient has
login()         → authenticate()
getTimesheets() → getUserTimesheets() + getPendingTimesheets() (different interfaces)  
getTimesheetsByStatus() → (missing completely)
checkHealth()   → getHealthStatus()
```

### **Pattern 2: Network/Mock Failures (11 tests)**
```
✅ Method exists but → ❌ AggregateError/Network Error
createTimesheet()   → Mock system not intercepting
processApproval()   → Mock system not intercepting
```

### **Pattern 3: Error Structure Issues (1 test)**
```
❌ Expected error.response.status → undefined
Root cause: Error handling format mismatch
```

## 📊 **Failure Root Causes Ranked by Impact**

1. **Mock System Failure** (11 tests) - Highest Impact
   - Axios requests not being intercepted
   - Real network calls causing AggregateError
   
2. **Missing getTimesheets() Method** (5 tests) - High Impact  
   - Core timesheet listing functionality
   - Pagination and filtering blocked
   
3. **Missing login() Alias** (4 tests) - Medium Impact
   - Authentication testing blocked
   - Has workaround with authenticate()
   
4. **Missing getTimesheetsByStatus()** (2 tests) - Medium Impact
   - Status filtering functionality
   - No current equivalent method
   
5. **Wrong checkHealth() Name** (1 test) - Low Impact
   - Simple method name mismatch
   - Easy alias fix

---

**🔍 Analysis Complete**: All 21 failures categorized with specific root causes, expected behaviors, and impact assessment. No fixes applied yet - awaiting your instruction to proceed.