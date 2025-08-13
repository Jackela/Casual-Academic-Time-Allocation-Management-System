@echo off
REM Session-level test runner with comprehensive cleanup for Windows
REM Ensures all processes are cleaned up after test execution

setlocal enabledelayedexpansion

echo Starting test execution with cleanup...

REM Get project root directory
set "SCRIPT_DIR=%~dp0"
for %%i in ("%SCRIPT_DIR%..") do set "PROJECT_ROOT=%%~fi"
set "PROJECT_NAME="
for %%i in ("%PROJECT_ROOT%") do set "PROJECT_NAME=%%~ni"

echo Project: %PROJECT_NAME%
echo Root: %PROJECT_ROOT%

REM Pre-flight cleanup
echo Running pre-flight cleanup...

REM Kill Node.js processes in project directory
for /f "tokens=2" %%i in ('tasklist /fo csv /fi "imagename eq node.exe" ^| findstr /v "ImageName"') do (
    set "pid=%%i"
    set "pid=!pid:"=!"
    
    REM Get process command line to check if it matches our project
    for /f "tokens=*" %%j in ('wmic process where "ProcessId=!pid!" get CommandLine /format:value 2^>nul ^| findstr "CommandLine="') do (
        set "cmdline=%%j"
        set "cmdline=!cmdline:CommandLine=!"
        echo !cmdline! | findstr /i "%PROJECT_NAME%" >nul
        if !errorlevel! equ 0 (
            echo Killing Node.js process !pid! (project related^)
            taskkill /pid !pid! /t /f >nul 2>&1
        )
    )
)

REM Clean up common development ports
for %%p in (3000 3001 4000 5000 8000 8080 9229) do (
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":%%p "') do (
        set "pid=%%i"
        if not "!pid!"=="" (
            echo Killing process using port %%p (PID: !pid!^)
            taskkill /pid !pid! /t /f >nul 2>&1
        )
    )
)

REM Wait for cleanup to complete
timeout /t 2 /nobreak >nul

REM Set environment variables for optimal testing
set UV_THREADPOOL_SIZE=8
set NODE_ENV=test
set CI=true

REM Change to project directory
cd /d "%PROJECT_ROOT%"

echo Running tests...

REM Determine test command based on arguments
if "%~1"=="" (
    REM Default: run all tests
    call npm run test:ci
) else (
    if "%~1"=="unit" (
        call npm run test:unit
    ) else if "%~1"=="component" (
        call npm run test:component
    ) else if "%~1"=="e2e" (
        call npm run test:e2e
    ) else if "%~1"=="coverage" (
        call npm run test:coverage
    ) else (
        REM Pass through custom command
        call npm run %*
    )
)

set "TEST_EXIT_CODE=%ERRORLEVEL%"

echo Performing final cleanup...

REM Final cleanup - Kill any remaining project-related processes
for /f "tokens=2" %%i in ('tasklist /fo csv /fi "imagename eq node.exe" ^| findstr /v "ImageName"') do (
    set "pid=%%i"
    set "pid=!pid:"=!"
    
    for /f "tokens=*" %%j in ('wmic process where "ProcessId=!pid!" get CommandLine /format:value 2^>nul ^| findstr "CommandLine="') do (
        set "cmdline=%%j"
        set "cmdline=!cmdline:CommandLine=!"
        echo !cmdline! | findstr /i "%PROJECT_NAME%" >nul
        if !errorlevel! equ 0 (
            echo Final cleanup: Killing Node.js process !pid!
            taskkill /pid !pid! /t /f >nul 2>&1
        )
    )
)

REM Clean up ports again
for %%p in (3000 3001 4000 5000 8000 8080 9229) do (
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":%%p "') do (
        set "pid=%%i"
        if not "!pid!"=="" (
            echo Final cleanup: Killing process using port %%p (PID: !pid!^)
            taskkill /pid !pid! /t /f >nul 2>&1
        )
    )
)

if %TEST_EXIT_CODE% equ 0 (
    echo Tests completed successfully!
) else (
    echo Tests failed with exit code %TEST_EXIT_CODE%
)

echo Cleanup completed.
exit /b %TEST_EXIT_CODE%