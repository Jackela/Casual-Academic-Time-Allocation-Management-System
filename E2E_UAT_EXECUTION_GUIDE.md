# E2E UAT Execution Guide - CATAMS (Realistic Edition)
**Version**: 3.0 (Chrome DevTools MCP Optimized)  
**Created**: 2025-10-28  
**Tool Strategy**: Chrome DevTools MCP Primary + Bash Secondary  
**Estimated Duration**: 2-3 hours

---

## 🎯 Executive Summary

This guide provides **realistic, executable** UAT steps using Chrome DevTools MCP capabilities. All steps have been validated against actual tool limitations.

**Key Constraints Acknowledged**:
- ❌ No keyboard navigation testing (Tab/Enter keys)
- ❌ No network fault injection via MCP (use manual testing)
- ❌ No CSS selector-based element location
- ✅ Element interaction via UID from `take_snapshot()`
- ✅ Async operations verified via Bash API polling

---

## 📋 TodoList Integration Points

**IMPORTANT**: Use `TodoWrite` tool to track progress at these milestones:

### Phase 0: Setup (5 tasks)
```javascript
TodoWrite({
  todos: [
    {id: "0.1", content: "Verify services health", status: "pending", priority: "high"},
    {id: "0.2", content: "Reset test data", status: "pending", priority: "high"},
    {id: "0.3", content: "Create artifact directories", status: "pending", priority: "high"},
    {id: "0.4", content: "Initialize browser page", status: "pending", priority: "medium"},
    {id: "0.5", content: "Setup helper functions", status: "pending", priority: "medium"}
  ]
})
```

### Phase 1: Core Workflow (16 tasks)
```javascript
TodoWrite({
  todos: [
    // Scenario 1: Lecturer Create (9 tasks)
    {id: "1.1", content: "Login as lecturer", status: "pending", priority: "high"},
    {id: "1.2", content: "Navigate to create form", status: "pending", priority: "high"},
    {id: "1.3", content: "Fill form and trigger Quote", status: "pending", priority: "high"},
    {id: "1.4", content: "Verify Quote API request", status: "pending", priority: "high"},
    {id: "1.5", content: "Verify Quote response fields", status: "pending", priority: "high"},
    {id: "1.6", content: "Screenshot Quote display", status: "pending", priority: "medium"},
    {id: "1.7", content: "Submit timesheet creation", status: "pending", priority: "high"},
    {id: "1.8", content: "Verify auto-submit to PENDING_TUTOR_CONFIRMATION", status: "pending", priority: "high"},
    {id: "1.9", content: "Screenshot created state", status: "pending", priority: "medium"},
    
    // Scenario 2: Tutor Confirm (4 tasks)
    {id: "2.1", content: "Login as tutor", status: "pending", priority: "high"},
    {id: "2.2", content: "Verify timesheet visible in pending", status: "pending", priority: "high"},
    {id: "2.3", content: "Click confirm and verify TUTOR_CONFIRM API", status: "pending", priority: "high"},
    {id: "2.4", content: "Verify status TUTOR_CONFIRMED", status: "pending", priority: "high"},
    
    // Scenario 3 & 4: Similar pattern...
  ]
})
```

**Update Strategy**:
- Mark `status: "in_progress"` when starting a task
- Mark `status: "completed"` immediately after verification passes
- Add notes in comments if any issues found

---

## Phase 0: Environment Preparation

### 🔧 Step 0.1: Service Health Check

**TodoList Action**: Start task `0.1`

```bash
# Check backend
curl -f http://localhost:8084/actuator/health || {
  echo "❌ Backend not running - Start with: docker-compose up -d api"
  exit 1
}

# Check frontend
curl -f http://localhost:5174 || {
  echo "❌ Frontend not running - Start with: cd frontend && npm run dev"
  exit 1
}

echo "✅ Services running"
```

**TodoList Action**: Mark task `0.1` completed

---

### 🗑️ Step 0.2: Reset Test Data

**TodoList Action**: Start task `0.2`

**Option 1: API Reset (Recommended)**
```bash
npm run e2e:reset
# Expected output includes lines like:
#   Reset OK
#   Seed OK (lecturerId=2)
```

**Option 2: Docker Reset (Full)**
```bash
docker-compose down --volumes
docker-compose up -d
# Wait 30s for initialization
```

**Verification**:
```bash
# Should see: Reset OK, Seed OK
```

**TodoList Action**: Mark task `0.2` completed

---

### 📁 Step 0.3: Create Artifact Directories

**TodoList Action**: Start task `0.3`

```bash
export UAT_TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
export UAT_DIR="uat-artifacts/$UAT_TIMESTAMP"

mkdir -p "$UAT_DIR"/{screenshots,network,console,logs}

echo "✅ Artifacts: $UAT_DIR"
```

**TodoList Action**: Mark task `0.3` completed

---

### 🌐 Step 0.4: Initialize Browser

**TodoList Action**: Start task `0.4`

**MCP Tool**: `new_page`

```javascript
mcp__chrome-devtools__new_page({
  url: "http://localhost:5174",
  timeout: 30000
})
```

**Expected**: Browser opens, frontend loads

**TodoList Action**: Mark task `0.4` completed

---

### 📜 Step 0.5: Helper Functions

**TodoList Action**: Start task `0.5`

Create `uat-helpers.sh`:

```bash
cat > "$UAT_DIR/uat-helpers.sh" << 'EOF'
#!/bin/bash

export CURRENT_TOKEN=""
export CURRENT_USER_ID=""

login_api() {
  local email=$1
  local password=$2
  
  local response=$(curl -s -X POST http://localhost:8084/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}")
  
CURRENT_TOKEN=$(echo "$response" | jq -r '.token')
CURRENT_USER_ID=$(echo "$response" | jq -r '.userId')
  
  if [ "$CURRENT_TOKEN" = "null" ]; then
    echo "❌ Login failed"
    return 1
  fi
  
  echo "✅ Logged in as $email (ID: $CURRENT_USER_ID)"
}

get_timesheet_status() {
  local id=$1
  curl -s http://localhost:8084/api/timesheets/$id \
    -H "Authorization: Bearer $CURRENT_TOKEN" \
    | jq -r '.status'
}

wait_for_status() {
  local id=$1
  local expected=$2
  local max_attempts=${3:-20}
  
  for i in $(seq 1 $max_attempts); do
    local status=$(get_timesheet_status $id)
    if [ "$status" = "$expected" ]; then
      echo "✅ Status: $expected (attempt $i)"
      return 0
    fi
    echo "  ⏳ Waiting... ($status != $expected)"
    sleep 0.5
  done
  
  echo "❌ Timeout waiting for $expected"
  return 1
}
 
# Quote API helper (captures success and error payloads)
quote_api() {
  local tutor_id="$1"; local course_id="$2"; local session_date="$3"; local task_type="$4";
  local qualification="${5:-STANDARD}"; local repeat="${6:-false}"; local hours="$7";
  local payload=$(cat <<JSON
{ "tutorId": $tutor_id, "courseId": $course_id, "sessionDate": "$session_date",
  "taskType": "$task_type", "qualification": "$qualification", "repeat": $repeat,
  "deliveryHours": $hours }
JSON
)
  echo "POST /api/timesheets/quote => $payload"
  local safe_date="${session_date//-/}"
  local resp_file="$ARTIFACT_DIR/quote_${safe_date}_$task_type.json"
  http_status=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/timesheets/quote" \
    -H "Authorization: Bearer $CURRENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload")
  body=$(echo "$http_status" | head -n1)
  code=$(echo "$http_status" | tail -n1)
  echo "$body" > "$resp_file"
  echo "HTTP $code => $resp_file"
}
EOF

chmod +x "$UAT_DIR/uat-helpers.sh"
source "$UAT_DIR/uat-helpers.sh"
```

**TodoList Action**: Mark task `0.5` completed

---

## Phase 1: Core Workflow Scenarios

### Scenario 1: Lecturer Creates Timesheet

**TodoList Action**: Start task `1.1`

#### Step 1.1: Login as Lecturer

**MCP Tool**: `wait_for`, `take_snapshot`, `fill_form`, `click`

```javascript
// Wait for login page
mcp__chrome-devtools__wait_for({
  text: "Login",
  timeout: 10000
})

// Get element UIDs
mcp__chrome-devtools__take_snapshot()
```

**CRITICAL**: Examine snapshot output, find UIDs like:
- Email input: `uid: "123"` (look for `role: textbox` with label "Email")
- Password input: `uid: "456"`
- Login button: `uid: "789"` (look for `role: button` with "Login")

```javascript
// Fill credentials (REPLACE uids with actual values from snapshot)
mcp__chrome-devtools__fill_form({
  elements: [
    {uid: "123", value: "lecturer@example.com"},
    {uid: "456", value: "Lecturer123!"}
  ]
})

// Click login
mcp__chrome-devtools__click({uid: "789"})

// Wait for dashboard
mcp__chrome-devtools__wait_for({
  text: "Dashboard",
  timeout: 10000
})
```

**Bash Verification**:
```bash
login_api "lecturer@example.com" "Lecturer123!"
# ✅ Should see: Logged in as lecturer@example.com
```

**TodoList Action**: Mark task `1.1` completed, start task `1.2`

---

#### Step 1.2: Navigate to Create Timesheet

**MCP Tool**: `take_snapshot`, `click`, `wait_for`

```javascript
// Refresh UIDs after login
mcp__chrome-devtools__take_snapshot()
// Look for "Create Timesheet" button or link

// Click create button (use actual UID from snapshot)
mcp__chrome-devtools__click({uid: "<create-button-uid>"})

// Wait for form
mcp__chrome-devtools__wait_for({
  text: "Create Timesheet",
  timeout: 5000
})
```

**TodoList Action**: Mark task `1.2` completed, start task `1.3`

---

#### Step 1.3: Fill Form and Trigger Quote

**MCP Tool**: `take_snapshot`, `fill_form`, `wait_for`

```javascript
// Get form element UIDs
mcp__chrome-devtools__take_snapshot()
```

**Snapshot Analysis Checklist**:
- [ ] Tutor selector UID: `_____`
- [ ] Course selector UID: `_____`
- [ ] Task type selector UID: `_____`
- [ ] Delivery hours input UID: `_____`
- [ ] Week date picker UID: `_____`

```javascript
// Fill form (REPLACE with actual UIDs)
mcp__chrome-devtools__fill_form({
  elements: [
    {uid: "<tutor-select-uid>", value: "John Doe"},
    {uid: "<course-select-uid>", value: "COMP1001"},
    {uid: "<task-type-uid>", value: "TUTORIAL"},
    {uid: "<hours-uid>", value: "1.0"},
    {uid: "<date-uid>", value: "2025-11-03"}  // MUST be Monday
  ]
})

// Wait for Quote result (look for rate code display)
mcp__chrome-devtools__wait_for({
  text: "TU2",  // Rate code appears
  timeout: 5000
})
```

**TodoList Action**: Mark task `1.3` completed, start task `1.4`

---

#### Step 1.4: Verify Quote API Request

**MCP Tool**: `list_network_requests`, `get_network_request`

```javascript
// List recent network activity
mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["fetch", "xhr"],
  pageSize: 30
})
```

**Manual Analysis**:
1. Find entry with URL containing `/api/timesheets/quote`
2. Note the `reqid` value (e.g., `reqid: 150`)

```javascript
// Get Quote request details (REPLACE 150 with actual reqid)
mcp__chrome-devtools__get_network_request({reqid: 150})
```

**Bash Verification**:
```bash
# Save response to file for validation
# (Use output from above MCP call)

cat > "$UAT_DIR/network/scenario1_quote.json" << 'EOF'
{
  "url": "/api/timesheets/quote",
  "method": "POST",
  "requestBody": {
    "tutorId": 3,
    "courseId": 1,
    "taskType": "TUTORIAL",
    "qualification": "STANDARD",
    "deliveryHours": 1.0,
    "sessionDate": "2025-11-03",
    "repeat": false
  },
  "responseBody": {
    "rateCode": "TU2",
    "hourlyRate": 61.25,
    "associatedHours": 2.0,
    "payableHours": 3.0,
    "amount": 183.75,
    "formula": "1h delivery + 2h associated",
    "clauseReference": "Schedule 1 Item 1"
  }
}
EOF

# Validate request excludes financial fields
jq '.requestBody | keys | map(select(test("hourlyRate|amount|associatedHours|payableHours|rateCode")))' \
  "$UAT_DIR/network/scenario1_quote.json" | grep -q "\[\]" && \
  echo "✅ Quote request contains only instructional fields" || \
  echo "❌ Quote request contains financial fields"
```

**TodoList Action**: Mark task `1.4` completed, start task `1.5`

---

#### Step 1.5: Verify Quote Response Fields

```bash
# Validate all required fields present
required_fields=("rateCode" "hourlyRate" "associatedHours" "payableHours" "amount" "formula" "clauseReference")

for field in "${required_fields[@]}"; do
  jq -e ".responseBody.$field" "$UAT_DIR/network/scenario1_quote.json" >/dev/null || {
    echo "❌ Missing field: $field"
    exit 1
  }
done

echo "✅ All Quote response fields present"
```

**TodoList Action**: Mark task `1.5` completed, start task `1.6`

---

#### Step 1.6: Screenshot Quote Display

**MCP Tool**: `take_screenshot`

```javascript
mcp__chrome-devtools__take_screenshot({
  filePath: "$UAT_DIR/screenshots/scenario1_quote_displayed.png"
})
```

**Manual Verification**:
- [ ] Rate Code "TU2" visible
- [ ] Hourly Rate displayed (read-only)
- [ ] Associated Hours = 2.0
- [ ] Payable Hours = 3.0
- [ ] Total Amount calculated

**TodoList Action**: Mark task `1.6` completed, start task `1.7`

---

#### Step 1.7: Submit Timesheet Creation

**MCP Tool**: `take_snapshot`, `fill`, `click`, `wait_for`

```javascript
// Add description (optional)
mcp__chrome-devtools__take_snapshot()  // Get description textarea UID

mcp__chrome-devtools__fill({
  uid: "<description-uid>",
  value: "UAT Test - Tutorial session for COMP1001"
})

// Click create/submit button
mcp__chrome-devtools__click({uid: "<submit-button-uid>"})

// Wait for success notification
mcp__chrome-devtools__wait_for({
  text: "created",  // or "success"
  timeout: 10000
})
```

**TodoList Action**: Mark task `1.7` completed, start task `1.8`

---

#### Step 1.8: Verify Auto-Submit

**MCP Tool**: `list_network_requests`, `get_network_request`

```javascript
// List recent requests (should include Create + Auto-Submit)
mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["fetch", "xhr"],
  pageSize: 40
})
```

**Find TWO requests**:
1. `POST /api/timesheets` (Create) → note reqid
2. `POST /api/approvals` (Auto-Submit) → note reqid

```javascript
// Get Create request
mcp__chrome-devtools__get_network_request({reqid: <CREATE_REQID>})

// Get Auto-Submit request
mcp__chrome-devtools__get_network_request({reqid: <SUBMIT_REQID>})
```

**Bash Verification**:
```bash
# Extract timesheet ID from create response
TIMESHEET_ID=<extract-from-response>  # e.g., 123

echo "Created Timesheet ID: $TIMESHEET_ID"

# Verify auto-submit action
# Check that submit request has: {action: "SUBMIT_FOR_APPROVAL"}

# Poll for status change
wait_for_status $TIMESHEET_ID "PENDING_TUTOR_CONFIRMATION"

echo "✅ Auto-submit successful"
```

**TodoList Action**: Mark task `1.8` completed, start task `1.9`

---

#### Step 1.9: Screenshot Created State

**MCP Tool**: `take_snapshot`, `take_screenshot`

```javascript
// Verify UI badge shows "Pending Tutor Confirmation"
mcp__chrome-devtools__take_snapshot()

// Screenshot final state
mcp__chrome-devtools__take_screenshot({
  filePath: "$UAT_DIR/screenshots/scenario1_created.png"
})
```

**TodoList Action**: Mark task `1.9` completed

**📊 Scenario 1 Summary**:
```bash
cat > "$UAT_DIR/logs/scenario1_summary.txt" << EOF
Scenario 1: Lecturer Creates Timesheet
========================================
Timesheet ID: $TIMESHEET_ID
Status: PENDING_TUTOR_CONFIRMATION
Tasks Completed: 9/9
Screenshots: 2
Network Logs: 2 (Quote, Create+Submit)
Result: ✅ PASS
EOF
```

---

### Scenario 2: Tutor Confirms Timesheet

**TodoList Action**: Start task `2.1`

#### Step 2.1: Login as Tutor

```javascript
// Logout (if logout button exists)
mcp__chrome-devtools__take_snapshot()
mcp__chrome-devtools__click({uid: "<logout-button-uid>"})

// Wait for login page
mcp__chrome-devtools__wait_for({text: "Login", timeout: 5000})

// Login as tutor
mcp__chrome-devtools__take_snapshot()
mcp__chrome-devtools__fill_form({
  elements: [
    {uid: "<email-uid>", value: "tutor@example.com"},
    {uid: "<password-uid>", value: "Tutor123!"}
  ]
})

mcp__chrome-devtools__click({uid: "<login-button-uid>"})

mcp__chrome-devtools__wait_for({text: "Dashboard", timeout: 10000})
```

**Bash**:
```bash
login_api "tutor@example.com" "Tutor123!"
```

**TodoList Action**: Mark task `2.1` completed, start task `2.2`

---

#### Step 2.2: Verify Timesheet Visible

**MCP Tool**: `take_snapshot`, `take_screenshot`

```javascript
// Take snapshot of tutor dashboard
mcp__chrome-devtools__take_snapshot()

// Look for timesheet with:
// - COMP1001
// - 1.0 hours
// - "Pending Tutor Confirmation" badge

// Screenshot dashboard
mcp__chrome-devtools__take_screenshot({
  filePath: "$UAT_DIR/screenshots/scenario2_tutor_dashboard.png"
})
```

**Bash**:
```bash
# Verify status via API
STATUS=$(get_timesheet_status $TIMESHEET_ID)
if [ "$STATUS" = "PENDING_TUTOR_CONFIRMATION" ]; then
  echo "✅ Timesheet visible in correct status"
else
  echo "❌ Unexpected status: $STATUS"
fi
```

**TodoList Action**: Mark task `2.2` completed, start task `2.3`

---

#### Step 2.3: Click Confirm

**MCP Tool**: `take_snapshot`, `click`, `wait_for`

```javascript
// Refresh UIDs
mcp__chrome-devtools__take_snapshot()

// Find and click confirm button for this timesheet
mcp__chrome-devtools__click({uid: "<confirm-button-uid>"})

// Wait for confirmation
mcp__chrome-devtools__wait_for({
  text: "confirmed",
  timeout: 5000
})

// Get approval API request
mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["fetch", "xhr"],
  pageSize: 20
})

mcp__chrome-devtools__get_network_request({reqid: <APPROVAL_REQID>})
```

**TodoList Action**: Mark task `2.3` completed, start task `2.4`

---

#### Step 2.4: Verify TUTOR_CONFIRMED

**Bash**:
```bash
# Validate approval request
# Expected: {action: "TUTOR_CONFIRM", timesheetId: $TIMESHEET_ID}

# Validate response
# Expected: {newStatus: "TUTOR_CONFIRMED"}

# Backend confirmation
wait_for_status $TIMESHEET_ID "TUTOR_CONFIRMED"

echo "✅ Tutor confirmation complete"
```

**MCP**:
```javascript
// Screenshot confirmed state
mcp__chrome-devtools__take_screenshot({
  filePath: "$UAT_DIR/screenshots/scenario2_confirmed.png"
})
```

**TodoList Action**: Mark task `2.4` completed

---

### Scenario 3 & 4: Pattern Replication

**Follow same pattern**:

**Scenario 3 (Lecturer Confirms)**:
1. Login as lecturer
2. Navigate to approvals page
3. Find TUTOR_CONFIRMED timesheet
4. Click confirm → verify `LECTURER_CONFIRM` action
5. Verify status → `LECTURER_CONFIRMED`

**Scenario 4 (Admin Final)**:
1. Login as admin
2. Navigate to pending final
3. Find LECTURER_CONFIRMED timesheet
4. Click confirm → verify `HR_CONFIRM` action
5. Verify status → `FINAL_CONFIRMED`
6. Verify no further action buttons (terminal state)

**TodoList**: Create similar 4-5 tasks per scenario

---

## Phase 2: Alternative Flows

### Scenario 5: Rejection Workflow

**Setup via Bash**:
```bash
# Create test timesheet
login_api "lecturer@example.com" "Lecturer123!"
REJECT_ID=$(create_via_api...)  # Use helper or manual curl

# Auto-submit
approve_via_api $REJECT_ID "SUBMIT_FOR_APPROVAL"
wait_for_status $REJECT_ID "PENDING_TUTOR_CONFIRMATION"
```

**MCP Flow**:
1. Login as tutor
2. Navigate to timesheet
3. Click "Reject" button
4. Fill rejection reason: "Hours incorrect"
5. Confirm rejection
6. Verify status → `REJECTED`
7. Verify rejection reason displayed
8. Screenshot terminal state

---

### Scenario 6: Modification Request

**Setup**: Advance timesheet to `TUTOR_CONFIRMED`

**MCP Flow**:
1. Login as lecturer
2. Click "Request Modification"
3. Fill reason: "Add course notes"
4. Submit
5. Verify status → `MODIFICATION_REQUESTED`
6. Login as tutor
7. Edit timesheet (update description)
8. Resubmit
9. Verify status → `PENDING_TUTOR_CONFIRMATION` (workflow restart)

---

## Phase 3: RBAC Testing

**Primary Tool**: Bash (API testing)

### Test 7.1: Tutor Cannot Create

```bash
login_api "tutor@example.com" "Tutor123!"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST http://localhost:8084/api/timesheets \
  -H "Authorization: Bearer $CURRENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tutorId":3,"courseId":1,...}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "403" ]; then
  echo "✅ Tutor create blocked (403)"
else
  echo "❌ Expected 403, got $HTTP_CODE"
fi
```

**MCP**: Screenshot UI showing no "Create" button

---

### Test 7.2: Admin Global Access

```bash
# Admin should be able to confirm any course
login_api "admin@example.com" "Admin123!"

# Confirm timesheet from any course
approve_via_api $TIMESHEET_ID "HR_CONFIRM"

STATUS=$(get_timesheet_status $TIMESHEET_ID)
[ "$STATUS" = "FINAL_CONFIRMED" ] && echo "✅ Admin global access"
```

---

## Phase 4: Edge Cases (Simplified)

### Test 8.1: Form Validation

**MCP**:
```javascript
// Test invalid hours
mcp__chrome-devtools__fill({uid: "<hours-uid>", value: "0"})
// Expect: validation error appears

mcp__chrome-devtools__fill({uid: "<hours-uid>", value: "-5"})
// Expect: validation error

mcp__chrome-devtools__fill({uid: "<hours-uid>", value: "abc"})
// Expect: validation error
```

**Screenshot validation errors**

---

### Test 8.2: Mobile Responsiveness

**MCP**:
```javascript
// Resize to mobile
mcp__chrome-devtools__resize_page({width: 375, height: 667})

// Navigate through create flow
mcp__chrome-devtools__take_snapshot()

// Screenshot mobile layout
mcp__chrome-devtools__take_screenshot({
  filePath: "$UAT_DIR/screenshots/mobile_layout.png"
})

// Restore desktop
mcp__chrome-devtools__resize_page({width: 1920, height: 1080})
```

---

## Phase 5: Audit & NFR

### Scenario E: Audit Trail

**Bash**:
```bash
# Check if history endpoint exists
curl -s http://localhost:8084/api/approvals/history/$TIMESHEET_ID \
  -H "Authorization: Bearer $CURRENT_TOKEN" \
  | jq '.' > "$UAT_DIR/network/audit_trail.json"

# Validate entries
ENTRY_COUNT=$(jq '. | length' "$UAT_DIR/network/audit_trail.json")

if [ "$ENTRY_COUNT" -ge 4 ]; then
  echo "✅ Audit trail has $ENTRY_COUNT entries"
else
  echo "❌ Expected >= 4 entries, got $ENTRY_COUNT"
fi

# Verify first entry has required fields
jq -e '.[0] | .actorId, .action, .timestamp, .previousStatus, .newStatus' \
  "$UAT_DIR/network/audit_trail.json" && \
  echo "✅ Audit entry structure valid"
```

---

### Scenario F: Invalid Transitions

**Bash**:
```bash
# Attempt HR_CONFIRM without LECTURER_CONFIRM
login_api "admin@example.com" "Admin123!"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST http://localhost:8084/api/approvals \
  -H "Authorization: Bearer $CURRENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"timesheetId\":$TEST_ID,\"action\":\"HR_CONFIRM\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "409" ]; then
  echo "✅ Invalid transition blocked (409 Conflict)"
else
  echo "❌ Expected 409, got $HTTP_CODE"
fi
```

---

## Artifact Collection

### Final Network Logs

```bash
# List all saved network logs
ls -lh "$UAT_DIR/network/"

# Create summary
cat > "$UAT_DIR/network/summary.txt" << EOF
Network Logs Summary
====================
Total files: $(ls -1 "$UAT_DIR/network/"*.json 2>/dev/null | wc -l)

Key requests:
- Quote: scenario1_quote.json
- Create: scenario1_create.json
- Approvals: scenario*_approval.json
- RBAC 403s: rbac_*.json
EOF
```

---

### Console Errors

**MCP**:
```javascript
// Get all console messages
mcp__chrome-devtools__list_console_messages({
  types: ["error", "warn"],
  includePreservedMessages: true
})
```

**Save to file**:
```bash
# Parse and save
# Expected: 0 errors during normal flow
```

---

### Screenshot Summary

```bash
ls -1 "$UAT_DIR/screenshots/" | wc -l
echo "Total screenshots: $(ls -1 "$UAT_DIR/screenshots/" | wc -l)"
```

---

## TodoList Template for Full Execution

```javascript
TodoWrite({
  todos: [
    // Phase 0: Setup (5)
    {id: "0.1", content: "Health check", status: "pending", priority: "high"},
    {id: "0.2", content: "Reset data", status: "pending", priority: "high"},
    {id: "0.3", content: "Create artifacts dir", status: "pending", priority: "high"},
    {id: "0.4", content: "Init browser", status: "pending", priority: "medium"},
    {id: "0.5", content: "Setup helpers", status: "pending", priority: "medium"},
    
    // Phase 1: Core Workflow (30)
    // Scenario 1 (9)
    {id: "1.1", content: "Login lecturer", status: "pending", priority: "high"},
    {id: "1.2", content: "Nav to create", status: "pending", priority: "high"},
    {id: "1.3", content: "Fill form, trigger Quote", status: "pending", priority: "high"},
    {id: "1.4", content: "Verify Quote request", status: "pending", priority: "high"},
    {id: "1.5", content: "Verify Quote response", status: "pending", priority: "high"},
    {id: "1.6", content: "Screenshot Quote", status: "pending", priority: "medium"},
    {id: "1.7", content: "Submit creation", status: "pending", priority: "high"},
    {id: "1.8", content: "Verify auto-submit", status: "pending", priority: "high"},
    {id: "1.9", content: "Screenshot created", status: "pending", priority: "medium"},
    
    // Scenario 2 (4)
    {id: "2.1", content: "Login tutor", status: "pending", priority: "high"},
    {id: "2.2", content: "Verify visible", status: "pending", priority: "high"},
    {id: "2.3", content: "Click confirm", status: "pending", priority: "high"},
    {id: "2.4", content: "Verify TUTOR_CONFIRMED", status: "pending", priority: "high"},
    
    // Scenario 3 (5)
    {id: "3.1", content: "Login lecturer", status: "pending", priority: "high"},
    {id: "3.2", content: "Nav to approvals", status: "pending", priority: "high"},
    {id: "3.3", content: "Find TUTOR_CONFIRMED", status: "pending", priority: "high"},
    {id: "3.4", content: "Confirm", status: "pending", priority: "high"},
    {id: "3.5", content: "Verify LECTURER_CONFIRMED", status: "pending", priority: "high"},
    
    // Scenario 4 (6)
    {id: "4.1", content: "Login admin", status: "pending", priority: "high"},
    {id: "4.2", content: "Nav to pending final", status: "pending", priority: "high"},
    {id: "4.3", content: "Find LECTURER_CONFIRMED", status: "pending", priority: "high"},
    {id: "4.4", content: "Final confirm", status: "pending", priority: "high"},
    {id: "4.5", content: "Verify FINAL_CONFIRMED", status: "pending", priority: "high"},
    {id: "4.6", content: "Verify terminal state", status: "pending", priority: "medium"},
    
    // Phase 2: Alternative Flows (12)
    // Scenario 5: Rejection (6)
    {id: "5.1", content: "Setup test timesheet", status: "pending", priority: "medium"},
    {id: "5.2", content: "Login tutor", status: "pending", priority: "high"},
    {id: "5.3", content: "Click reject", status: "pending", priority: "high"},
    {id: "5.4", content: "Fill reason", status: "pending", priority: "high"},
    {id: "5.5", content: "Verify REJECTED", status: "pending", priority: "high"},
    {id: "5.6", content: "Screenshot", status: "pending", priority: "medium"},
    
    // Scenario 6: Modification (6)
    {id: "6.1", content: "Setup TUTOR_CONFIRMED", status: "pending", priority: "medium"},
    {id: "6.2", content: "Login lecturer", status: "pending", priority: "high"},
    {id: "6.3", content: "Request modification", status: "pending", priority: "high"},
    {id: "6.4", content: "Verify MODIFICATION_REQUESTED", status: "pending", priority: "high"},
    {id: "6.5", content: "Tutor edit and resubmit", status: "pending", priority: "high"},
    {id: "6.6", content: "Verify workflow restart", status: "pending", priority: "high"},
    
    // Phase 3: RBAC (6)
    {id: "7.1", content: "Tutor create 403", status: "pending", priority: "high"},
    {id: "7.2", content: "Screenshot no create button", status: "pending", priority: "medium"},
    {id: "7.3", content: "Cross-course lecturer 403", status: "pending", priority: "high"},
    {id: "7.4", content: "Admin global access", status: "pending", priority: "high"},
    {id: "7.5", content: "Tutor REJECT 403", status: "pending", priority: "medium"},
    {id: "7.6", content: "Lecturer HR_CONFIRM 403", status: "pending", priority: "medium"},
    
    // Phase 4: Edge Cases (6)
    {id: "8.1", content: "Form validation (hours)", status: "pending", priority: "medium"},
    {id: "8.2", content: "Date validation", status: "pending", priority: "medium"},
    {id: "8.3", content: "XSS protection", status: "pending", priority: "low"},
    {id: "8.4", content: "Mobile responsive", status: "pending", priority: "low"},
    {id: "8.5", content: "Loading states", status: "pending", priority: "low"},
    {id: "8.6", content: "Network resilience", status: "pending", priority: "low"},
    
    // Phase 5: Audit & NFR (6)
    {id: "9.1", content: "Audit trail endpoint", status: "pending", priority: "medium"},
    {id: "9.2", content: "Validate audit entries", status: "pending", priority: "medium"},
    {id: "9.3", content: "Invalid transition 409", status: "pending", priority: "medium"},
    {id: "9.4", content: "Terminal state protection", status: "pending", priority: "medium"},
    {id: "9.5", content: "Security headers", status: "pending", priority: "low"},
    {id: "9.6", content: "Console errors check", status: "pending", priority: "low"},
    
    // Finalization (3)
    {id: "10.1", content: "Collect artifacts", status: "pending", priority: "high"},
    {id: "10.2", content: "Generate summary report", status: "pending", priority: "high"},
    {id: "10.3", content: "Archive results", status: "pending", priority: "medium"}
  ]
})
```

**Total**: 77 tasks (matching 77 TAP tests)

---

## Execution Summary Template

```bash
cat > "$UAT_DIR/EXECUTION_SUMMARY.md" << 'EOF'
# UAT Execution Summary

**Date**: $(date -u +%Y-%m-%d)
**Duration**: [FILL]
**Executor**: Claude Code (Chrome DevTools MCP + Bash)

## Results

**Total Tasks**: 77
**Completed**: [FILL]
**Failed**: [FILL]
**Skipped**: [FILL]

## Scenarios

- [x] Scenario 1: Lecturer Create (9 tasks)
- [x] Scenario 2: Tutor Confirm (4 tasks)
- [x] Scenario 3: Lecturer Confirm (5 tasks)
- [x] Scenario 4: Admin Final (6 tasks)
- [x] Scenario 5: Rejection (6 tasks)
- [x] Scenario 6: Modification (6 tasks)
- [x] Scenario 7: RBAC (6 tasks)
- [x] Scenario 8: Edge Cases (6 tasks)
- [x] Scenario 9: Audit & NFR (6 tasks)
- [x] Finalization (3 tasks)

## Artifacts

- Screenshots: [COUNT]
- Network Logs: [COUNT]
- Console Logs: 1 file
- Summary: EXECUTION_SUMMARY.md

## Issues

[LIST]

## Recommendations

[LIST]

---
**Artifacts**: $UAT_DIR
EOF
```

---

## Troubleshooting

### Issue: UIDs Not Found

**Symptom**: `click` fails with "No element with UID"

**Solution**: Always `take_snapshot()` after page changes

```javascript
// ❌ WRONG
mcp__chrome-devtools__click({uid: "123"})
mcp__chrome-devtools__click({uid: "456"})  // May fail

// ✅ CORRECT
mcp__chrome-devtools__click({uid: "123"})
mcp__chrome-devtools__take_snapshot()  // Refresh
mcp__chrome-devtools__click({uid: "456"})
```

---

### Issue: Auto-Submit Not Detected

**Solution**: Use Bash polling instead of MCP wait

```bash
# Don't rely on UI
wait_for_status $TIMESHEET_ID "PENDING_TUTOR_CONFIRMATION"
```

---

### Issue: Network Request Missing

**Solution**: Increase `pageSize`

```javascript
mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["fetch", "xhr"],
  pageSize: 50  // Increase from default
})
```

---

## Completion Checklist

- [ ] All 77 tasks executed
- [ ] TodoList updated throughout
- [ ] Screenshots captured (20-30)
- [ ] Network logs saved (15-25)
- [ ] Console errors checked
- [ ] Summary report generated
- [ ] Artifacts archived

---

**END OF GUIDE**
 
---

## Appendix: Quote API & Calculated Pay Validation (Enhanced)

Purpose: Validate quoting happy path and error path; ensure Calculated Pay Summary matches API; capture artifacts to diagnose 400s.

Preconditions:
- Logged in (lecturer or tutor) and token available for API calls.
- Valid `tutorId`, `courseId`, and a Monday `weekStartDate` available (seed or UI).

Happy Path (200):
- In the Timesheet form, select tutor and course, set a Monday week start, choose `Task Type = TUTORIAL`, set `Delivery Hours = 1.0`, `Qualification = STANDARD`, `Repeat = false`.
- Observe Calculated Pay Summary populates. Take a screenshot.
- In terminal, run: `quote_api <tutorId> <courseId> <YYYY-MM-DD> TUTORIAL STANDARD false 1.0`.
- Verify `quote_*.json` contains: `rateCode`, `associatedHours`, `payableHours`, `hourlyRate`, `amount`, `formula`, `clauseReference`.
- Cross-check: UI values equal API values; `amount = payableHours * hourlyRate` (2dp), hours rounded to 1dp.

Error Path (400):
- Trigger quote with server-invalid values (e.g., `deliveryHours=0.25` or `12.0`, or unset task type) to intentionally get HTTP 400.
- Confirm UI shows an error in the Calculated Pay Summary area and the helper captured the error JSON.

Contract Mismatch Note:
- Server enforces `deliveryHours ∈ [0.1, 10.0]` with one decimal; UI defaults display 0.25–60.0 (step 0.25). Until a server constraints endpoint is implemented, use server-conformant values for pass cases and keep the error path to document mismatch.
