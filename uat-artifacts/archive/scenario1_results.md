# Scenario 1: Lecturer Creates Timesheet - FAILED

## Test Steps Executed:
✅ 1.1: Login as lecturer (lecturer@example.com) - SUCCESS
✅ 1.2: Navigate to Create Timesheet page - SUCCESS  
✅ 1.3: Fill form (tutor=John Doe, course=COMP1001, task=TUTORIAL, hours=1.0) - SUCCESS
✅ 1.4-1.7: Quote API validation - SUCCESS
  - RATE CODE: TU2
  - QUALIFICATION: STANDARD
  - ASSOCIATED HOURS: 2.00
  - PAYABLE HOURS: 3.00
  - HOURLY RATE: $60.85
  - TOTAL AMOUNT: $182.54
  - FORMULA: 1h delivery + 2h associated (EA Schedule 1 – Tutoring)
❌ 1.8: Submit timesheet creation - FAILED

## Error Details:
- UI Error: "An error occurred: Failed to create timesheet"
- Modal Error: "Failed to create timesheet"
- Console Errors:
  - "Failed to load resource: the server responded with a status of 400 (Bad Request)"
  - "[2025-10-27T11:05:50.859Z] API POST /api/timesheets failed"
  - "[2025-10-27T11:05:50.870Z] Lecturer timesheet creation failed"

## Status: FAILED
## Evidence: 
- scenario1_quote_displayed.png
- scenario1_create_failed.png
