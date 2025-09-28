@echo off
cd /d "%~dp0\.."

if "%1"=="unit" (
    echo 🚀 [AI-TEST] Running Unit Tests
    npm run test:unit
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Unit Tests passed
    ) else (
        echo ❌ Unit Tests failed
        exit /b 1
    )
) else if "%1"=="component" (
    echo 🚀 [AI-TEST] Running Component Tests
    npm run test:component
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Component Tests passed
    ) else (
        echo ❌ Component Tests failed
        exit /b 1
    )
) else if "%1"=="fast" (
    echo 🚀 [AI-TEST] Running Fast Tests (No Backend)
    echo 📋 Running Unit Tests...
    npm run test:unit
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Unit Tests failed
        exit /b 1
    )
    echo ✅ Unit Tests passed
    echo 📋 Running Component Tests...
    npm run test:component
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Component Tests failed
        exit /b 1
    )
    echo ✅ Component Tests passed
    echo ✅ All fast tests passed!
) else (
    echo Usage: test-ai-runner.cmd [unit^|component^|fast]
    exit /b 1
)