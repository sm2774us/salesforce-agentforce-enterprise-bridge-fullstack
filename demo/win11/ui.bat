@echo off
setlocal enabledelayedexpansion
REM ====================================================================
REM AI CONTROL TOWER - Web console launcher (Windows 11)
REM   ui.bat          offline in-memory CRM + demo personas (no Salesforce)
REM   ui.bat live     real Salesforce org from .env (BRIDGE_API_KEYS must be set)
REM Idempotent: reuses a running console; rebuilds only if dist is missing / REBUILD=1.
REM ====================================================================
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
pushd "%SCRIPT_DIR%\..\.."
set "PROJECT_ROOT=%CD%"
set "MODE=%1"
if "%MODE%"=="" set "MODE=demo"
if "%BRIDGE_PORT%"=="" set "BRIDGE_PORT=8080"
set "URL=http://localhost:%BRIDGE_PORT%"

echo ====================================================================
echo AI CONTROL TOWER - WEB CONSOLE ^(mode: %MODE%^)
echo ====================================================================
echo [INFO] Working directory set to project root: %PROJECT_ROOT%

where node >nul 2>nul || (echo [ERROR] Node.js 20+ is required & goto :fail)
where bridge >nul 2>nul || (echo [ERROR] 'bridge' not found. Run: make install & goto :fail)

curl -s "%URL%/" 2>nul | findstr /c:"AI Control Tower" >nul 2>&1
if not errorlevel 1 (
    echo [INFO] CONSOLE ALREADY RUNNING at %URL%. Reusing it.
    start "" "%URL%"
    goto :ok
)
curl -s "%URL%/healthz" >nul 2>&1
if not errorlevel 1 (
    echo [ERROR] Port %BRIDGE_PORT% is serving a bridge without the console. Stop it or set BRIDGE_PORT.
    goto :fail
)

if not exist frontend\node_modules (
    pushd frontend & call npm ci --no-audit --no-fund & popd
)
if exist frontend\dist\index.html if not "%REBUILD%"=="1" (
    echo [1/2] BUILD ALREADY DONE: frontend\dist exists.
    goto :serve
)
echo [1/2] Building the web console...
pushd frontend & call npm run build & set "RC=!errorlevel!" & popd
if not "!RC!"=="0" (echo [ERROR] Web console build failed & goto :fail)

:serve
echo [2/2] Starting Bridge on %URL%  ^(Ctrl+C to stop^)
start "" /b cmd /c "timeout /t 3 >nul & start "" %URL%"
if /i "%MODE%"=="live" (
    bridge serve --port %BRIDGE_PORT%
) else (
    bridge serve --port %BRIDGE_PORT% --demo
)
:ok
popd & endlocal & exit /b 0
:fail
popd & endlocal & exit /b 1
