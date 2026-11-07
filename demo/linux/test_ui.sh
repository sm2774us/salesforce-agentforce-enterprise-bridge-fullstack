#!/usr/bin/env bash
set -euo pipefail
# Web-console quality gate: typecheck + unit/integration (Vitest) + E2E (Playwright vs the real bridge)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}/frontend"
echo "[INFO] Working directory set to: $(pwd)"
E2E_PORT="${E2E_PORT:-8099}"
if curl -s "http://127.0.0.1:${E2E_PORT}/healthz" >/dev/null 2>&1; then
    echo "[ERROR] Port ${E2E_PORT} already in use; set E2E_PORT to a free port."; exit 1
fi
trap 'rm -rf test-results playwright-report coverage 2>/dev/null || true' EXIT
[ -d node_modules ] || npm ci --no-audit --no-fund
echo "[1/3] Typecheck";            npm run typecheck
echo "[2/3] Unit + integration";   npm test
echo "[3/3] End-to-end (real bridge)"
npx playwright install chromium >/dev/null 2>&1 || true
E2E_PORT="${E2E_PORT}" npm run e2e
echo "[OK] Web console quality gate passed (artifacts purged)."
