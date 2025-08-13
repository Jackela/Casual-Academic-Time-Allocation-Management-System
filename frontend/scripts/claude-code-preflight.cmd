@echo off
REM Claude Code pre-flight cleanup script for Windows
REM Ensures clean environment before Claude Code operations

setlocal enabledelayedexpansion

echo Claude Code Pre-flight Cleanup
echo.

REM Get project root directory
set "SCRIPT_DIR=%~dp0"
for %%i in ("%SCRIPT_DIR%..") do set "PROJECT_ROOT=%%~fi"
set "PROJECT_NAME="
for %%i in ("%PROJECT_ROOT%") do set "PROJECT_NAME=%%~ni"

echo Project: %PROJECT_NAME%
echo Root: %PROJECT_ROOT%
echo.

echo 1. Cleaning up Node.js processes...

REM Kill Node.js processes related to this project
set "KILLED_COUNT=0"
for /f "tokens=2" %%i in ('tasklist /fo csv /fi "imagename eq node.exe" 2^>nul ^| findstr /v "ImageName"') do (
    set "pid=%%i"
    set "pid=!pid:"=!"
    
    REM Get process command line
    for /f "tokens=*" %%j in ('wmic process where "ProcessId=!pid!" get CommandLine /format:value 2^>nul ^| findstr "CommandLine=" 2^>nul') do (
        set "cmdline=%%j"
        set "cmdline=!cmdline:CommandLine=!"
        echo !cmdline! | findstr /i "%PROJECT_NAME%" >nul 2>&1
        if !errorlevel! equ 0 (
            echo   Killing Node.js process !pid! (project related^)
            taskkill /pid !pid! /t /f >nul 2>&1
            set /a KILLED_COUNT+=1
        )
    )
)

if !KILLED_COUNT! gtr 0 (
    echo   Killed !KILLED_COUNT! processes
) else (
    echo   No matching processes found
)

echo.
echo 2. Cleaning up development servers...

REM Kill common development server processes
for %%proc in (vite webpack next nuxt) do (
    set "proc_killed=0"
    for /f "tokens=2" %%i in ('tasklist /fo csv /fi "imagename eq %%proc.exe" 2^>nul ^| findstr /v "ImageName"') do (
        set "pid=%%i"
        set "pid=!pid:"=!"
        echo   Killing %%proc process !pid!
        taskkill /pid !pid! /t /f >nul 2>&1
        set "proc_killed=1"
    )
    if !proc_killed! equ 0 (
        echo   No %%proc processes found
    )
)

echo.
echo 3. Cleaning up test runners...

for %%proc in (vitest jest) do (
    set "proc_killed=0"
    for /f "tokens=2" %%i in ('tasklist /fo csv /fi "imagename eq %%proc.exe" 2^>nul ^| findstr /v "ImageName"') do (
        set "pid=%%i"
        set "pid=!pid:"=!"
        echo   Killing %%proc process !pid!
        taskkill /pid !pid! /t /f >nul 2>&1
        set "proc_killed=1"
    )
    if !proc_killed! equ 0 (
        echo   No %%proc processes found
    )
)

echo.
echo 4. Cleaning up common development ports...

for %%port in (3000 3001 4000 5000 8000 8080 9229) do (
    set "port_cleaned=0"
    for /f "tokens=5" %%i in ('netstat -ano 2^>nul ^| findstr ":%%port "') do (
        set "pid=%%i"
        if not "!pid!"=="" (
            echo   Port %%port is in use by PID !pid!, cleaning up...
            taskkill /pid !pid! /t /f >nul 2>&1
            set "port_cleaned=1"
        )
    )
    if !port_cleaned! equ 0 (
        echo   Port %%port is free
    ) else (
        echo   Port %%port cleaned up
    )
)

echo.
echo 5. Cleaning up temporary files and directories...

REM Clean up common temporary directories
for %%dir in (.vite dist build .next .nuxt) do (
    if exist "%PROJECT_ROOT%\%%dir" (
        echo   Removing %%dir
        rmdir /s /q "%PROJECT_ROOT%\%%dir" >nul 2>&1
    )
)

REM Clean up node_modules cache
if exist "%PROJECT_ROOT%\node_modules\.cache" (
    echo   Removing node_modules\.cache
    rmdir /s /q "%PROJECT_ROOT%\node_modules\.cache" >nul 2>&1
)

REM Clean up test artifacts
for %%item in (coverage test-results playwright-report *.log) do (
    if exist "%PROJECT_ROOT%\%%item" (
        echo   Removing %%item
        if exist "%PROJECT_ROOT%\%%item\*" (
            rmdir /s /q "%PROJECT_ROOT%\%%item" >nul 2>&1
        ) else (
            del /q "%PROJECT_ROOT%\%%item" >nul 2>&1
        )
    )
)

echo   Temporary files cleaned

echo.
echo 6. Final system check...

REM Check for remaining Node processes
set "REMAINING_PROCESSES=0"
for /f "tokens=2" %%i in ('tasklist /fo csv /fi "imagename eq node.exe" 2^>nul ^| findstr /v "ImageName"') do (
    set "pid=%%i"
    set "pid=!pid:"=!"
    
    for /f "tokens=*" %%j in ('wmic process where "ProcessId=!pid!" get CommandLine /format:value 2^>nul ^| findstr "CommandLine=" 2^>nul') do (
        set "cmdline=%%j"
        set "cmdline=!cmdline:CommandLine=!"
        echo !cmdline! | findstr /i "%PROJECT_NAME%" >nul 2>&1
        if !errorlevel! equ 0 (
            set /a REMAINING_PROCESSES+=1
            if !REMAINING_PROCESSES! leq 5 (
                echo     PID !pid!: !cmdline!
            )
        )
    )
)

if !REMAINING_PROCESSES! gtr 0 (
    echo   Warning: !REMAINING_PROCESSES! Node.js processes still running
) else (
    echo   No Node.js processes detected
)

REM Check occupied ports
set "OCCUPIED_PORTS="
for %%port in (3000 3001 4000 5000 8000 8080 9229) do (
    netstat -an 2>nul | findstr ":%%port " >nul 2>&1
    if !errorlevel! equ 0 (
        set "OCCUPIED_PORTS=!OCCUPIED_PORTS! %%port"
    )
)

if not "!OCCUPIED_PORTS!"=="" (
    echo   Warning: Ports still occupied:!OCCUPIED_PORTS!
) else (
    echo   All common ports are free
)

echo.
echo ✅ Pre-flight cleanup completed!
echo Environment is ready for Claude Code operations.

REM Optional: Wait for user confirmation
if "%~1"=="--wait" (
    echo.
    pause
)