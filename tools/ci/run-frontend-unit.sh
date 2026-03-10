#!/usr/bin/env bash
set -euo pipefail

echo "[frontend-unit] install"
if [ -d frontend ]; then
  if [ -d frontend/node_modules ]; then
    echo "[frontend-unit] node_modules exists, skip reinstall"
  else
    npm --prefix frontend ci
  fi
fi

echo "[frontend-unit] tests"
CI=1 NODE_ENV=test npm --prefix frontend run test
