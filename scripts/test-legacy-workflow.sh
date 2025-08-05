#!/bin/bash
# test-legacy-workflow.sh - Validate legacy approval workflow path
# Usage: ./test-legacy-workflow.sh [staging|production]

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-staging}"
API_BASE_URL=""
AUTH_TOKEN=""

# Set environment-specific variables
case "$ENVIRONMENT" in
    staging)
        API_BASE_URL="http://staging-api.catams.edu.au"
        AUTH_TOKEN="${STAGING_AUTH_TOKEN:-test-token}"
        ;;
    production)
        API_BASE_URL="https://api.catams.edu.au"
        AUTH_TOKEN="${PROD_AUTH_TOKEN:-prod-token}"
        ;;
    *)
        echo "Error: Invalid environment. Use 'staging' or 'production'"
        exit 1
        ;;
esac

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Testing Legacy Workflow on $ENVIRONMENT"
echo "API URL: $API_BASE_URL"
echo "========================================="

# Test data
TUTOR_ID="1001"
LECTURER_ID="2001"
COURSE_ID="3001"
TIMESHEET_ID=""

# Function to check response
check_response() {
    local response="$1"
    local expected_status="$2"
    local test_name="$3"
    
    if echo "$response" | grep -q "\"status\":\"$expected_status\""; then
        echo -e "${GREEN}✓${NC} $test_name: PASSED"
        return 0
    else
        echo -e "${RED}✗${NC} $test_name: FAILED"
        echo "  Expected status: $expected_status"
        echo "  Response: $response"
        return 1
    }
}

# Test 1: Create timesheet in DRAFT status
echo -e "\n${YELLOW}Test 1: Create Draft Timesheet${NC}"
CREATE_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/timesheets" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "tutorId": "'$TUTOR_ID'",
        "courseId": "'$COURSE_ID'",
        "weekStartDate": "2024-01-08",
        "hours": 10,
        "hourlyRate": 50.00,
        "status": "DRAFT"
    }')

TIMESHEET_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | cut -d: -f2)
check_response "$CREATE_RESPONSE" "DRAFT" "Create Draft Timesheet"

# Test 2: Submit for approval (DRAFT → PENDING_TUTOR_REVIEW)
echo -e "\n${YELLOW}Test 2: Submit for Tutor Review${NC}"
SUBMIT_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/timesheets/$TIMESHEET_ID/submit" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"action": "SUBMIT_FOR_APPROVAL"}')

check_response "$SUBMIT_RESPONSE" "PENDING_TUTOR_REVIEW" "Submit for Review"

# Test 3: Tutor approval (PENDING_TUTOR_REVIEW → TUTOR_APPROVED)
echo -e "\n${YELLOW}Test 3: Legacy Tutor Approval${NC}"
APPROVE_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/timesheets/$TIMESHEET_ID/approve" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "action": "APPROVE",
        "comment": "Legacy workflow tutor approval"
    }')

check_response "$APPROVE_RESPONSE" "TUTOR_APPROVED" "Tutor Approval (Legacy)"

# Test 4: Auto-transition validation (TUTOR_APPROVED → PENDING_HR_REVIEW)
echo -e "\n${YELLOW}Test 4: Auto-transition to HR Review${NC}"
sleep 2  # Allow time for auto-transition
STATUS_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/timesheets/$TIMESHEET_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN")

check_response "$STATUS_RESPONSE" "PENDING_HR_REVIEW" "Auto-transition to HR"

# Test 5: HR approval (PENDING_HR_REVIEW → HR_APPROVED)
echo -e "\n${YELLOW}Test 5: HR Final Approval${NC}"
HR_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/timesheets/$TIMESHEET_ID/approve" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "action": "APPROVE",
        "comment": "HR approval in legacy workflow"
    }')

check_response "$HR_RESPONSE" "HR_APPROVED" "HR Approval (Legacy)"

# Test 6: Verify approval history
echo -e "\n${YELLOW}Test 6: Verify Approval History${NC}"
HISTORY_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/timesheets/$TIMESHEET_ID/history" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$HISTORY_RESPONSE" | grep -q "TUTOR_APPROVED.*PENDING_HR_REVIEW.*HR_APPROVED"; then
    echo -e "${GREEN}✓${NC} Approval History: Complete legacy workflow recorded"
else
    echo -e "${RED}✗${NC} Approval History: Missing expected transitions"
fi

# Test 7: Query performance check
echo -e "\n${YELLOW}Test 7: Query Performance Validation${NC}"
START_TIME=$(date +%s%N)
QUERY_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/timesheets/pending-approval" \
    -H "Authorization: Bearer $AUTH_TOKEN")
END_TIME=$(date +%s%N)

ELAPSED_MS=$(( ($END_TIME - $START_TIME) / 1000000 ))
if [ "$ELAPSED_MS" -lt 100 ]; then
    echo -e "${GREEN}✓${NC} Query Performance: ${ELAPSED_MS}ms (<100ms target)"
else
    echo -e "${YELLOW}⚠${NC} Query Performance: ${ELAPSED_MS}ms (>100ms target)"
fi

# Summary
echo -e "\n========================================="
echo "Legacy Workflow Test Summary"
echo "========================================="
echo "Environment: $ENVIRONMENT"
echo "Timesheet ID: $TIMESHEET_ID"
echo "Test completed at: $(date)"
echo "========================================="