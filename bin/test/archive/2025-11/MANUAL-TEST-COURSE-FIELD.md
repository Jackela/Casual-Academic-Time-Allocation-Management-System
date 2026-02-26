# Manual Test Guide: P0 Bug Fix - Tutor Edit Course Field

## Bug Summary
**Issue**: Course dropdown disabled in Tutor edit mode  
**Root Cause**: TutorDashboard.tsx didn't pass `courseOptions` prop to TimesheetForm  
**Fix**: Added courseOptions prop with editing timesheet's course data  
**Status**: ✅ Fixed + TDD tests passing

## Prerequisites
1. Backend running on port 8080 with `e2e` or `e2e-local` profile
2. Frontend running on port 5174
3. Test user credentials: `tutor@example.com / Tutor123!`

## Test Scenario 1: Verify Course Field is Enabled in Edit Mode

### Steps:
1. **Login as Tutor**
   - Navigate to http://localhost:5174/login
   - Email: `tutor@example.com`
   - Password: `Tutor123!`
   - Click "Login"

2. **Locate MODIFICATION_REQUESTED Timesheet**
   - On Tutor Dashboard, look for timesheets with status "Modification Requested"
   - E2E seed data creates one timesheet with this status for course COMP1001

3. **Click Edit Button**
   - Find the timesheet row with "Modification Requested" status
   - Click the "Edit" button (pencil icon)
   - Modal dialog should open with title "Edit Timesheet"

4. **Verify Course Field**
   - **BEFORE FIX**: Course dropdown would be disabled with "No active courses found" message
   - **AFTER FIX**: Course dropdown should be enabled
   - Course should display: "COMP1001 - Introduction to Programming"
   - Field should show the correct pre-selected value

5. **Verify Field is Read-Only (Expected Behavior)**
   - Course field displays the value but cannot be changed
   - This is by design - tutors cannot change the course when editing

### Expected Results:
✅ Course dropdown is NOT disabled  
✅ Course shows "COMP1001 - Introduction to Programming"  
✅ No "No active courses found" error message  
✅ Modal title shows "Edit Timesheet"  

## Test Scenario 2: Chrome DevTools Inspection

### Steps:
1. Open Chrome DevTools (F12)
2. Follow Test Scenario 1 steps 1-3
3. In DevTools Console, run:
   ```javascript
   // Get the course select element
   const courseSelect = document.querySelector('#course');
   
   // Verify it's not disabled
   console.log('Course disabled:', courseSelect.disabled); // Should be FALSE
   
   // Verify it has options
   console.log('Course options count:', courseSelect.options.length); // Should be 2 (placeholder + 1 course)
   
   // Verify selected value
   console.log('Selected courseId:', courseSelect.value); // Should be the course ID
   ```

### Expected Console Output:
```
Course disabled: false
Course options count: 2
Selected courseId: 1
```

## Test Scenario 3: API Verification

### Backend API Check:
```bash
# 1. Login as tutor
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tutor@example.com","password":"Tutor123!"}'
# Save the token from response

# 2. Get timesheets with MODIFICATION_REQUESTED status
curl -X GET "http://localhost:8080/api/timesheets?status=MODIFICATION_REQUESTED" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 3. Verify response includes courseId, courseName, courseCode fields
```

### Expected API Response:
```json
{
  "content": [
    {
      "id": 123,
      "tutorId": 4,
      "courseId": 1,
      "courseCode": "COMP1001",
      "courseName": "Introduction to Programming",
      "status": "MODIFICATION_REQUESTED",
      "isEditable": true,
      ...
    }
  ]
}
```

## Test Scenario 4: Automated Test Verification

### Run TDD Tests:
```bash
cd frontend
npx vitest run TimesheetForm.course-edit.test.tsx
```

### Expected Output:
```
✓ should FAIL: Course dropdown disabled when courseOptions NOT provided
✓ should PASS: Course dropdown enabled when courseOptions provided
Test Files  1 passed (1)
Tests  2 passed (2)
```

## Regression Testing

### Verify No Side Effects:
1. **Tutor Create Mode** (if accessible via E2E test hooks):
   - Course field behavior unchanged
   - Still requires courseOptions from parent

2. **Lecturer Create Mode**:
   - Course dropdown still works correctly
   - Filtering by tutor assignment still functional

3. **Lecturer Edit Mode**:
   - Course dropdown behavior unchanged
   - Still shows all available courses

## Code Changes Summary

### File: `frontend/src/components/dashboards/TutorDashboard/TutorDashboard.tsx`
**Lines 764-775**:
```typescript
courseOptions={
  editingTimesheet && editingTimesheet.courseId && editingTimesheet.courseName
    ? [
        {
          id: editingTimesheet.courseId,
          label: editingTimesheet.courseCode
            ? `${editingTimesheet.courseCode} - ${editingTimesheet.courseName}`
            : editingTimesheet.courseName,
        },
      ]
    : []
}
```

### New Test File: `frontend/src/components/dashboards/TutorDashboard/components/TimesheetForm.course-edit.test.tsx`
- Test 1: Documents bug (Course disabled without courseOptions)
- Test 2: Verifies fix (Course enabled with courseOptions)

## Sign-off Checklist

- [ ] Manual test completed in Chrome browser
- [ ] Course field enabled and shows correct course
- [ ] No console errors in browser DevTools
- [ ] TDD tests passing (2/2)
- [ ] Backend API returns courseId, courseName, courseCode
- [ ] No regression in other edit/create workflows
- [ ] Code reviewed and approved

## Additional Notes

**Design Decision**: Course field in Tutor Edit mode is intentionally read-only. Tutors can view but not change the course assignment, as course allocation is managed by lecturers and admins.

**E2E Seed Data**: The `modificationRequestedTimesheet` in `E2EDataInitializer.java` (lines 310-320) provides the test data for this scenario.

**Related Fix**: This fix complements the earlier E2E seed data fix where `taskType` and `qualification` were added to all timesheets to prevent "OTHER" taskType errors.
