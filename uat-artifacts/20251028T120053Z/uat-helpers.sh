#\!/bin/bash

export CURRENT_TOKEN=""
export CURRENT_USER_ID=""

login_api() {
  local email=$1
  local password=$2
  
  local response=$(curl -s -X POST http://localhost:8084/api/auth/login     -H "Content-Type: application/json"     -d "{\"email\":\"$email\",\"password\":\"$password\"}")
  
  CURRENT_TOKEN=$(echo "$response"  < /dev/null |  jq -r '.token')
  CURRENT_USER_ID=$(echo "$response" | jq -r '.userId')
  
  if [ "$CURRENT_TOKEN" = "null" ]; then
    echo "❌ Login failed"
    return 1
  fi
  
  echo "✅ Logged in as $email (ID: $CURRENT_USER_ID)"
}

get_timesheet_status() {
  local id=$1
  curl -s http://localhost:8084/api/timesheets/$id     -H "Authorization: Bearer $CURRENT_TOKEN"     | jq -r '.status'
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
    echo "  ⏳ Waiting... ($status \!= $expected)"
    sleep 0.5
  done
  
  echo "❌ Timeout waiting for $expected"
  return 1
}
