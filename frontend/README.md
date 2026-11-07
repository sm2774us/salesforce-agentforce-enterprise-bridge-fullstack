# AI Control Tower — Web Console

React 19 + TypeScript + Vite · Tailwind 4 · Radix primitives (shadcn-style) · TanStack Query / Table / Router · Motion · Zustand.

## Run
    make ui                      # build + serve offline demo at http://localhost:8080
    ./demo/linux/ui.sh [live|dev]   |   demo\win11\ui.bat [live]
    cd frontend && npm run dev   # hot reload on :5173 (proxies /v1 to :8080)

Demo personas (keys): `agent-key` AGENT · `approver-key` APPROVER · `viewer-key` VIEWER · `admin-key` ADMIN.
Disable the persona chips in production builds with `VITE_DEMO_PERSONAS=false`; point at a remote bridge with `VITE_API_URL`
(and set `BRIDGE_CORS_ORIGINS` on the server).

## Screens
Mission control (live KPIs, governed pipeline, decision mix, health) · Event stream (PII-redaction forensics + simulator) ·
Approvals (human-in-the-loop, countdown, separation of duties) · Action catalog (schema-generated invoke forms) ·
Accounts 360 (entity resolution) · Audit trail · Salesforce cases · Demo runbook · ⌘K command palette · persona switcher.

## Tests
    npm test        # Vitest unit + integration (RTL + MSW), coverage thresholds enforced
    npm run e2e     # Playwright against the REAL bridge (builds UI, boots `bridge serve --demo`)

## Backend delta (all covered, backend remains at 100%)
`GET /v1/whoami|overview|feed|accounts|dlq|cases`, approval `risk/expires_in_s/event_id`, CORS (`BRIDGE_CORS_ORIGINS`),
static UI mount (`BRIDGE_UI_DIR`, auto-detects `frontend/dist`), `bridge serve --demo`.
