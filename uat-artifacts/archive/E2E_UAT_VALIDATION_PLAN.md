# E2E UAT Validation Plan - CATAMS Three-Tier Confirmation Workflow

**Created**: 2025-10-27  
**Tool**: Chrome DevTools MCP  
**Environment**:
- Frontend: http://localhost:5174
- Backend API: http://localhost:8084/api
- **Test Users** (from `.env.e2e`):
  - Admin: `admin@example.com` / `Admin123!`
  - Lecturer: `lecturer@example.com` / `Lecturer123!`
  - Tutor: `tutor@example.com` / `Tutor123!`
- Test Course: COMP1001

---

## Executive Summary

This document defines the end-to-end User Acceptance Testing (UAT) validation plan for the Casual Academic Time Allocation Management System (CATAMS). The plan focuses on **workflow validation** using Chrome DevTools Model Context Protocol (MCP) to verify:

1. **Three-tier confirmation workflow**: PENDING_TUTOR_CONFIRMATION → TUTOR_CONFIRMED → LECTURER_CONFIRMED → FINAL_CONFIRMED
2. **Schedule 1 SSOT compliance**: Quote endpoint and backend calculation enforcement
3. **Role-based access control**: Resource-level authorization and cross-course protection
4. **State machine integrity**: Valid/invalid transitions with proper HTTP status codes
5. **Audit trail**: Actor, timestamp, and comment persistence

---

## Workflow State Machine

```
DRAFT (Lecturer creates)
  ↓ [SUBMIT_FOR_APPROVAL]
PENDING_TUTOR_CONFIRMATION
  ↓ [TUTOR_CONFIRM]
TUTOR_CONFIRMED
  ↓ [LECTURER_CONFIRM]
LECTURER_CONFIRMED
  ↓ [HR_CONFIRM]
  FINAL_CONFIRMED ✓ (Terminal state)

At any confirmation stage:
  → REJECTED [REJECT action + reason]
  → MODIFICATION_REQUESTED [REQUEST_MODIFICATION action]
```

---

## Testing Checklist

### Pre-Execution Setup
- [ ] Backend running on http://localhost:8084 with JWT_SECRET configured
- [ ] Frontend running on http://localhost:5174 with VITE_API_BASE_URL=http://localhost:8084
- [ ] Database seeded with test users: tutor1, lecturer1 (assigned to COMP2022), lecturer2 (assigned to COMP3001), admin
- [ ] Artifacts directory created: `./uat-artifacts/{ISO_DATETIME}/e2e/`
- [ ] Chrome DevTools MCP server available

### Environment Initialization (Deterministic Data)
- [ ] Reset database state (choose one)
  - Docker: `docker compose down --volumes && docker compose up -d`
  - Scripted API reset: `npm run e2e:reset` (calls reset + seed endpoints with token `TEST_DATA_RESET_TOKEN`)
- [ ] Confirm reset output shows `Reset OK` and `Seed OK`
- [ ] (Optional) Override lecturer seed via `npm run e2e:reset -- --lecturer-id <id>` when running alternative RBAC setups
- [ ] Note: `TEST_DATA_RESET_TOKEN` maps to `app.testing.reset-token` in `application-e2e(-local).yml`; for Docker the env var is already wired.

### New Auto-Submit Behavior
- [ ] Auto-submit enabled on lecturer creation: DRAFT → PENDING_TUTOR_CONFIRMATION via POST /api/approvals (SUBMIT_FOR_APPROVAL)
- [ ] On transient failure, UI shows a drafts-pending banner and keeps the timesheet editable

### Scenario 1: Lecturer Creates Timesheet with Quote Validation
- [ ] **1.1**: Login as lecturer (lecturer@example.com / Lecturer123!) successfully
- [ ] **1.2**: Navigate to Create Timesheet page
- [ ] **1.3**: Fill form (tutor=tutor1, course=COMP1001, task=TUTORIAL, qual=STANDARD, hours=1.0, date=2025-11-01)
- [ ] **1.4**: Verify Quote API call: POST /api/timesheets/quote → 200
- [ ] **1.5**: Assert request body contains ONLY instructional fields (no hourlyRate, amount, associatedHours)
- [ ] **1.6**: Assert response contains calculated fields (rateCode=TU2, hourlyRate>0, associatedHours=2.0, payableHours=3.0, amount>0, formula, clauseReference)
- [ ] **1.7**: Verify UI displays read-only calculation results
- [ ] **1.8**: Submit timesheet creation
- [ ] **1.9**: Verify Create API: POST /api/timesheets → 201
- [ ] **1.10**: Assert request excludes financial fields (SSOT principle)
- [ ] **1.11**: Assert create response.status === "DRAFT" (by design)
- [ ] **1.12**: Verify auto-submit request issued: POST /api/approvals with action "SUBMIT_FOR_APPROVAL" → 200
- [ ] **1.13**: Assert post-submit state transition to "PENDING_TUTOR_CONFIRMATION" (badge/status)
- [ ] **1.14**: Assert response includes server-calculated fields
- [ ] **1.15**: Screenshot: Quote displayed state
- [ ] **1.16**: Screenshot: Timesheet created and submitted

### Scenario 2: Tutor Confirms Timesheet
- [ ] **2.1**: Logout lecturer1
- [ ] **2.2**: Login as tutor (tutor@example.com / Tutor123!)
- [ ] **2.3**: Navigate to Tutor Dashboard
- [ ] **2.4**: Verify PENDING_TUTOR_CONFIRMATION timesheet visible
- [ ] **2.5**: Click confirm button on timesheet
- [ ] **2.6**: Verify Confirm API: POST /api/approvals → 200
- [ ] **2.7**: Assert request.action === "TUTOR_CONFIRM"
- [ ] **2.8**: Assert response.newStatus === "TUTOR_CONFIRMED"
- [ ] **2.9**: Verify status badge updates to "Tutor Confirmed"
- [ ] **2.10**: Screenshot: Tutor confirmed state

### Scenario 3: Lecturer Confirms Timesheet
- [ ] **3.1**: Logout tutor1
- [ ] **3.2**: Login as lecturer (lecturer@example.com)
- [ ] **3.3**: Navigate to Approvals/Confirmations page
- [ ] **3.4**: Verify TUTOR_CONFIRMED timesheet visible
- [ ] **3.5**: Click lecturer confirm button
- [ ] **3.6**: Verify Confirm API: POST /api/approvals → 200
- [ ] **3.7**: Assert request.action === "LECTURER_CONFIRM"
- [ ] **3.8**: Assert response.newStatus === "LECTURER_CONFIRMED"
- [ ] **3.9**: Verify status badge updates
- [ ] **3.10**: Screenshot: Lecturer confirmed state

### Scenario 4: Admin Final Confirmation
- [ ] **4.1**: Logout lecturer1
- [ ] **4.2**: Login as admin (admin@example.com / Admin123!)
- [ ] **4.3**: Navigate to Pending Final Approval page
- [ ] **4.4**: Verify LECTURER_CONFIRMED timesheet visible
- [ ] **4.5**: Click admin confirm button
- [ ] **4.6**: Verify Final Confirm API: POST /api/approvals → 200
- [ ] **4.7**: Assert request.action === "HR_CONFIRM"
- [ ] **4.8**: Assert response.newStatus === "FINAL_CONFIRMED"
- [ ] **4.9**: Verify terminal state (no further action buttons)
- [ ] **4.10**: Screenshot: Final confirmed state

### Scenario 5: Rejection Workflow
- [ ] **5.1**: Create new timesheet (repeat Scenario 1)
- [ ] **5.2**: Login as tutor1
- [ ] **5.3**: Click reject button on PENDING_TUTOR_CONFIRMATION timesheet
- [ ] **5.4**: Fill rejection reason: "Hours incorrect"
- [ ] **5.5**: Confirm rejection
- [ ] **5.6**: Verify Reject API: POST /api/approvals → 200
- [ ] **5.7**: Assert request.action === "REJECT"
- [ ] **5.8**: Assert request.comment === "Hours incorrect"
- [ ] **5.9**: Assert response.newStatus === "REJECTED"
- [ ] **5.10**: Verify terminal state (no confirm buttons)
- [ ] **5.11**: Verify rejection reason displayed
- [ ] **5.12**: Screenshot: Rejected state

### Scenario 6: Modification Request Workflow
- [ ] **6.1**: Create new timesheet and progress to TUTOR_CONFIRMED
- [ ] **6.2**: Login as lecturer1
- [ ] **6.3**: Click "Request Modification" button
- [ ] **6.4**: Fill modification reason: "Please add course notes"
- [ ] **6.5**: Submit modification request
- [ ] **6.6**: Verify API: POST /api/approvals → 200
- [ ] **6.7**: Assert request.action === "REQUEST_MODIFICATION"
- [ ] **6.8**: Assert response.newStatus === "MODIFICATION_REQUESTED"
- [ ] **6.9**: Verify timesheet is editable
- [ ] **6.10**: Edit timesheet and add notes
- [ ] **6.11**: Resubmit timesheet
- [ ] **6.12**: Verify status returns to PENDING_TUTOR_CONFIRMATION
- [ ] **6.13**: Screenshot: Modification requested state

### Scenario 7: RBAC and Authorization Validation
- [ ] **7.1**: Login as tutor (tutor@example.com)
- [ ] **7.2**: Attempt to create timesheet (should be blocked)
- [ ] **7.3**: Verify error: POST /api/timesheets → 403 Forbidden
- [ ] **7.4**: Verify console error message present
- [ ] **7.5**: Create timesheet as lecturer1 for COMP2022
- [ ] **7.6**: Login as another lecturer not assigned to the course (lecturer of a different course)
- [ ] **7.7**: Attempt to confirm COMP2022 timesheet
- [ ] **7.8**: Verify error: POST /api/approvals → 403
- [ ] **7.9**: Verify error message: "Not authorized for this course"
- [ ] **7.10**: Login as admin
- [ ] **7.11**: Verify admin can confirm any course timesheet (global override)
- [ ] **7.12**: Screenshot: 403 error states

Additional negative RBAC checks:
- [ ] **7.13**: Tutor attempts to perform REJECT or REQUEST_MODIFICATION → 403 Forbidden
- [ ] **7.14**: Lecturer attempts HR_CONFIRM (final approval) → 403 Forbidden
- [ ] **7.15**: Tutor attempts to confirm a timesheet not assigned to them → 403 Forbidden

### Scenario 8: Critical UX Testing (Picky User Perspective)
- [ ] **8.1**: Boundary testing - Delivery hours (0, 0.24, 0.25, 60, 60.01, 100, -5, "abc", 1.123456789)
- [ ] **8.2**: Date validation - Past dates, future dates, non-Monday enforcement
- [ ] **8.3**: Description field - Empty, whitespace, XSS protection, SQL injection, length limits, unicode
- [ ] **8.4**: State transition violations - Skip tutor, reverse FINAL, self-approval
- [ ] **8.5**: Error message quality - Duplicate, auth, network, server errors
- [ ] **8.6**: Loading states - Quote calculation, submission, dashboard
- [ ] **8.7**: Mobile responsiveness - 375px layout, touch targets, table scroll
- [ ] **8.8**: Performance - Quote API speed, dashboard load time, large datasets
- [ ] **8.9**: Keyboard navigation - Tab order, focus indicators, Esc/Enter keys
- [ ] **8.10**: ARIA compliance - Form labels, dynamic announcements, semantic HTML
- [ ] **8.11**: Session expiration - Token timeout, draft preservation
- [ ] **8.12**: Network resilience - Offline mode, retry mechanism, error recovery
- [ ] **8.13**: Screenshot: Critical findings and UX issues

### Artifact Collection
- [ ] Export all screenshots to `./uat-artifacts/{ISO}/screenshots/`
- [ ] Export console errors to `./uat-artifacts/{ISO}/console/console-errors.json`
- [ ] Export network requests to `./uat-artifacts/{ISO}/network/all-requests.json`
- [ ] Export failed requests to `./uat-artifacts/{ISO}/network/failed-request-{id}.json`
- [ ] Generate TAP report to `./uat-artifacts/{ISO}/uat-report.tap`

---

## Detailed Test Scenarios

### Scenario 1: Lecturer Creates Timesheet with Quote Validation

**Objective**: Validate Schedule 1 calculator SSOT compliance and Quote endpoint functionality

**MCP Commands**:

```javascript
// 1.1 Open browser and login
mcp__chrome-devtools__new_page({
  url: "http://localhost:5174",
  timeout: 30000
})

mcp__chrome-devtools__wait_for({
  text: "Login",
  timeout: 10000
})

mcp__chrome-devtools__take_snapshot()
// Expected: login form visible with username/password inputs

// Fill login credentials
mcp__chrome-devtools__fill_form({
  elements: [
    {uid: "input-username", value: "lecturer1"},
    {uid: "input-password", value: "password123"}
  ]
})

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/1-1-login-form.png"
})

mcp__chrome-devtools__click({uid: "button-login"})

mcp__chrome-devtools__wait_for({
  text: "Dashboard",
  timeout: 10000
})

// 1.2 Navigate to Create Timesheet
mcp__chrome-devtools__take_snapshot()
// Expected: Dashboard with navigation menu

mcp__chrome-devtools__click({uid: "nav-timesheets"})
mcp__chrome-devtools__wait_for({
  text: "My Timesheets",
  timeout: 5000
})

mcp__chrome-devtools__click({uid: "button-create-timesheet"})
mcp__chrome-devtools__wait_for({
  text: "Create Timesheet",
  timeout: 5000
})

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/1-2-create-form.png"
})

// 1.3 Fill form and trigger Quote
// Record network state before quote
const beforeQuote = mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

mcp__chrome-devtools__fill_form({
  elements: [
    {uid: "select-tutor", value: "tutor1"},
    {uid: "select-course", value: "COMP2022"},
    {uid: "select-task-type", value: "TUTORIAL"},
    {uid: "select-qualification", value: "STANDARD"},
    {uid: "input-delivery-hours", value: "1.0"},
    {uid: "input-session-date", value: "2025-11-01"}
  ]
})

// Checkbox for repeat (uncheck if checked by default)
mcp__chrome-devtools__click({uid: "checkbox-repeat"}) // Toggle if needed

// 1.4 Wait for Quote API call
mcp__chrome-devtools__wait_for({
  text: "Calculation",
  timeout: 5000
})

const afterQuote = mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 1.5 Get Quote request details
// Find POST /api/timesheets/quote request
mcp__chrome-devtools__get_network_request({
  reqid: <QUOTE_REQUEST_ID> // Extract from afterQuote diff
})

// Assert request body structure:
// MUST INCLUDE: tutorId, courseId, taskType, qualification, repeat, deliveryHours, sessionDate
// MUST NOT INCLUDE: hourlyRate, amount, associatedHours, payableHours, rateCode

// 1.6 Assert response contains calculated fields
// Response body should include:
// {
//   "taskType": "TUTORIAL",
//   "rateCode": "TU2",  // STANDARD qualification receives TU2 rate
//   "rateVersion": "EA-2023-2026-Schedule1:v1.0.0",
//   "qualification": "STANDARD",
//   "repeat": false,
//   "deliveryHours": 1.0,
//   "associatedHours": 2.0,  // Backend calculated
//   "payableHours": 3.0,     // 1.0 + 2.0
//   "hourlyRate": <DECIMAL>, // From policy table
//   "amount": <DECIMAL>,     // hourlyRate * payableHours
//   "formula": "1h delivery + 2h associated",
//   "clauseReference": "Schedule 1 Item 1",
//   "sessionDate": "2025-11-01"
// }

// 1.7 Verify UI displays read-only calculation results
mcp__chrome-devtools__take_snapshot()
// Expected DOM elements:
// - Rate Code: TU2 (read-only text)
// - Hourly Rate: $XX.XX (read-only)
// - Associated Hours: 2.0 (read-only)
// - Payable Hours: 3.0 (read-only)
// - Total Amount: $XXX.XX (read-only)
// - Formula: "1h delivery + 2h associated" (transparency)
// - Clause Reference: "Schedule 1 Item 1" (audit trail)

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/1-7-quote-displayed.png"
})

// 1.8 Submit timesheet creation
const beforeCreate = mcp__chrome-devtools__list_network_requests()

mcp__chrome-devtools__click({uid: "button-submit-timesheet"})

mcp__chrome-devtools__wait_for({
  text: "created",
  timeout: 5000
})

const afterCreate = mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 1.9 Verify Create API
// Find POST /api/timesheets request
mcp__chrome-devtools__get_network_request({
  reqid: <CREATE_REQUEST_ID>
})

// 1.10 Assert request excludes financial fields
// Request body MUST NOT include:
// - hourlyRate
// - amount
// - associatedHours
// - payableHours
// - rateCode
// - rateVersion
// - formula
// - clauseReference

// 1.11 Verify create response shows initial DRAFT (by design)
// 1.12 Verify auto-submit is triggered
// Find POST /api/approvals with body: { timesheetId: <ID>, action: "SUBMIT_FOR_APPROVAL" }
// Expect: 200 OK and newStatus: "PENDING_TUTOR_CONFIRMATION"

// 1.13 Validate UI shows Pending Tutor Review after auto-submit
mcp__chrome-devtools__take_snapshot()
// Expected: status badge "Pending Tutor Review" for the created timesheet

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/1-16-created-and-submitted.png"
})

---

## Pending Scenarios (Not Yet Executed)

- [ ] Scenario A: Auto-submit failure path shows drafts-pending notification
  - Preconditions: Simulate `/api/approvals` 5xx on SUBMIT_FOR_APPROVAL
  - Expected: Create returns 201 (DRAFT), auto-submit fails, banner notification appears, item remains editable
  - Evidence: Network logs for failing POST /api/approvals, screenshot of banner, status badge remains DRAFT

- [ ] Scenario B: Tutor sees newly auto-submitted timesheet in "Pending Tutor Review"
  - Preconditions: Successful auto-submit after lecturer creation
  - Expected: Tutor dashboard includes the item under Pending list; no edit action; Confirm button visible
  - Evidence: Screenshot of tutor table row with Pending Tutor Review badge

- [ ] Scenario C: Admin confirmation remains HR_CONFIRM (naming)
  - Expected: Final approval action uses `HR_CONFIRM`; plan updated accordingly
  - Evidence: Network request body/response action names

- [ ] Scenario D: Tutor submits a lecturer-created draft timesheet
  - Preconditions: Create timesheet via Lecturer flow and intentionally leave as DRAFT (disable auto-submit for this test via network interception or manual cancel)
  - Steps: Login as tutor → Drafts tab → click "Submit" → Verify POST `/api/approvals` `{ action: "SUBMIT_FOR_APPROVAL" }`
  - Expected: Status transitions to `PENDING_TUTOR_CONFIRMATION`; tutor cannot edit; confirm appears
  - Evidence: Network log, badge change, action buttons

- [ ] Scenario E: Approval History and Audit Trail
  - Steps: After completing full workflow, call `GET /api/approvals/history/{timesheetId}`
  - Expected: Chronological entries with actor id/name, action, previous/new status, timestamp; comments present for rejection/modification
  - Evidence: Response body and (if available) history UI screenshot

- [ ] Scenario F: Invalid Transitions and Conflict Handling
  - HR confirm before lecturer confirm:
    - Steps: Attempt `POST /api/approvals` with `{ action: "HR_CONFIRM" }` while status is `TUTOR_CONFIRMED`
    - Expected: `409 Conflict` with message "Admin approval requires prior Lecturer approval"
  - Invalid action for state:
    - Steps: Attempt `LECTURER_CONFIRM` when status is `FINAL_CONFIRMED`
    - Expected: `400 Bad Request` with message reflecting invalid transition

- [ ] Scenario G: Backend Validation and Defensive Checks
  - Non-Monday `weekStartDate` on create → `400 Bad Request` with business rule message
  - Duplicate (tutor+course+week) create → `400 Bad Request` with uniqueness message
  - Evidence: API responses and UI error banners

- [ ] Scenario H: RBAC Expanded Negative Tests
  - Tutor attempts `REJECT` or `REQUEST_MODIFICATION` → `403 Forbidden`
  - Lecturer attempts `HR_CONFIRM` → `403 Forbidden`
  - Tutor attempts to confirm a timesheet not assigned to them → `403 Forbidden`
  - Evidence: API responses match, UI actions absent/disabled

- [ ] Scenario I: Rounding and Precision (Finance)
  - Steps: Request Quote for hours/rate combinations that trigger rounding; verify amount is 2 decimals and equals `hourlyRate × payableHours` with HALF_UP rounding
  - Evidence: Quote response values; screenshot of pay summary read-only fields

- [ ] Scenario J: Notification UX for Auto-Submit
  - Success path: Toast displays submission success message (TIMESHEET_SUBMIT_SUCCESS)
  - Failure path: Banner displays drafts pending (DRAFTS_PENDING)
  - Evidence: UI captures; optional console logs

- [ ] Scenario K: Security Headers (NFR)
  - Steps: Inspect response headers for a static asset and API call
  - Expected: `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `X-XSS-Protection` (or modern CSP if configured)
  - Evidence: Network headers capture

// Request body SHOULD ONLY include instructional fields:
// {
//   "tutorId": 2,
//   "courseId": 101,
//   "taskType": "TUTORIAL",
//   "qualification": "STANDARD",
//   "repeat": false,
//   "deliveryHours": 1.0,
//   "sessionDate": "2025-11-01",
//   "description": "..."  // Optional
// }

// 1.11 Assert create response status
// Response should be 201 Created
// Response body (initially DRAFT by design):
// {
//   "id": <NEW_ID>,
//   "status": "DRAFT",
//   "taskType": "TUTORIAL",
//   "qualification": "STANDARD",
//   "repeat": false,
//   "deliveryHours": 1.0,
//   "associatedHours": 2.0,      // Server-calculated
//   "payableHours": 3.0,         // Server-calculated
//   "hourlyRate": <DECIMAL>,     // Server-calculated
//   "amount": <DECIMAL>,         // Server-calculated
//   "rateCode": "TU2",           // Server-determined
//   "rateVersion": "EA-2023-2026-Schedule1:v1.0.0",
//   "formula": "1h delivery + 2h associated",
//   "clauseReference": "Schedule 1 Item 1",
//   "sessionDate": "2025-11-01",
//   "createdAt": "...",
//   "updatedAt": "..."
// }
// Note: An immediate auto-submit POST /api/approvals (SUBMIT_FOR_APPROVAL) follows and transitions the status to PENDING_TUTOR_CONFIRMATION.

// 1.12 Verify post auto-submit status appears in list
mcp__chrome-devtools__take_snapshot()
// Expected: New row with status badge "Pending Tutor Confirmation"

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/1-12-timesheet-created.png"
})

// 1.13 Verify console has no errors
mcp__chrome-devtools__list_console_messages({
  types: ["error"]
})
// Expected: Empty array or no critical errors
```

**Validation Assertions**:
- ✓ Quote endpoint called when form filled: `POST /api/timesheets/quote → 200`
- ✓ Quote request contains ONLY instructional fields (no financial data)
- ✓ Quote response includes all calculated fields (rateCode, hourlyRate, associatedHours, payableHours, amount, formula, clauseReference)
- ✓ UI displays read-only calculation results correctly
- ✓ Create request excludes financial fields (SSOT principle enforced)
- ✓ Create response has status 201 and includes server-calculated fields
- ✓ Initial workflow state is `PENDING_TUTOR_CONFIRMATION`

---

### Scenario 2: Tutor Confirms Timesheet

**Objective**: Validate first-tier confirmation workflow (Tutor role)

**MCP Commands**:

```javascript
// 2.1 Logout lecturer
mcp__chrome-devtools__click({uid: "button-logout"})
mcp__chrome-devtools__wait_for({
  text: "Login",
  timeout: 5000
})

// 2.2 Login as tutor1
mcp__chrome-devtools__fill_form({
  elements: [
    {uid: "input-username", value: "tutor1"},
    {uid: "input-password", value: "password123"}
  ]
})

mcp__chrome-devtools__click({uid: "button-login"})

mcp__chrome-devtools__wait_for({
  text: "Tutor Dashboard",
  timeout: 10000
})

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/2-2-tutor-dashboard.png"
})

// 2.3 Verify pending confirmation list
mcp__chrome-devtools__take_snapshot()
// Expected: Timesheet with status "Pending Confirmation" visible
// Should see timesheet created in Scenario 1

// 2.4 Record network state
const beforeConfirm = mcp__chrome-devtools__list_network_requests()

// 2.5 Click confirm button
mcp__chrome-devtools__click({uid: "button-tutor-confirm-{TIMESHEET_ID}"})

mcp__chrome-devtools__wait_for({
  text: "confirmed",
  timeout: 5000
})

const afterConfirm = mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})

// 2.6 Verify Confirm API
mcp__chrome-devtools__get_network_request({
  reqid: <CONFIRM_REQUEST_ID>
})

// Assert request:
// POST /api/approvals → 200
// Request body:
// {
//   "timesheetId": <ID>,
//   "action": "TUTOR_CONFIRM",
//   "comment": "..." // Optional
// }

// Assert response:
// {
//   "newStatus": "TUTOR_CONFIRMED",
//   "approverId": <TUTOR_ID>,
//   "timestamp": "...",
//   "nextSteps": "Awaiting lecturer confirmation"
// }

// 2.7 Verify status update in UI
mcp__chrome-devtools__take_snapshot()
// Expected: Status badge shows "Tutor Confirmed" or "Awaiting Lecturer"

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/2-7-tutor-confirmed.png"
})

// 2.8 Verify console clean
mcp__chrome-devtools__list_console_messages({types: ["error"]})
```

**Validation Assertions**:
- ✓ Tutor can view PENDING_TUTOR_CONFIRMATION timesheets
- ✓ Confirm action sends `POST /api/approvals` with action="TUTOR_CONFIRM"
- ✓ Response indicates successful transition to TUTOR_CONFIRMED
- ✓ UI reflects new status
- ✓ No console errors

---

### Scenario 3: Lecturer Confirms Timesheet

**Objective**: Validate second-tier confirmation workflow (Lecturer role)

**MCP Commands**:

```javascript
// 3.1 Logout tutor
mcp__chrome-devtools__click({uid: "button-logout"})

// 3.2 Login as lecturer1
mcp__chrome-devtools__fill_form({
  elements: [
    {uid: "input-username", value: "lecturer1"},
    {uid: "input-password", value: "password123"}
  ]
})

mcp__chrome-devtools__click({uid: "button-login"})
mcp__chrome-devtools__wait_for({text: "Dashboard", timeout: 10000})

// 3.3 Navigate to approvals/confirmations
mcp__chrome-devtools__click({uid: "nav-approvals"})
mcp__chrome-devtools__wait_for({
  text: "Tutor Confirmed",
  timeout: 5000
})

mcp__chrome-devtools__take_snapshot()
// Expected: List shows TUTOR_CONFIRMED timesheets

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/3-3-lecturer-approvals.png"
})

// 3.4 Confirm timesheet
const beforeLecturerConfirm = mcp__chrome-devtools__list_network_requests()

mcp__chrome-devtools__click({uid: "button-lecturer-confirm-{TIMESHEET_ID}"})

mcp__chrome-devtools__wait_for({
  text: "confirmed",
  timeout: 5000
})

// 3.5 Verify API
mcp__chrome-devtools__get_network_request({reqid: <LECTURER_CONFIRM_REQUEST_ID>})

// Assert:
// POST /api/approvals → 200
// Request: {action: "LECTURER_CONFIRM"}
// Response: {newStatus: "LECTURER_CONFIRMED"}

// 3.6 Verify UI update
mcp__chrome-devtools__take_snapshot()
mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/3-6-lecturer-confirmed.png"
})
```

**Validation Assertions**:
- ✓ Lecturer can view TUTOR_CONFIRMED timesheets for their courses
- ✓ Confirm action sends LECTURER_CONFIRM
- ✓ Status transitions to LECTURER_CONFIRMED
- ✓ UI updates correctly

---

### Scenario 4: Admin Final Confirmation

**Objective**: Validate third-tier confirmation workflow (Admin/HR role)

**MCP Commands**:

```javascript
// 4.1 Logout lecturer
mcp__chrome-devtools__click({uid: "button-logout"})

// 4.2 Login as admin
mcp__chrome-devtools__fill_form({
  elements: [
    {uid: "input-username", value: "admin"},
    {uid: "input-password", value: "admin123"}
  ]
})

mcp__chrome-devtools__click({uid: "button-login"})
mcp__chrome-devtools__wait_for({text: "Admin Dashboard", timeout: 10000})

// 4.3 Navigate to pending final approval
mcp__chrome-devtools__click({uid: "nav-pending-final-approval"})
mcp__chrome-devtools__wait_for({
  text: "Lecturer Confirmed",
  timeout: 5000
})

mcp__chrome-devtools__take_snapshot()
// Expected: LECTURER_CONFIRMED timesheets visible

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/4-3-admin-final-queue.png"
})

// 4.4 Final confirmation
mcp__chrome-devtools__click({uid: "button-admin-confirm-{TIMESHEET_ID}"})

mcp__chrome-devtools__wait_for({
  text: "Finally Confirmed",
  timeout: 5000
})

// 4.5 Verify API
mcp__chrome-devtools__get_network_request({reqid: <HR_CONFIRM_REQUEST_ID>})

// Assert:
// POST /api/approvals → 200
// Request: {action: "HR_CONFIRM"}
// Response: {newStatus: "FINAL_CONFIRMED"}

// 4.6 Verify terminal state
mcp__chrome-devtools__take_snapshot()
// Expected: Status = "Final Confirmed"
// No further action buttons (confirm/reject/modify)

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/4-6-final-confirmed.png"
})
```

**Validation Assertions**:
- ✓ Admin can view LECTURER_CONFIRMED queue
- ✓ Final confirmation sends HR_CONFIRM action
- ✓ Status transitions to FINAL_CONFIRMED
- ✓ Terminal state has no further actions available

---

### Scenario 5: Rejection Workflow

**Objective**: Validate rejection at any confirmation stage

**MCP Commands**:

```javascript
// 5.1 Create new timesheet (repeat Scenario 1 steps)
// ... (omitted for brevity)

// 5.2 Login as tutor1 and navigate to pending confirmations
// ... (omitted)

// 5.3 Reject timesheet
mcp__chrome-devtools__click({uid: "button-reject-{TIMESHEET_ID}"})

mcp__chrome-devtools__wait_for({
  text: "Reject Timesheet",
  timeout: 3000
})

// 5.4 Fill rejection reason
mcp__chrome-devtools__fill({
  uid: "textarea-reject-reason",
  value: "Hours are incorrect - should be 2.0 delivery hours"
})

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/5-4-reject-dialog.png"
})

mcp__chrome-devtools__click({uid: "button-confirm-reject"})

mcp__chrome-devtools__wait_for({
  text: "rejected",
  timeout: 5000
})

// 5.5 Verify Reject API
mcp__chrome-devtools__get_network_request({reqid: <REJECT_REQUEST_ID>})

// Assert:
// POST /api/approvals → 200
// Request:
// {
//   "timesheetId": <ID>,
//   "action": "REJECT",
//   "comment": "Hours are incorrect - should be 2.0 delivery hours"
// }
// Response:
// {
//   "newStatus": "REJECTED",
//   "approverId": <TUTOR_ID>,
//   "rejectionReason": "Hours are incorrect...",
//   "timestamp": "..."
// }

// 5.6 Verify terminal state
mcp__chrome-devtools__take_snapshot()
// Expected:
// - Status badge = "Rejected"
// - Rejection reason displayed
// - No confirm/approve buttons

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/5-6-rejected-state.png"
})
```

**Validation Assertions**:
- ✓ Tutor can reject PENDING_TUTOR_CONFIRMATION timesheet
- ✓ Rejection reason is required
- ✓ REJECT action transitions to REJECTED status
- ✓ REJECTED is terminal state (no further actions)
- ✓ Rejection reason persisted and displayed

---

### Scenario 6: Modification Request Workflow

**Objective**: Validate modification request and resubmission flow

**MCP Commands**:

```javascript
// 6.1 Create timesheet and progress to TUTOR_CONFIRMED
// ... (combine Scenario 1 + 2)

// 6.2 Login as lecturer1
// ... (login steps)

// 6.3 Request modification
mcp__chrome-devtools__click({uid: "button-request-modification-{TIMESHEET_ID}"})

mcp__chrome-devtools__wait_for({
  text: "Request Modification",
  timeout: 3000
})

mcp__chrome-devtools__fill({
  uid: "textarea-modification-reason",
  value: "Please add detailed course notes and session description"
})

mcp__chrome-devtools__click({uid: "button-confirm-modification"})

mcp__chrome-devtools__wait_for({
  text: "Modification requested",
  timeout: 5000
})

// 6.4 Verify API
mcp__chrome-devtools__get_network_request({reqid: <MODIFICATION_REQUEST_ID>})

// Assert:
// POST /api/approvals → 200
// Request: {action: "REQUEST_MODIFICATION", comment: "Please add..."}
// Response: {newStatus: "MODIFICATION_REQUESTED"}

// 6.5 Verify timesheet is editable
mcp__chrome-devtools__click({uid: "edit-timesheet-{TIMESHEET_ID}"})

mcp__chrome-devtools__wait_for({
  text: "Edit Timesheet",
  timeout: 5000
})

// 6.6 Make modifications
mcp__chrome-devtools__fill({
  uid: "textarea-description",
  value: "Tutorial session for COMP2022 Week 5 - Algorithms and Data Structures"
})

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/6-6-editing-modification.png"
})

// 6.7 Resubmit
mcp__chrome-devtools__click({uid: "button-resubmit-timesheet"})

mcp__chrome-devtools__wait_for({
  text: "resubmitted",
  timeout: 5000
})

// 6.8 Verify status returns to PENDING_TUTOR_CONFIRMATION
mcp__chrome-devtools__take_snapshot()
// Expected: Status = "Pending Tutor Confirmation"
// Workflow restarts from beginning

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/6-8-resubmitted.png"
})
```

**Validation Assertions**:
- ✓ REQUEST_MODIFICATION action available at confirmation stages
- ✓ Modification reason required and persisted
- ✓ Status transitions to MODIFICATION_REQUESTED
- ✓ Timesheet becomes editable
- ✓ Resubmission returns status to PENDING_TUTOR_CONFIRMATION
- ✓ Workflow restarts from first tier

---

### Scenario 7: RBAC and Authorization Validation

**Objective**: Validate role-based access control and resource-level permissions

**MCP Commands**:

```javascript
// 7.1 Tutor attempts to create timesheet (should fail with 403)
// Login as tutor1
// ... (login steps)

mcp__chrome-devtools__click({uid: "nav-timesheets"})

// Attempt to access create form
mcp__chrome-devtools__click({uid: "button-create-timesheet"})

// Expected: Either button is disabled/hidden OR API returns 403

// If form accessible, attempt to submit
mcp__chrome-devtools__fill_form({
  elements: [
    {uid: "select-course", value: "COMP2022"},
    {uid: "select-task-type", value: "TUTORIAL"},
    {uid: "input-delivery-hours", value: "1.0"}
  ]
})

const beforeUnauthorizedCreate = mcp__chrome-devtools__list_network_requests()

mcp__chrome-devtools__click({uid: "button-submit-timesheet"})

// Wait for error
mcp__chrome-devtools__wait_for({text: "Access Denied", timeout: 5000})

// 7.2 Verify 403 response
mcp__chrome-devtools__get_network_request({reqid: <UNAUTHORIZED_CREATE_REQUEST_ID>})

// Assert:
// POST /api/timesheets → 403 Forbidden
// Response body: {"error": "Insufficient permissions", "message": "..."}

// 7.3 Verify console error
mcp__chrome-devtools__list_console_messages({types: ["error"]})
// Expected: Error message about insufficient permissions

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/7-3-tutor-create-403.png"
})

// 7.4 Cross-course authorization test
// Create timesheet as lecturer1 for COMP2022
// ... (Scenario 1 steps)

// 7.5 Login as lecturer2 (not assigned to COMP2022)
mcp__chrome-devtools__click({uid: "button-logout"})

mcp__chrome-devtools__fill_form({
  elements: [
    {uid: "input-username", value: "lecturer2"},
    {uid: "input-password", value: "password123"}
  ]
})

mcp__chrome-devtools__click({uid: "button-login"})

// 7.6 Navigate to approvals
mcp__chrome-devtools__click({uid: "nav-approvals"})

// 7.7 Attempt to confirm COMP2022 timesheet
mcp__chrome-devtools__click({uid: "button-lecturer-confirm-{COMP2022_TIMESHEET_ID}"})

// Wait for error
mcp__chrome-devtools__wait_for({text: "Not authorized", timeout: 5000})

// 7.8 Verify 403 response
mcp__chrome-devtools__get_network_request({reqid: <UNAUTHORIZED_CONFIRM_REQUEST_ID>})

// Assert:
// POST /api/approvals → 403 Forbidden
// Response: {"error": "Not authorized for this course"}

mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/7-8-cross-course-403.png"
})

// 7.9 Admin override validation
// Login as admin
mcp__chrome-devtools__click({uid: "button-logout"})

mcp__chrome-devtools__fill_form({
  elements: [
    {uid: "input-username", value: "admin"},
    {uid: "input-password", value: "admin123"}
  ]
})

mcp__chrome-devtools__click({uid: "button-login"})

// 7.10 Verify admin can confirm any course
mcp__chrome-devtools__click({uid: "nav-pending-final-approval"})

mcp__chrome-devtools__take_snapshot()
// Expected: Admin can see timesheets from ALL courses

// Confirm timesheet from any course
mcp__chrome-devtools__click({uid: "button-admin-confirm-{ANY_TIMESHEET_ID}"})

mcp__chrome-devtools__wait_for({text: "confirmed", timeout: 5000})

// Should succeed (200 OK) regardless of course assignment
```

**Validation Assertions**:
- ✓ Tutor cannot create timesheets (403 Forbidden)
- ✓ Lecturer can only confirm timesheets for assigned courses
- ✓ Cross-course confirmation attempts return 403
- ✓ Error messages are informative but secure
- ✓ Admin role has global override permissions
- ✓ Admin can confirm timesheets for any course

---

## API Validation Matrix

| Endpoint | Method | Role | Request Body | Expected Response | Status Transition |
|----------|--------|------|--------------|-------------------|-------------------|
| `/timesheets/quote` | POST | Lecturer/Admin | `{tutorId, courseId, taskType, qualification, repeat, deliveryHours, sessionDate}` | 200 + `{rateCode, hourlyRate, associatedHours, payableHours, amount, formula, clauseReference}` | N/A |
| `/timesheets` | POST | Lecturer/Admin | Instructional fields ONLY (no financial) | 201 + Entity with calculated fields + `status: PENDING_TUTOR_CONFIRMATION` | → PENDING_TUTOR_CONFIRMATION |
| `/timesheets` | POST | Tutor | Any | 403 Forbidden | N/A |
| `/approvals` | POST | Tutor | `{timesheetId, action: "TUTOR_CONFIRM"}` | 200 + `{newStatus: "TUTOR_CONFIRMED"}` | PENDING → TUTOR_CONFIRMED |
| `/approvals` | POST | Lecturer | `{action: "LECTURER_CONFIRM"}` | 200 + `{newStatus: "LECTURER_CONFIRMED"}` | TUTOR_CONFIRMED → LECTURER_CONFIRMED |
| `/approvals` | POST | Admin | `{action: "HR_CONFIRM"}` | 200 + `{newStatus: "FINAL_CONFIRMED"}` | LECTURER_CONFIRMED → FINAL_CONFIRMED |
| `/approvals` | POST | Any | `{action: "REJECT", comment}` | 200 + `{newStatus: "REJECTED"}` | Any → REJECTED |
| `/approvals` | POST | Any | `{action: "REQUEST_MODIFICATION"}` | 200 + `{newStatus: "MODIFICATION_REQUESTED"}` | Any → MODIFICATION_REQUESTED |
| `/approvals` | POST | Lecturer | `{action: "LECTURER_CONFIRM"}` for other course | 403 Forbidden | N/A |

---

## Artifacts Collection

After all scenarios complete, collect and organize artifacts:

### Directory Structure
```
./uat-artifacts/{ISO_DATETIME}/e2e/
├── screenshots/
│   ├── 1-1-login-form.png
│   ├── 1-2-create-form.png
│   ├── 1-7-quote-displayed.png
│   ├── 1-12-timesheet-created.png
│   ├── 2-2-tutor-dashboard.png
│   ├── 2-7-tutor-confirmed.png
│   ├── 3-3-lecturer-approvals.png
│   ├── 3-6-lecturer-confirmed.png
│   ├── 4-3-admin-final-queue.png
│   ├── 4-6-final-confirmed.png
│   ├── 5-4-reject-dialog.png
│   ├── 5-6-rejected-state.png
│   ├── 6-6-editing-modification.png
│   ├── 6-8-resubmitted.png
│   ├── 7-3-tutor-create-403.png
│   └── 7-8-cross-course-403.png
├── console/
│   └── console-errors.json
├── network/
│   ├── all-requests.json
│   ├── quote-request-{id}.json
│   ├── create-request-{id}.json
│   ├── tutor-confirm-request-{id}.json
│   ├── lecturer-confirm-request-{id}.json
│   ├── admin-confirm-request-{id}.json
│   ├── reject-request-{id}.json
│   └── failed-requests/
│       ├── tutor-create-403-{id}.json
│       └── cross-course-403-{id}.json
└── uat-report.tap
```

### TAP Report Template

```tap
TAP version 14
1..79

# Scenario 1: Lecturer Creates Timesheet with Quote Validation
ok 1 - Lecturer login successful
ok 2 - Navigate to Create Timesheet page
ok 3 - Form fills trigger Quote API call
ok 4 - Quote API returns 200 OK
ok 5 - Quote request contains ONLY instructional fields
ok 6 - Quote response includes rateCode field
ok 7 - Quote response includes hourlyRate field
ok 8 - Quote response includes associatedHours=2.0
ok 9 - Quote response includes payableHours=3.0
ok 10 - Quote response includes amount field
ok 11 - Quote response includes formula field
ok 12 - Quote response includes clauseReference field
ok 13 - UI displays Rate Code: TU2
ok 14 - UI displays Hourly Rate (read-only)
ok 15 - UI displays Associated Hours: 2.0 (read-only)
ok 16 - UI displays Payable Hours: 3.0 (read-only)
ok 17 - UI displays Total Amount (read-only)
ok 18 - UI displays Formula transparency
ok 19 - UI displays Clause Reference
ok 20 - Submit triggers Create API
ok 21 - Create API returns 201 Created
ok 22 - Create request excludes hourlyRate
ok 23 - Create request excludes amount
ok 24 - Create request excludes associatedHours
ok 25 - Create request excludes payableHours
ok 26 - Create response includes server-calculated hourlyRate
ok 27 - Create response includes server-calculated amount
ok 28 - Create response status is PENDING_TUTOR_CONFIRMATION
ok 29 - New timesheet appears in list
ok 30 - No console errors in Scenario 1

# Scenario 2: Tutor Confirms Timesheet
ok 31 - Tutor login successful
ok 32 - Tutor dashboard loads
ok 33 - PENDING_TUTOR_CONFIRMATION timesheet visible
ok 34 - Tutor confirm button clickable
ok 35 - Confirm triggers approval API
ok 36 - Approval API returns 200 OK
ok 37 - Request action is TUTOR_CONFIRM
ok 38 - Response newStatus is TUTOR_CONFIRMED
ok 39 - UI status badge updates to "Tutor Confirmed"
ok 40 - No console errors in Scenario 2

# Scenario 3: Lecturer Confirms Timesheet
ok 41 - Lecturer login successful
ok 42 - Navigate to Approvals page
ok 43 - TUTOR_CONFIRMED timesheet visible
ok 44 - Lecturer confirm button clickable
ok 45 - Confirm triggers approval API
ok 46 - Approval API returns 200 OK
ok 47 - Request action is LECTURER_CONFIRM
ok 48 - Response newStatus is LECTURER_CONFIRMED
ok 49 - UI status updates correctly
ok 50 - No console errors in Scenario 3

# Scenario 4: Admin Final Confirmation
ok 51 - Admin login successful
ok 52 - Navigate to Pending Final Approval
ok 53 - LECTURER_CONFIRMED timesheet visible
ok 54 - Admin confirm button clickable
ok 55 - Confirm triggers approval API
ok 56 - Approval API returns 200 OK
ok 57 - Request action is HR_CONFIRM
ok 58 - Response newStatus is FINAL_CONFIRMED
ok 59 - UI shows terminal state (no action buttons)
ok 60 - No console errors in Scenario 4

# Scenario 5: Rejection Workflow
ok 61 - Reject button available
ok 62 - Reject dialog opens
ok 63 - Rejection reason field required
ok 64 - Reject triggers approval API
ok 65 - Approval API returns 200 OK
ok 66 - Request action is REJECT
ok 67 - Request includes rejection comment
ok 68 - Response newStatus is REJECTED
ok 69 - UI shows terminal rejected state
ok 70 - Rejection reason displayed in UI

# Scenario 6: Modification Request Workflow
ok 71 - Request Modification button available
ok 72 - Modification dialog opens
ok 73 - Modification API returns 200 OK
ok 74 - Response newStatus is MODIFICATION_REQUESTED
ok 75 - Timesheet becomes editable
ok 76 - Resubmit returns status to PENDING_TUTOR_CONFIRMATION

# Scenario 7: RBAC and Authorization
ok 77 - Tutor create attempt returns 403 Forbidden
ok 78 - Cross-course lecturer confirm returns 403 Forbidden
ok 79 - Admin can confirm any course timesheet

# Summary
# Tests: 79
# Pass: 79
# Fail: 0
# Skip: 0
```

---

## Failure Handling

If any test fails:

1. **Capture State**:
```javascript
mcp__chrome-devtools__take_screenshot({
  filePath: "./uat-artifacts/{ISO}/error-{SCENARIO}-{STEP}.png"
})

mcp__chrome-devtools__list_console_messages({
  includePreservedMessages: true,
  types: ["error", "warn"]
})

mcp__chrome-devtools__list_network_requests({
  includePreservedRequests: true
})
```

2. **Export Failed Request Details**:
```javascript
mcp__chrome-devtools__get_network_request({reqid: <FAILED_REQUEST_ID>})
// Export to ./uat-artifacts/{ISO}/network/failed-request-{id}.json
```

3. **Document Root Cause**:
   - Expected behavior vs actual behavior
   - API response status and body
   - Console error messages
   - DOM state snapshot
   - Proposed fix with file:line reference

4. **TAP Report Entry**:
```tap
not ok 25 - Create request excludes associatedHours
  ---
  message: "Found 'associatedHours' field in request body"
  severity: fail
  root_cause: "Frontend TimesheetForm.tsx:152 includes calculation fields in submit payload"
  fix: |
    // frontend/src/components/TimesheetForm.tsx:152
    const payload = {
      tutorId: formData.tutorId,
      courseId: formData.courseId,
      // ... instructional fields only
    - associatedHours: calculationResult.associatedHours,  // REMOVE
    };
  screenshot: "./uat-artifacts/2025-10-27T14-30-00/error-1-25.png"
  api_response: "./uat-artifacts/2025-10-27T14-30-00/network/create-request-123.json"
  ...
```

---

## Success Criteria

All 79 test assertions must pass:
- ✓ SSOT compliance: Quote endpoint and create/update exclude client financial data
- ✓ Three-tier workflow: All state transitions work correctly
- ✓ RBAC enforcement: Role and resource-level permissions enforced
- ✓ Terminal states: FINAL_CONFIRMED and REJECTED have no further actions
- ✓ Audit trail: All actions logged with actor, timestamp, comment
- ✓ Error handling: 403/400 responses with informative messages
- ✓ UI consistency: Status badges and buttons reflect backend state

---

## Execution Notes

**Pre-requisites**:
1. Services running and healthy
2. Database seeded with test users and courses
3. Chrome DevTools MCP server connected
4. Artifacts directory created

**Execution Order**:
1. Run Scenario 1 (creates base timesheet)
2. Run Scenario 2 (advances to TUTOR_CONFIRMED)
3. Run Scenario 3 (advances to LECTURER_CONFIRMED)
4. Run Scenario 4 (completes to FINAL_CONFIRMED)
5. Run Scenario 5 (separate timesheet for rejection)
6. Run Scenario 6 (separate timesheet for modification)
7. Run Scenario 7 (RBAC validation across all scenarios)

**Time Estimate**: 15-20 minutes for full execution

**Rerun Failed Tests**:
```bash
# Example rerun command for specific scenario
npm run e2e:uat -- --scenario=5 --step=7
```

---

**Document Status**: Ready for Execution  
**Last Updated**: 2025-10-27  
**Author**: Claude Code (Sonnet 4)
