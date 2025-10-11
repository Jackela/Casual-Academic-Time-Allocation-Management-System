#!/bin/bash

# Session-level test runner with comprehensive cleanup
# Ensures all processes are cleaned up after test execution

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_PORTS=(3000 3001 4000 5000 5173 5174 4173 4174 5175 8000 8080 9229)

echo -e "${GREEN}Starting test execution with cleanup...${NC}"

# Trap to ensure cleanup on exit (success or failure)
cleanup_on_exit() {
    local exit_code=$?
    echo -e "${YELLOW}Performing cleanup...${NC}"
    
    # Kill all child processes
    if [[ -n "${PIDS:-}" ]]; then
        for pid in $PIDS; do
            if kill -0 "$pid" 2>/dev/null; then
                echo "Killing process $pid"
                kill -TERM "$pid" 2>/dev/null || true
            fi
        done
    fi
    
    # Kill processes by pattern (Node.js processes in project directory)
    pkill -f "node.*$(basename "$PROJECT_ROOT")" 2>/dev/null || true
    
    # Clean up common development ports
    for port in "${TEST_PORTS[@]}"; do
        lsof -ti:$port | xargs -r kill -TERM 2>/dev/null || true
    done
    
    # Wait for processes to terminate gracefully
    sleep 2
    
    # Force kill if still running
    pkill -9 -f "node.*$(basename "$PROJECT_ROOT")" 2>/dev/null || true
    
    echo -e "${GREEN}Cleanup completed.${NC}"
    exit $exit_code
}

trap cleanup_on_exit EXIT INT TERM

# Pre-flight cleanup
echo -e "${YELLOW}Running pre-flight cleanup...${NC}"

# Kill any existing processes from previous runs
pkill -f "node.*$(basename "$PROJECT_ROOT")" 2>/dev/null || true

# Clean up ports from previous runs
for port in "${TEST_PORTS[@]}"; do
    lsof -ti:$port | xargs -r kill -TERM 2>/dev/null || true
done

# Wait for cleanup to complete
sleep 1

# Set environment variables for optimal testing
export UV_THREADPOOL_SIZE=8
export NODE_ENV=test
export CI=true

# Track background processes
PIDS=""

# Change to project directory
cd "$PROJECT_ROOT"

echo -e "${GREEN}Running tests...${NC}"

# Determine test command based on arguments
if [ $# -eq 0 ]; then
    # Default: run all tests
    npm run test:ci
else
    # Run specific test command
    case "$1" in
        "unit")
            npm run test:unit
            ;;
        "component")
            npm run test:component
            ;;
        "e2e")
            npm run test:e2e
            ;;
        "coverage")
            npm run test:coverage
            ;;
        *)
            # Pass through custom command
            npm run "$@"
            ;;
    esac
fi

echo -e "${GREEN}Tests completed successfully!${NC}"
