@echo off
REM Presentation Demo Launcher for Windows
REM Run individual demo scripts with visual enhancements

setlocal

set DEMO=%1
if "%DEMO%"=="" set DEMO=all

echo 🎬 CATAMS Presentation Demo Launcher
echo ====================================
echo.

if "%DEMO%"=="01" goto demo01
if "%DEMO%"=="demo01" goto demo01
if "%DEMO%"=="happy" goto demo01

if "%DEMO%"=="02" goto demo02
if "%DEMO%"=="demo02" goto demo02
if "%DEMO%"=="rejection" goto demo02

if "%DEMO%"=="03" goto demo03
if "%DEMO%"=="demo03" goto demo03
if "%DEMO%"=="billing" goto demo03
if "%DEMO%"=="ea" goto demo03

if "%DEMO%"=="04" goto demo04
if "%DEMO%"=="demo04" goto demo04
if "%DEMO%"=="admin" goto demo04
if "%DEMO%"=="users" goto demo04

if "%DEMO%"=="00" goto bootstrap
if "%DEMO%"=="bootstrap" goto bootstrap
if "%DEMO%"=="boot" goto bootstrap

if "%DEMO%"=="grand-tour" goto grand
if "%DEMO%"=="grand" goto grand
if "%DEMO%"=="tour" goto grand

if "%DEMO%"=="all" goto all

echo ❌ Unknown demo: %DEMO%
echo.
echo Usage: scripts\run-demo.bat [demo]
echo.
echo Available demos:
echo   01, demo01, happy      - Happy Path Four-Level Approval
echo   02, demo02, rejection  - Rejection Path and Constraints
echo   03, demo03, billing    - EA Billing Compliance
echo   04, demo04, admin      - Admin User Management
echo   00, bootstrap, boot    - Bootstrap environment (Docker + health + Grand Tour)
echo   grand-tour             - Full cinematic journey
echo   all                    - Run all demos (default)
exit /b 1

:demo01
echo ▶️  Running Demo 01: Happy Path Four-Level Approval
npx playwright test e2e/real/presentation/presentation_demo_01_happy_path.spec.ts --project=real --headed --config=playwright.presentation.config.ts --reporter=line
goto end

:demo02
echo ▶️  Running Demo 02: Rejection Path and Constraint Validation
npx playwright test e2e/real/presentation/presentation_demo_02_rejection_path.spec.ts --project=real --headed --config=playwright.presentation.config.ts --reporter=line
goto end

:demo03
echo ▶️  Running Demo 03: EA Billing Compliance
npx playwright test e2e/real/presentation/presentation_demo_03_ea_billing.spec.ts --project=real --headed --config=playwright.presentation.config.ts --reporter=line
goto end

:demo04
echo ▶️  Running Demo 04: Admin User Management
npx playwright test e2e/real/presentation/presentation_demo_04_admin_user_mgmt.spec.ts --project=real --headed --config=playwright.presentation.config.ts --reporter=line
goto end

:bootstrap
echo ▶️  Bootstrapping demo environment (Docker + health + Grand Tour)
echo ℹ️  Starting Docker services (api, db)...
docker compose up -d

echo ⏱️  Checking backend health at http://localhost:8080/actuator/health ...
set ATTEMPTS=0
:healthloop
curl -fsS http://localhost:8080/actuator/health >nul 2>&1
if %errorlevel%==0 goto healthok
set /a ATTEMPTS+=1
if %ATTEMPTS% geq 10 (
    echo ❌ Backend health check failed after %ATTEMPTS% attempts
    exit /b 1
)
timeout /t 2 >nul
goto healthloop
:healthok
echo ✅ Backend is healthy

echo 🚀 Launching Grand Tour Demo...
npx playwright test e2e/real/presentation/presentation_grand_tour.spec.ts --project=real --headed --config=playwright.presentation.config.ts --reporter=line
goto end

:grand
echo ▶️  Running Grand Tour: Cinematic end-to-end presentation
npx playwright test e2e/real/presentation/presentation_grand_tour.spec.ts --project=real --headed --config=playwright.presentation.config.ts --reporter=line
goto end

:all
echo ▶️  Running all presentation demos sequentially...
npx playwright test e2e/real/presentation/ --project=real --headed --config=playwright.presentation.config.ts --reporter=line
goto end

:end
echo.
echo ✅ Demo completed!
endlocal
