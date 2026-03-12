#!/usr/bin/env bash
set -euo pipefail

echo "[frontend-unit] install"
if [ -d frontend ]; then
  is_windows_shell=0
  case "${OSTYPE:-}" in
    msys*|cygwin*|win32*) is_windows_shell=1 ;;
  esac

  needs_install=0
  if [ ! -d frontend/node_modules ]; then
    needs_install=1
  elif [ "$is_windows_shell" -eq 1 ] && [ ! -f frontend/node_modules/.bin/vitest.cmd ]; then
    needs_install=1
  elif [ "$is_windows_shell" -eq 0 ] && [ ! -x frontend/node_modules/.bin/vitest ]; then
    needs_install=1
  fi

  if [ "$needs_install" -eq 1 ]; then
    npm --prefix frontend ci
  else
    echo "[frontend-unit] node_modules and vitest binary present, skip reinstall"
  fi
fi

echo "[frontend-unit] tests"
# Run from frontend workspace so lint + Vitest both use project config.
(
  cd frontend
  CI=1 NODE_ENV=test npm run lint
  CI=1 NODE_ENV=test npm exec -- vitest run --run
)
