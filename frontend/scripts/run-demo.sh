#!/bin/bash
# Presentation Demo Launcher
# Run individual demo scripts with visual enhancements

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$FRONTEND_DIR"

DEMO=${1:-"all"}

echo "🎬 CATAMS Presentation Demo Launcher"
echo "===================================="
echo ""

case "$DEMO" in
  "00" | "bootstrap" | "boot" )
    echo "▶️  Bootstrapping demo environment (Docker + health + Grand Tour)"
    echo "ℹ️  Starting Docker services (api, db)..."
    docker compose up -d

    echo "⏱️  Checking backend health at http://localhost:8080/actuator/health ..."
    ATTEMPTS=0
    until curl -fsS http://localhost:8080/actuator/health >/dev/null 2>&1; do
      ATTEMPTS=$((ATTEMPTS+1))
      if [ $ATTEMPTS -ge 10 ]; then
        echo "❌ Backend health check failed after $ATTEMPTS attempts"
        exit 1
      fi
      sleep 2
    done
    echo "✅ Backend is healthy"

    echo "🚀 Launching Grand Tour Demo..."
    npx playwright test e2e/real/presentation/presentation_grand_tour.spec.ts --project=real --headed --config=playwright.presentation.config.ts --reporter=line
    ;;

  "01" | "demo01" | "happy")
    echo "▶️  Running Demo 01: Happy Path Four-Level Approval"
    npx playwright test e2e/real/presentation/presentation_demo_01_happy_path.spec.ts --project=real --headed --config=playwright.presentation.config.ts --reporter=line
    ;;
  
  "02" | "demo02" | "rejection")
    echo "▶️  Running Demo 02: Rejection Path and Constraint Validation"
    npx playwright test e2e/real/presentation/presentation_demo_02_rejection_path.spec.ts --project=real --headed --config=playwright.presentation.config.ts --reporter=line
    ;;
  
  "03" | "demo03" | "billing" | "ea")
    echo "▶️  Running Demo 03: EA Billing Compliance"
    npx playwright test e2e/real/presentation/presentation_demo_03_ea_billing.spec.ts --project=real --headed --config=playwright.presentation.config.ts --reporter=line
    ;;
  
  "04" | "demo04" | "admin" | "users")
    echo "▶️  Running Demo 04: Admin User Management"
    npx playwright test e2e/real/presentation/presentation_demo_04_admin_user_mgmt.spec.ts --project=real --headed --config=playwright.presentation.config.ts --reporter=line
    ;;

  "grand-tour" | "grand" | "tour")
    echo "▶️  Running Grand Tour: Cinematic end-to-end presentation"
    npx playwright test e2e/real/presentation/presentation_grand_tour.spec.ts --project=real --headed --config=playwright.presentation.config.ts --reporter=line
    ;;
  
  "all")
    echo "▶️  Running all presentation demos sequentially..."
    npx playwright test e2e/real/presentation/ --project=real --headed --config=playwright.presentation.config.ts --reporter=line
    ;;
  
  *)
    echo "❌ Unknown demo: $DEMO"
    echo ""
    echo "Usage: bash scripts/run-demo.sh [demo]"
    echo ""
    echo "Available demos:"
    echo "  01, demo01, happy      - Happy Path Four-Level Approval"
    echo "  02, demo02, rejection  - Rejection Path and Constraints"
    echo "  03, demo03, billing    - EA Billing Compliance"
    echo "  04, demo04, admin      - Admin User Management"
    echo "  grand-tour             - Full cinematic journey"
    echo "  all                    - Run all demos (default)"
    exit 1
    ;;
esac

echo ""
echo "✅ Demo completed!"
