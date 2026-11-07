#!/usr/bin/env bash
set -euo pipefail
# ====================================================================
# AI CONTROL TOWER - Web console launcher (Linux / macOS)
#   ./ui.sh          offline in-memory CRM + demo personas (no Salesforce, no side effects)
#   ./ui.sh live     real Salesforce org from .env (BRIDGE_API_KEYS must be set)
#   ./ui.sh dev      Vite hot-reload on :5173 (proxy -> bridge)
# Idempotent: reuses a console that is already running; rebuilds only when sources changed.
# ====================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"
MODE="${1:-demo}"
PORT="${BRIDGE_PORT:-8080}"
URL="http://localhost:${PORT}"
BRIDGE_PID=""
trap '[ -n "${BRIDGE_PID}" ] && kill "${BRIDGE_PID}" 2>/dev/null || true' EXIT

echo "===================================================================="
echo "AI CONTROL TOWER - WEB CONSOLE (mode: ${MODE})"
echo "===================================================================="
echo "[INFO] Working directory set to project root: ${PROJECT_ROOT}"

command -v node >/dev/null || { echo "[ERROR] Node.js 20+ is required (https://nodejs.org)"; exit 1; }
command -v bridge >/dev/null || { echo "[ERROR] 'bridge' not found. Run: make install"; exit 1; }
if [ "${MODE}" = "live" ] && [ -z "${BRIDGE_API_KEYS:-}" ] && ! grep -q "^BRIDGE_API_KEYS=" .env 2>/dev/null; then
    echo "[ERROR] live mode needs BRIDGE_API_KEYS (env or .env). Use demo mode or run ./demo.sh"; exit 1
fi

if curl -s "${URL}/" 2>/dev/null | grep -q "AI Control Tower"; then
    echo "[INFO] CONSOLE ALREADY RUNNING at ${URL}. Reusing it."
    ( xdg-open "${URL}" || open "${URL}" ) >/dev/null 2>&1 || true
    exit 0
fi
if curl -s "${URL}/healthz" >/dev/null 2>&1; then
    echo "[ERROR] Port ${PORT} is serving a bridge without the console. Stop it, or set BRIDGE_PORT."; exit 1
fi

[ -d frontend/node_modules ] || (cd frontend && npm ci --no-audit --no-fund)
if [ ! -f frontend/dist/index.html ] || [ "${REBUILD:-0}" = "1" ] || \
   [ -n "$(find frontend/src frontend/index.html -newer frontend/dist/index.html -print -quit 2>/dev/null)" ]; then
    echo "[1/2] Building the web console..."
    (cd frontend && npm run build) || { echo "[ERROR] Web console build failed."; exit 1; }
else
    echo "[1/2] BUILD ALREADY DONE: frontend/dist is up to date."
fi

echo "[2/2] Starting Bridge on ${URL}"
ARGS=(serve --port "${PORT}"); [ "${MODE}" = "live" ] || ARGS+=(--demo)
( sleep 3; ( xdg-open "${URL}" || open "${URL}" ) >/dev/null 2>&1 || true ) &
if [ "${MODE}" = "dev" ]; then
    bridge "${ARGS[@]}" & BRIDGE_PID=$!
    cd frontend && VITE_PROXY_TARGET="http://127.0.0.1:${PORT}" npm run dev
else
    bridge "${ARGS[@]}" & BRIDGE_PID=$!
    echo "[INFO] Press Ctrl+C to stop."; wait "${BRIDGE_PID}"
fi
