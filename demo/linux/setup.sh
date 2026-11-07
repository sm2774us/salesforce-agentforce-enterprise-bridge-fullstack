#!/usr/bin/env bash
set -euo pipefail

# ====================================================================
# Intelligent Project Root Discovery & Navigation
# ====================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

echo "===================================================================="
echo "SALESFORCE AGENTFORCE ENTERPRISE BRIDGE - ENVIRONMENT SETUP (LINUX)"
echo "===================================================================="
echo "[INFO] Working directory set to project root: ${PROJECT_ROOT}"
echo

# ====================================================================
# Step 1: Install the Application
# ====================================================================
echo "[1/3] Installing application dependencies via make install..."
if ! make install; then
    echo "[ERROR] Installation failed. Please check your python/pip environment."
    exit 1
fi

echo
echo "[1b/3] Preparing the React web console (frontend/)..."
command -v node >/dev/null || { echo "[ERROR] Node.js 20+ is required for the web console"; exit 1; }
hash_file() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
LOCK_HASH="$(hash_file frontend/package-lock.json)"
STAMP="frontend/node_modules/.lock-hash"
if [ -f "${STAMP}" ] && [ "$(cat "${STAMP}")" = "${LOCK_HASH}" ]; then
    echo "[INFO] DEPENDENCIES ALREADY INSTALLED: lockfile unchanged. Skipping npm ci."
else
    (cd frontend && npm ci --no-audit --no-fund) || { echo "[ERROR] npm ci failed."; exit 1; }
    echo "${LOCK_HASH}" > "${STAMP}"
fi
if [ -f frontend/dist/index.html ] && [ "${REBUILD:-0}" != "1" ] && \
   [ -z "$(find frontend/src frontend/index.html frontend/package.json -newer frontend/dist/index.html -print -quit)" ]; then
    echo "[INFO] BUILD ALREADY DONE: frontend/dist is up to date (REBUILD=1 to force)."
else
    (cd frontend && npm run build) || { echo "[ERROR] Web console build failed."; exit 1; }
    echo "[INFO] Web console built: frontend/dist"
fi

echo
echo "===================================================================="
# ====================================================================
# Step 2: Intelligent Pre-Check for Existing Records (Idempotent Guard)
# ====================================================================
echo "[2/3] Checking if demo accounts already exist in Salesforce..."

ACCOUNT_COUNT=$(sf data query --query "SELECT COUNT() FROM Account WHERE Name IN ('Acme Corporation', 'Globex Ltd', 'Initech')" --target-org dev --json | jq -r '.result.totalSize // 0')

if [ "${ACCOUNT_COUNT}" -gt 0 ]; then
    echo
    echo "----------------------------------------------------------"
    echo "[INFO] SEEDING ALREADY DONE: Found ${ACCOUNT_COUNT} existing demo account(s)."
    echo "[INFO] Skipping account seeding to avoid duplicate entries."
    echo "[TIP]  Run ./cleanup.sh first if you want a fresh zero-state setup."
    echo "----------------------------------------------------------"
else
    echo "[INFO] No existing demo accounts found. Seeding sample accounts now..."
    
    NAMES=("Acme Corporation" "Globex Ltd" "Initech")
    NUMBERS=("EXT-Acme-Corporation" "EXT-Globex-Ltd" "EXT-Initech")
    
    for i in "${!NAMES[@]}"; do
        name="${NAMES[$i]}"
        acc_num="${NUMBERS[$i]}"
        echo "Creating account: ${name}"
        sf data create record \
          --sobject Account \
          --values "Name='${name}' AccountNumber='${acc_num}'" \
          --target-org dev
    done
fi

echo
echo "===================================================================="
# ====================================================================
# Step 3: Verify Account Status
# ====================================================================
echo "[3/3] Verifying active account records in Salesforce..."
sf data query --query "SELECT Id, Name, AccountNumber FROM Account WHERE Name IN ('Acme Corporation', 'Globex Ltd', 'Initech')" --target-org dev

echo
echo "===================================================================="
echo "SETUP COMPLETED SUCCESSFULLY"
echo "===================================================================="