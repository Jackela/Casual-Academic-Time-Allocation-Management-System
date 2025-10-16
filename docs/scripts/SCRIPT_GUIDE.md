# Script Usage Guide

## Overview

This guide provides comprehensive documentation for all project scripts organized by category and use case.

**Last Updated:** 2025-01-14

---

## Quick Reference

### Most Common Commands

```bash
# Start backend
./gradlew bootRun

# Start frontend
cd frontend && npm run dev

# Run all tests
./gradlew test                    # Backend
cd frontend && npm run test:coverage  # Frontend
cd frontend && npm run test:e2e   # E2E

# Cleanup
node scripts/cleanup-ports.js
```

---

## Script Categories

### 1. Backend Testing

#### Full Test Suites
```bash
# All backend tests (CI parity)
./gradlew test

# Unit tests only
node scripts/test-backend-unit.js
```

#### Selective Testing
```bash
# Select specific unit tests
node tools/scripts/test-backend-unit-select.js --tests="*TimesheetServiceUnitTest*"

# Select specific integration tests
node tools/scripts/test-backend-integration-select.js --tests="*TimesheetIntegrationTest*"
```

#### Performance Testing
```bash
node tools/scripts/test-backend-performance.js
```

---

### 2. Frontend Testing

#### Unit & Component Tests
```bash
# All unit tests with coverage
npm run test:coverage

# Unit tests only
npm run test:unit

# Component tests only
npm run test:component
```

#### Contract Tests
```bash
npm run test:contract
```

#### End-to-End Tests
```bash
# Full E2E suite with data reset
npm run test:e2e

# Mock-only (no backend)
npm run test:e2e:mock

# Real backend integration
npm run test:e2e:real

# Visual regression
npm run test:e2e:visual

# Smoke tests only
npm run test:e2e:smoke

# Critical path tests
npm run test:e2e:critical
```

#### E2E Options
```bash
# Disable test data reset
E2E_DISABLE_RESET=true npm run test:e2e

# Custom reset endpoint
E2E_RESET_PATH=/custom/reset npm run test:e2e

# Custom reset token
TEST_DATA_RESET_TOKEN=my-token npm run test:e2e

# Skip backend startup (assumes running)
E2E_SKIP_BACKEND=true npm run test:e2e
```

#### AI Smart Testing
```bash
# Pyramid strategy (recommended)
npm run test:ai

# Fast feedback loop
npm run test:ai:fast

# Specific layers
npm run test:ai:unit
npm run test:ai:component
npm run test:ai:api
npm run test:ai:e2e
```

---

### 3. Backend Services

#### E2E Backend (Testcontainers)
```bash
node tools/scripts/start-backend-e2e.js

# With custom timeout
node tools/scripts/start-backend-e2e.js --timeout=300000
```

#### Demo Backend (No Docker)
```bash
node tools/scripts/start-backend-demo.js

# Custom port
DEMO_PORT=9090 node tools/scripts/start-backend-demo.js
```

---

### 4. Cleanup Utilities

#### Port Cleanup
```bash
# Default ports (8084, 5174)
node scripts/cleanup-ports.js

# Custom ports
node scripts/cleanup-ports.js --ports=8080,3000,5000

# With session tracking
node scripts/cleanup-ports.js --session=my-session --ledger=./process-ledger.json
```

#### Comprehensive Cleanup
```bash
# Gentle mode (Gradle + ports only)
node tools/scripts/cleanup.js gentle

# Normal mode (default: Gradle + ports + temp files)
node tools/scripts/cleanup.js

# Full mode (includes validation)
node tools/scripts/cleanup.js full

# Emergency mode (aggressive process cleanup)
node tools/scripts/cleanup.js emergency

# With session tracking
node tools/scripts/cleanup.js --session=my-session --ledger=./ledger.json
```

---

### 5. CI/CD Scripts

#### CI Checks
```bash
node tools/scripts/run-ci-checks.js
```

#### E2E Checks
```bash
node tools/scripts/run-e2e-checks.js
```

---

### 6. Development Tools

#### Dev Orchestrator
```bash
# Start dev environment
npm run dev:ai

# Start backend for testing
npm run backend:start

# Stop backend
npm run backend:stop
```

#### Utilities
```bash
# Capture workflow screenshots
node tools/scripts/capture-workflow-screenshots.js

# Pre-flight checks
node tools/scripts/preflight.js

# Verify Docker availability
node tools/scripts/verify-docker-simple.js
```

---

## Environment Variables

### Backend
- `SPRING_PROFILES_ACTIVE` - Active Spring profile (e.g., `e2e`, `demo`)
- `SERVER_PORT` - Backend port (default: 8084)
- `JWT_SECRET` - JWT secret for authentication

### E2E Testing
- `E2E_BACKEND_PORT` - Backend port (default: 8084)
- `E2E_FRONTEND_PORT` - Frontend port (default: 5174)
- `E2E_BACKEND_URL` - Backend base URL
- `E2E_FRONTEND_URL` - Frontend base URL
- `E2E_SKIP_BACKEND` - Skip backend startup (true/false)
- `E2E_DISABLE_RESET` - Disable test data reset (true/false)
- `E2E_RESET_PATH` - Reset endpoint path (default: `/api/test-data/reset`)
- `TEST_DATA_RESET_TOKEN` - Reset token (default: `local-e2e-reset`)
- `E2E_SKIP_DOCKER_CHECK` - Skip Docker availability check
- `E2E_REQUIRE_DOCKER` - Fail if Docker is not available

### Playwright
- `PLAYWRIGHT_ARGS` - Additional Playwright arguments

---

## Script Organization

```
project-root/
├── scripts/                      # User-facing bridge scripts
│   ├── cleanup-ports.js         # → tools/scripts/cleanup-ports.js
│   └── test-backend-unit.js     # → tools/scripts/...
│
├── tools/scripts/               # Core implementation
│   ├── cleanup-ports.js         # Port cleanup
│   ├── cleanup.js               # Comprehensive cleanup
│   ├── test-backend-*.js        # Backend test scripts
│   ├── test-frontend-*.js       # Frontend test scripts
│   ├── start-backend-*.js       # Backend startup scripts
│   ├── run-ci-checks.js         # CI/CD scripts
│   └── lib/                     # Shared libraries
│       ├── junit-to-json.js
│       ├── port-utils.js
│       ├── process-manager.js
│       ├── safe-process-manager.js
│       └── test-runner.js
│
└── frontend/scripts/            # Frontend-specific
    ├── run-e2e-tests.js        # Main E2E runner
    ├── test-ai-smart.js        # AI test orchestration
    ├── dev-orchestrator.js     # Dev environment
    ├── env-utils.js            # Environment utilities
    └── e2e.params.json         # E2E configuration (SSOT)
```

---

## Best Practices

### 1. Use Bridge Scripts for CI/CD
```bash
# Stable paths guaranteed for CI
node scripts/test-backend-unit.js
node scripts/cleanup-ports.js
```

### 2. Use Direct Scripts for Development
```bash
# More control and options
node tools/scripts/test-backend-unit-select.js --tests="*MyTest*"
node tools/scripts/cleanup.js emergency
```

### 3. Leverage npm Scripts
```bash
# Convenient shortcuts
npm run test:e2e
npm run test:ai
npm run dev
```

### 4. Use Environment Variables
```bash
# Configure without code changes
E2E_BACKEND_PORT=9090 npm run test:e2e
E2E_DISABLE_RESET=true npm run test:e2e
```

---

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
node scripts/cleanup-ports.js --ports=8084

# Or comprehensive cleanup
node tools/scripts/cleanup.js
```

### Tests Hanging
```bash
# Emergency cleanup
node tools/scripts/cleanup.js emergency

# Check for orphaned processes
# Windows: tasklist | findstr "java\|node"
# Unix: ps aux | grep -E "java|node"
```

### Backend Won't Start
```bash
# Verify Docker is running (for E2E)
node tools/scripts/verify-docker-simple.js

# Use demo profile (no Docker)
node tools/scripts/start-backend-demo.js
```

### E2E Tests Failing
```bash
# Check backend is healthy
curl http://localhost:8084/actuator/health

# Run with verbose logging
DEBUG=* npm run test:e2e

# Disable data reset if causing issues
E2E_DISABLE_RESET=true npm run test:e2e
```

---

## Migration from Old Scripts

### Removed Scripts

| Old Script | New Alternative |
|------------|-----------------|
| `test-frontend.js` | Use `test-ai-smart.js` or npm scripts |
| `run-e2e.js` | Use `frontend/scripts/run-e2e-tests.js` |
| `run-e2e-ai.js` | Merged into `run-e2e-tests.js` |
| `test:e2e:ai` | Use `npm run test:e2e` |

### Updated Paths

| Old Path | New Path |
|----------|----------|
| `test-runner-fixed.js` | `test-runner.js` |
| `verify-docker.js` | `verify-docker-simple.js` |

---

## See Also

- [SCRIPT_CLEANUP.md](../SCRIPT_CLEANUP.md) - Detailed cleanup report
- [PROJECT_DOCS.md](../../PROJECT_DOCS.md) - Project documentation
- [README.md](../../README.md) - Getting started guide




