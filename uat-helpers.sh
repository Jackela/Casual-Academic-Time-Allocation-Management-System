#!/usr/bin/env bash
# UAT Helper Functions for CATAMS E2E Testing

API_BASE="http://localhost:8084/api"
CURRENT_TOKEN=""
ARTIFACT_DIR="uat-artifacts/$(date +%Y%m%d_%H%M%S)"

# TAP counter
TAP_COUNT=0

# Login and store token
login_api() {
  local email="$1"
  local password="$2"
  local response=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}")
  
  CURRENT_TOKEN=$(echo "$response" | jq -r '.token // empty')
  
  if [ -z "$CURRENT_TOKEN" ]; then
    echo "❌ Login failed for $email"
    return 1
  fi
  
  echo "✅ Logged in as $email"
  return 0
}

# Get timesheet status from backend
get_timesheet_status() {
  local timesheet_id="$1"
  curl -s "$API_BASE/timesheets/$timesheet_id" \
    -H "Authorization: Bearer $CURRENT_TOKEN" | jq -r '.status // "ERROR"'
}

# Poll backend until expected status or timeout
wait_for_status() {
  local timesheet_id="$1"
  local expected_status="$2"
  local max_attempts="${3:-10}"
  local delay="${4:-1}"
  
  for i in $(seq 1 $max_attempts); do
    local current_status=$(get_timesheet_status "$timesheet_id")
    echo "Attempt $i/$max_attempts: $current_status"
    
    if [ "$current_status" == "$expected_status" ]; then
      echo "✅ Status reached: $expected_status"
      return 0
    fi
    
    sleep "$delay"
  done
  
  echo "❌ Timeout waiting for $expected_status"
  return 1
}

# TAP reporting
tap_ok() {
  TAP_COUNT=$((TAP_COUNT + 1))
  echo "ok $TAP_COUNT - $1"
}

tap_not_ok() {
  TAP_COUNT=$((TAP_COUNT + 1))
  echo "not ok $TAP_COUNT - $1"
}

# Save API response for evidence
save_api_response() {
  local filename="$1"
  local response="$2"
  echo "$response" | jq '.' > "$ARTIFACT_DIR/$filename"
}

# Create timesheet via API (for test setup)
create_timesheet_api() {
  local tutor_id="$1"
  local course_id="$2"
  local week_start="$3"
  local hours="${4:-1.0}"
  
  curl -s -X POST "$API_BASE/timesheets" \
    -H "Authorization: Bearer $CURRENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"tutorId\": $tutor_id,
      \"courseId\": $course_id,
      \"weekStartDate\": \"$week_start\",
      \"sessionDate\": \"$week_start\",
      \"deliveryHours\": $hours,
      \"taskType\": \"TUTORIAL\",
      \"qualification\": \"STANDARD\",
      \"description\": \"Test timesheet\"
    }"
}

# Approve timesheet via API
approve_timesheet_api() {
  local timesheet_id="$1"
  local action="$2"
  local comment="${3:-}"
  
  local body="{\"action\": \"$action\""
  if [ -n "$comment" ]; then
    body="$body, \"comment\": \"$comment\""
  fi
  body="$body}"
  
  curl -s -X POST "$API_BASE/approvals" \
    -H "Authorization: Bearer $CURRENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$body?timesheetId=$timesheet_id"
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

echo "✅ Helper functions loaded. Use: source uat-helpers.sh"
