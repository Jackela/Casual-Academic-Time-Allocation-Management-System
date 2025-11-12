#!/usr/bin/env bash
set -euo pipefail

E2E_BACKEND_MODE=${E2E_BACKEND_MODE:-docker}
E2E_BACKEND_URL=${E2E_BACKEND_URL:-http://127.0.0.1:8084}
E2E_FRONTEND_URL=${E2E_FRONTEND_URL:-http://127.0.0.1:5174}

if [[ -z "${E2E_BACKEND_PORT:-}" ]]; then
  if ! command -v node >/dev/null 2>&1; then
    echo "node is required to derive E2E_BACKEND_PORT from E2E_BACKEND_URL" >&2
    exit 1
  fi
  E2E_BACKEND_PORT=$(node -e 'const raw = process.argv[1]; try { const url = new URL(raw); if (!url.port) { throw new Error("missing port in E2E_BACKEND_URL"); } process.stdout.write(url.port); } catch (error) { console.error(error.message); process.exit(1); }' "$E2E_BACKEND_URL")
fi
export E2E_BACKEND_PORT
export API_PORT=${API_PORT:-$E2E_BACKEND_PORT}

echo "[e2e] install frontend deps"
npm --prefix frontend ci

echo "[e2e] install playwright browsers"
npm --prefix frontend exec playwright install --with-deps chromium
echo "[e2e] ensure host dependencies are installed"
npm --prefix frontend exec playwright install-deps

echo "[e2e] run tests"
E2E_BACKEND_MODE="$E2E_BACKEND_MODE" \
E2E_BACKEND_URL="$E2E_BACKEND_URL" \
E2E_FRONTEND_URL="$E2E_FRONTEND_URL" \
VITE_E2E_DISABLE_LECTURER_MODAL="true" \
CI=1 node scripts/e2e-runner.js --project=real
