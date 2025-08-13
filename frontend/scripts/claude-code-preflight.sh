#!/bin/bash

# Claude Code pre-flight cleanup script
# Ensures clean environment before Claude Code operations

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_NAME="$(basename "$PROJECT_ROOT")"

echo -e "${BLUE}Claude Code Pre-flight Cleanup${NC}"
echo -e "Project: ${GREEN}$PROJECT_NAME${NC}"
echo -e "Root: ${GREEN}$PROJECT_ROOT${NC}"
echo

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -i:$port >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes by pattern
kill_by_pattern() {
    local pattern=$1
    local count=0
    
    # Find and kill matching processes
    for pid in $(pgrep -f "$pattern" 2>/dev/null || true); do
        if [ -n "$pid" ]; then
            echo -e "  ${YELLOW}Killing process${NC} $pid ($(ps -p $pid -o comm= 2>/dev/null || echo 'unknown'))"
            kill -TERM "$pid" 2>/dev/null || true
            ((count++))
        fi
    done
    
    if [ $count -gt 0 ]; then
        echo -e "  ${GREEN}Killed $count processes${NC}"
        sleep 1
        
        # Force kill any remaining processes
        for pid in $(pgrep -f "$pattern" 2>/dev/null || true); do
            if [ -n "$pid" ]; then
                echo -e "  ${RED}Force killing${NC} $pid"
                kill -KILL "$pid" 2>/dev/null || true
            fi
        done
    else
        echo -e "  ${GREEN}No matching processes found${NC}"
    fi
}

# Function to cleanup port
cleanup_port() {
    local port=$1
    if check_port $port; then
        echo -e "  ${YELLOW}Port $port is in use, cleaning up...${NC}"
        lsof -ti:$port | xargs -r kill -TERM 2>/dev/null || true
        sleep 1
        # Force kill if still occupied
        if check_port $port; then
            lsof -ti:$port | xargs -r kill -KILL 2>/dev/null || true
        fi
        
        if check_port $port; then
            echo -e "  ${RED}Warning: Port $port is still in use${NC}"
        else
            echo -e "  ${GREEN}Port $port cleaned up${NC}"
        fi
    else
        echo -e "  ${GREEN}Port $port is free${NC}"
    fi
}

echo -e "${YELLOW}1. Cleaning up Node.js processes...${NC}"
kill_by_pattern "node.*$PROJECT_NAME"

echo
echo -e "${YELLOW}2. Cleaning up development servers...${NC}"
kill_by_pattern "vite"
kill_by_pattern "webpack"
kill_by_pattern "next"
kill_by_pattern "nuxt"

echo
echo -e "${YELLOW}3. Cleaning up test runners...${NC}"
kill_by_pattern "vitest"
kill_by_pattern "jest"
kill_by_pattern "playwright"

echo
echo -e "${YELLOW}4. Cleaning up common development ports...${NC}"
for port in 3000 3001 4000 5000 8000 8080 9229; do
    cleanup_port $port
done

echo
echo -e "${YELLOW}5. Cleaning up file watchers and temporary files...${NC}"

# Clean up common temporary directories
for dir in ".vite" "dist" "build" ".next" ".nuxt" "node_modules/.cache"; do
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        echo -e "  ${YELLOW}Removing${NC} $dir"
        rm -rf "$PROJECT_ROOT/$dir" 2>/dev/null || true
    fi
done

# Clean up test artifacts
for pattern in "coverage" "test-results" "playwright-report" "*.log"; do
    if ls "$PROJECT_ROOT"/$pattern >/dev/null 2>&1; then
        echo -e "  ${YELLOW}Removing${NC} $pattern"
        rm -rf "$PROJECT_ROOT"/$pattern 2>/dev/null || true
    fi
done

echo -e "  ${GREEN}Temporary files cleaned${NC}"

echo
echo -e "${YELLOW}6. Final system check...${NC}"

# Check for any remaining Node processes
REMAINING=$(pgrep -f "node.*$PROJECT_NAME" | wc -l)
if [ $REMAINING -gt 0 ]; then
    echo -e "  ${RED}Warning: $REMAINING Node.js processes still running${NC}"
    pgrep -f "node.*$PROJECT_NAME" | head -5 | while read pid; do
        echo -e "    PID $pid: $(ps -p $pid -o args= 2>/dev/null || echo 'process info unavailable')"
    done
else
    echo -e "  ${GREEN}No Node.js processes detected${NC}"
fi

# Check port status
OCCUPIED_PORTS=""
for port in 3000 3001 4000 5000 8000 8080 9229; do
    if check_port $port; then
        OCCUPIED_PORTS="$OCCUPIED_PORTS $port"
    fi
done

if [ -n "$OCCUPIED_PORTS" ]; then
    echo -e "  ${RED}Warning: Ports still occupied:${NC}$OCCUPIED_PORTS"
else
    echo -e "  ${GREEN}All common ports are free${NC}"
fi

echo
echo -e "${GREEN}✅ Pre-flight cleanup completed!${NC}"
echo -e "Environment is ready for Claude Code operations."

# Optional: Wait for user confirmation
if [ "${1:-}" = "--wait" ]; then
    echo
    read -p "Press Enter to continue..."
fi