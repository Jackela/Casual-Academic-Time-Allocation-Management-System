#!/usr/bin/env bash
# Local CI Runner - Complete CI checks locally
# See openspec/changes/establish-local-ci-parity/ for design documentation

set -euo pipefail

echo "========================================="
echo "Running COMPLETE CI checks locally"
echo "========================================="
echo ""

echo "[1/7] Clean build artifacts..."
./gradlew clean

echo ""
echo "[2/7] Backend unit tests..."
./gradlew test --no-daemon

echo ""
echo "[3/7] Backend integration tests..."
./gradlew integrationTest --no-daemon

echo ""
echo "[4/7] Backend check (includes spotbugs, pmd, etc)..."
./gradlew check --no-daemon

echo ""
echo "[5/7] Frontend lint..."
(
  cd frontend && npm run lint
)

echo ""
echo "[6/7] Frontend tests..."
(
  cd frontend && npm test
)

echo ""
echo "[7/7] Frontend build..."
(
  cd frontend && npm run build
)

echo ""
echo "========================================="
echo "✅ ALL CI checks passed locally!"
echo "You can now push with confidence."
echo "========================================="
