#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Cleaning repository generated artifacts..."

paths=(
  "${ROOT_DIR}/build"
  "${ROOT_DIR}/.gradle"
  "${ROOT_DIR}/test-results"
  "${ROOT_DIR}/artifacts"
  "${ROOT_DIR}/logs"
  "${ROOT_DIR}/frontend/dist"
  "${ROOT_DIR}/frontend/coverage"
  "${ROOT_DIR}/frontend/playwright-report"
  "${ROOT_DIR}/frontend/playwright-screenshots"
  "${ROOT_DIR}/frontend/test-results"
  "${ROOT_DIR}/frontend/trace-inspect"
  "${ROOT_DIR}/frontend/.vite"
  "${ROOT_DIR}/frontend/src/contracts/generated"
)

for p in "${paths[@]}"; do
  if [ -e "$p" ]; then
    echo " - rm -rf $p"
    rm -rf "$p"
  fi
done

echo "Done."

