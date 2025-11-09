#!/usr/bin/env bash
set -euo pipefail

E2E_BACKEND_MODE=${E2E_BACKEND_MODE:-docker}
E2E_BACKEND_URL=${E2E_BACKEND_URL:-http://127.0.0.1:8084}
E2E_FRONTEND_URL=${E2E_FRONTEND_URL:-http://127.0.0.1:5174}

echo "[e2e] install frontend deps"
npm --prefix frontend ci

echo "[e2e] install playwright browsers"
npm --prefix frontend exec playwright install --with-deps chromium

echo "[e2e] run tests"
E2E_BACKEND_MODE="$E2E_BACKEND_MODE" \
E2E_BACKEND_URL="$E2E_BACKEND_URL" \
E2E_FRONTEND_URL="$E2E_FRONTEND_URL" \
CI=1 node scripts/e2e-runner.js --project=real

