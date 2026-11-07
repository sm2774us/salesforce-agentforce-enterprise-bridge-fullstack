# Salesforce Agentforce Enterprise Bridge - Executive Demonstration Guide

---

## 1) Doc Synopsis

This document provides a streamlined, production-ready operational guide for conducting the Salesforce Agentforce Enterprise Bridge demonstration. It covers the end-to-end command lifecycle—from pre-flight environment checks and zero-state sanitization to automated setup, live workflow execution, audit verification, and direct Salesforce browser inspection.

---

## 2) Table of Contents

- [Windows 11 Demo Instructions](#3-windows-11-demo-instructions)
  - [1. Pre-Flight Environment Check (`check_env.bat`)](#1-pre-flight-environment-check-check_envbat)
  - [2. Zero-State Cleanup (`cleanup.bat`)](#2-zero-state-cleanup-cleanupbat)
  - [3. Environment Setup (`setup.bat`)](#3-environment-setup-setupbat)
  - [4. Live Workflow Execution (`demo.bat`)](#4-live-workflow-execution-demobat)
  - [5. Audit & Verification (`verify.bat`)](#5-audit--verification-verifybat)
  - [6. Browser Inspection (`sf org open`)](#6-browser-inspection-sf-org-open)
- [Linux Demo Instructions](#4-linux-demo-instructions)
  - [1. Pre-Flight Environment Check (`check_env.sh`)](#1-pre-flight-environment-check-check_envsh)
  - [2. Zero-State Cleanup (`cleanup.sh`)](#2-zero-state-cleanup-cleanupsh)
  - [3. Environment Setup (`setup.sh`)](#3-environment-setup-setupsh)
  - [4. Live Workflow Execution (`demo.sh`)](#4-live-workflow-execution-demosh)
  - [5. Audit & Verification (`verify.sh`)](#5-audit--verification-verifysh)
  - [6. Browser Inspection (`sf org open`)](#6-browser-inspection-sf-org-open-1)
- [Full-stack (Web Console) Additions](#full-stack-web-console-additions)
- [Conclusion](#5-conclusion)

---

## 3) Windows 11 Demo Instructions

All Windows commands are executed from the project root within the `demo\win11\` directory.

### 1. Pre-Flight Environment Check (`check_env.bat`)
- **Summary**: Validates `.env` variables, verifies private key existence, generates an RSA256-signed JWT assertion via Python, and tests the OAuth2 token handshake against Salesforce.
- **Command**:
  ```cmd
  cd demo\win11
  call check_env.bat
  ```

### 2. Zero-State Cleanup (`cleanup.bat`)
- **Summary**: Scans Salesforce for lingering test cases and demo accounts, exports them via bulk API, purges them with built-in database lock synchronization, and confirms pristine zero state.
- **Command**:
  ```cmd
  call cleanup.bat
  ```

### 3. Environment Setup (`setup.bat`)
- **Summary**: Initializes base accounts (`Acme Corporation`, `Globex Ltd`, `Initech`) and seeds required pre-requisites in Salesforce.
- **Command**:
  ```cmd
  call setup.bat
  ```

### 4. Live Workflow Execution (`demo.bat`)
- **Summary**: Boots the Enterprise Bridge server locally, triggers agentic workflows, and submits live telemetry and financial review cases into Salesforce.
- **Command**:
  ```cmd
  call demo.bat
  ```

### 5. Audit & Verification (`verify.bat`)
- **Summary**: Inspects bridge server runtime health (`/healthz`), audits JSON logs/metrics, queries Salesforce for live generated cases, and validates the full execution lifecycle.
- **Command**:
  ```cmd
  call verify.bat
  ```

### 6. Browser Inspection (`sf org open`)
- **Summary**: Directly opens the active Salesforce developer org in your default web browser to the Recent Cases list view to visually inspect generated records.
- **Command**:
  ```cmd
  sf org open --target-org dev --path "lightning/o/Case/list?filterName=Recent"
  ```
- **Browser Instructions**: 
  1. Once the Salesforce Lightning interface opens in your browser, click on any of the newly created records (such as `Financial review...` or `Invoice mismatch...`).
  2. Inspect the **Subject**, **Status**, **Priority**, and **Description** fields to verify automated bridge ingestion and Agentforce guardrail compliance.

[Back to Table of Contents](#2-table-of-contents)

---

## 4) Linux Demo Instructions

All Linux commands are executed from the project root within the `demo/linux/` directory.

### 1. Pre-Flight Environment Check (`check_env.sh`)
- **Summary**: Validates `.env` variables, verifies private key existence, generates an RSA256-signed JWT assertion via Python, and tests the OAuth2 token handshake against Salesforce.
- **Command**:
  ```bash
  cd demo/linux
  ./check_env.sh
  ```

### 2. Zero-State Cleanup (`cleanup.sh`)
- **Summary**: Scans Salesforce for lingering test cases and demo accounts, exports them via bulk API, purges them with built-in database lock synchronization, and confirms pristine zero state.
- **Command**:
  ```bash
  ./cleanup.sh
  ```

### 3. Environment Setup (`setup.sh`)
- **Summary**: Initializes base accounts (`Acme Corporation`, `Globex Ltd`, `Initech`) and seeds required pre-requisites in Salesforce.
- **Command**:
  ```bash
  ./setup.sh
  ```

### 4. Live Workflow Execution (`demo.sh`)
- **Summary**: Boots the Enterprise Bridge server locally, triggers agentic workflows, and submits live telemetry and financial review cases into Salesforce.
- **Command**:
  ```bash
  ./demo.sh
  ```

### 5. Audit & Verification (`verify.sh`)
- **Summary**: Inspects bridge server runtime health (`/healthz`), audits JSON logs/metrics, queries Salesforce for live generated cases, and validates the full execution lifecycle.
- **Command**:
  ```bash
  ./verify.sh
  ```

### 6. Browser Inspection (`sf org open`)
- **Summary**: Directly opens the active Salesforce developer org in your default web browser to the Recent Cases list view to visually inspect generated records.
- **Command**:
  ```bash
  sf org open --target-org dev --path "lightning/o/Case/list?filterName=Recent"
  ```
- **Browser Instructions**: 
  1. Once the Salesforce Lightning interface opens in your browser, click on any of the newly created records (such as `Financial review...` or `Invoice mismatch...`).
  2. Inspect the **Subject**, **Status**, **Priority**, and **Description** fields to verify automated bridge ingestion and Agentforce guardrail compliance.

[Back to Table of Contents](#2-table-of-contents)

---

## Full-stack (Web Console) Additions

The same `demo/linux` and `demo/win11` scripts now run the **full stack** (React console + bridge + Salesforce). Sequence is unchanged:
`check_env` → `cleanup` → `setup` → `demo` → `verify`.

| Script | Full-stack addition |
|---|---|
| `check_env` | Also verifies Node 20+, npm, `bridge` CLI and whether `frontend/dist` is built |
| `cleanup` | Unchanged (Salesforce zero-state). Linux shebang typo fixed (`#!/usr/bin/env bash`) |
| `setup` | Also runs `npm ci && npm run build` in `frontend/` |
| `demo` | Launches the bridge with **four personas**, opens the console at http://localhost:8080, **pauses** so you can present the UI, then runs the live CLI + Salesforce evidence flow. `DEMO_PAUSE=0` skips pauses |
| `verify` | Also checks the console is served and `/v1/overview`, `/v1/feed`, `/v1/accounts` respond |
| `ui` | Offline (no Salesforce) console: `ui.sh` / `ui.bat` (`live` arg = real org, `dev` = hot reload) |
| `test_ui` | Quality gate: typecheck + Vitest + Playwright E2E against the real bridge |

Persona keys: `agent-key` (AGENT) · `approver-key` (APPROVER) · `viewer-key` (VIEWER) · `admin-key` (ADMIN).

### Suggested 6-minute presentation (live org)
1. `check_env` → `cleanup` → `setup` (before the meeting).
2. Run `demo`; when the console opens, sign in via the **agent-svc** persona chip.
3. **Demo Runbook**: run *PII outage*, *alias*, *$25k invoice*. Show redaction (Event Stream) and unified aliases (Accounts 360).
4. Switch persona to **jane** (top bar) → approve in **Approvals** (or runbook step 5). Open **Salesforce** page, then the real org via `sf org open`.
5. Run *policy probe* + *schema drift*; show **Audit Trail** and DLQ on Mission control; press Enter in the terminal for the CLI evidence flow.
6. `verify`.

Offline fallback (no network / org): `ui.sh` or `ui.bat` and the same Runbook.

[Back to Table of Contents](#2-table-of-contents)

---

## 5) Conclusion

By following this structured operational sequence across Windows 11 or Linux, the Salesforce Agentforce Enterprise Bridge — now with its React control-tower console — is validated from environment pre-flights to live agentic execution, UI walkthrough and browser audit inspection.
