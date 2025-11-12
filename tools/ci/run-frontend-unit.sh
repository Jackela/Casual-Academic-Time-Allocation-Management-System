#!/usr/bin/env bash
set -euo pipefail

echo "[frontend-unit] install"
if [ -d frontend ]; then
  npm --prefix frontend ci
fi

echo "[frontend-unit] tests"
CI=1 NODE_ENV=test npm --prefix frontend run test:unit

