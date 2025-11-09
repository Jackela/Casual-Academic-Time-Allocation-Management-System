#!/usr/bin/env bash
set -euo pipefail

echo "[backend] install repo tooling deps (npm ci --ignore-scripts)"
if [ -f package.json ]; then
  npm ci --ignore-scripts
fi

echo "[backend] gradle check"
export JWT_SECRET="${JWT_SECRET:-test-secret}"
if [ -x ./gradlew ]; then
  ./gradlew --no-configuration-cache check
else
  gradle --no-configuration-cache check
fi

