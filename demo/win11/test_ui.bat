@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
pushd "%SCRIPT_DIR%\..\..\frontend"
echo [INFO] Working directory set to: %CD%
if "%E2E_PORT%"=="" set "E2E_PORT=8099"
curl -s "http://127.0.0.1:%E2E_PORT%/healthz" >nul 2>&1
if not errorlevel 1 (echo [ERROR] Port %E2E_PORT% already in use; set E2E_PORT & goto :fail)
if not exist node_modules call npm ci --no-audit --no-fund
echo [1/3] Typecheck
call npm run typecheck || goto :fail
echo [2/3] Unit + integration
call npm test || goto :fail
echo [3/3] End-to-end ^(real bridge^)
call npx playwright install chromium >nul 2>&1
call npm run e2e || goto :fail
echo [OK] Web console quality gate passed ^(artifacts purged^).
set "RC=0" & goto :done
:fail
echo [FAILED] Web console quality gate failed.
set "RC=1"
:done
for %%d in (test-results playwright-report coverage) do if exist %%d rmdir /s /q %%d >nul 2>&1
popd & endlocal & exit /b %RC%
