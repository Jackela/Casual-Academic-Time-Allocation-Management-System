#!/usr/bin/env bash
set -euo pipefail

echo "[security-audit] root npm audit (high/critical gate)"
if [[ -f package.json ]]; then
  npm audit --audit-level=high --omit=dev --omit=optional
fi

echo "[security-audit] frontend npm audit (high/critical gate)"
npm --prefix frontend audit --audit-level=high --omit=dev --omit=optional
