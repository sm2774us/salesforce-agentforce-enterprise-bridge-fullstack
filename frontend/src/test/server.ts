import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type {
  AccountSummary, ActionManifest, Approval, AuditRecord, FeedItem, Overview, Role, SfCase, Whoami,
} from "@/lib/types";

const B = "http://api.test";

export const KEYS: Record<string, Whoami> = {
  "agent-key": { name: "agent-svc", role: "AGENT", permissions: ["action:create_case", "action:create_financial_review", "action:escalate_case", "events:read", "events:write"] },
  "approver-key": { name: "jane", role: "APPROVER", permissions: ["approvals:decide", "events:read"] },
  "viewer-key": { name: "vic", role: "VIEWER", permissions: ["events:read"] },
};
export const roleOf = (r: Role) => Object.values(KEYS).find((u) => u.role === r)!;

export const overview: Overview = {
  version: "1.0.1", mode: "offline-in-memory", planner: "RuleBasedPlanner", financial_threshold_usd: 10000,
  bus: { running: true, dlq: 1 }, audit_pending_sync: 0, pending_approvals: 1, salesforce_circuit: "n/a",
  counters: { events_processed: 12, decision_executed: 7, decision_pending_approval: 2, decision_denied: 1, decision_rejected: 1 },
  latency_ms: { p50: 0.25, p95: 0.7 },
};

const ev = (id: string, account: string, severity: FeedItem["event"]["severity"], message: string, amount = 0): FeedItem => ({
  event: { event_id: id, account_key: account.toLowerCase(), account_name: account, source: "payments", severity, message, amount_usd: amount, occurred_at: new Date().toISOString() },
  result: {
    event_id: id, account_key: account.toLowerCase(), action: severity === "low" ? null : "create_case", rationale: "rule matched", latency_ms: 1.5,
    outcome: severity === "low" ? null : { decision: "executed", action: "create_case", detail: "ok", result: { case_id: "CAS1" }, approval_id: null },
  },
});

export const feed: FeedItem[] = [
  ev("e1", "Acme Corporation", "critical", "Gateway outage: [REDACTED:EMAIL] card [REDACTED:CARD] declined"),
  ev("e2", "Globex Ltd", "medium", "p95 latency above SLO"),
  ev("e3", "Initech", "low", "Heartbeat ok"),
];

export const approvals: Approval[] = [
  { approval_id: "ap1", requester: "agentforce-bridge-agent", action: "create_financial_review", params: { account_name: "Globex Ltd", amount_usd: 25000, reason: "Invoice mismatch" }, event_id: "e9abcdef123456", expires_in_s: 840, risk: "high" },
];

export const manifest: ActionManifest[] = [
  { name: "create_case", description: "Open a Salesforce Case.", risk: "low", permission: "action:create_case", requiresApproval: false,
    inputSchema: { required: ["account_name", "subject"], properties: { account_name: { type: "string", title: "Account Name" }, subject: { type: "string", title: "Subject" }, description: { type: "string", title: "Description", maxLength: 32000 }, priority: { type: "string", title: "Priority", enum: ["Low", "Medium", "High"], default: "Medium" } } } },
  { name: "create_financial_review", description: "High-priority financial Case.", risk: "high", permission: "action:create_financial_review", requiresApproval: true,
    inputSchema: { required: ["account_name", "amount_usd", "reason"], properties: { account_name: { type: "string", title: "Account Name" }, amount_usd: { type: "number", title: "Amount Usd", exclusiveMinimum: 0 }, reason: { type: "string", title: "Reason" } } } },
];

export const audit: AuditRecord[] = [
  { audit_id: "a1", timestamp: new Date().toISOString(), actor: "agent-svc", action: "create_case", decision: "executed", event_id: "e1", detail: "ok", payload: { subject: "x" } },
  { audit_id: "a2", timestamp: new Date().toISOString(), actor: "vic", action: "create_case", decision: "denied", event_id: null, detail: "role VIEWER lacks action:create_case", payload: {} },
];

export const accounts: AccountSummary[] = [
  { account_key: "acme", display_name: "Acme Corporation", aliases: ["ACME Corp.", "Acme Corporation"], event_count: 2, exposure_usd: 0, max_severity: "critical", last_event_at: new Date().toISOString(), sources: ["payments"] },
];

export const cases: SfCase[] = [{ Id: "CAS000000000000001", Subject: "Financial review: $25,000.00", Priority: "High", Description: "Invoice mismatch" }];

/** Records of requests the app made, for assertions. */
export const calls: { method: string; path: string; body?: unknown }[] = [];

const authed = (req: Request) => KEYS[req.headers.get("x-api-key") ?? ""];
const guard = (req: Request, perm?: string) => {
  const u = authed(req);
  if (!u) return HttpResponse.json({ detail: "invalid or missing API key" }, { status: 401 });
  if (perm && !u.permissions.includes(perm)) return HttpResponse.json({ detail: `missing permission ${perm}` }, { status: 403 });
  return null;
};

export const handlers = [
  http.get(`${B}/v1/whoami`, ({ request }) => authed(request) ? HttpResponse.json(authed(request)) : HttpResponse.json({ detail: "invalid or missing API key" }, { status: 401 })),
  http.get(`${B}/v1/overview`, ({ request }) => guard(request) ?? HttpResponse.json(overview)),
  http.get(`${B}/v1/feed`, ({ request }) => guard(request) ?? HttpResponse.json(feed)),
  http.get(`${B}/v1/accounts`, ({ request }) => guard(request) ?? HttpResponse.json(accounts)),
  http.get(`${B}/v1/cases`, ({ request }) => guard(request) ?? HttpResponse.json(cases)),
  http.get(`${B}/v1/audit`, ({ request }) => guard(request) ?? HttpResponse.json(audit)),
  http.get(`${B}/v1/actions`, ({ request }) => guard(request) ?? HttpResponse.json(manifest)),
  http.get(`${B}/v1/approvals`, ({ request }) => guard(request, "approvals:decide") ?? HttpResponse.json(approvals)),
  http.post(`${B}/v1/events`, async ({ request }) => {
    const body = await request.json();
    calls.push({ method: "POST", path: "/v1/events", body });
    const g = guard(request, "events:write");
    if (g) return g;
    if ((body as Record<string, unknown>).priority_v2) return HttpResponse.json({ detail: [{ loc: ["body", "priority_v2"], msg: "Extra inputs are not permitted" }] }, { status: 422 });
    if (new URL(request.url).searchParams.get("wait")) {
      return HttpResponse.json({ event_id: "n1", account_key: "acme", action: "create_case", rationale: "r", latency_ms: 1, outcome: { decision: "executed", action: "create_case", detail: "ok", result: null, approval_id: null } });
    }
    return HttpResponse.json({ event_id: "n1", status: "accepted" }, { status: 202 });
  }),
  http.post(`${B}/v1/actions/:name`, async ({ request, params }) => {
    const body = await request.json();
    calls.push({ method: "POST", path: `/v1/actions/${String(params.name)}`, body });
    const g = guard(request);
    if (g) return g;
    const high = params.name !== "create_case";
    return HttpResponse.json(
      { decision: high ? "pending_approval" : "executed", action: params.name, detail: high ? "awaiting human approval" : "ok", result: null, approval_id: high ? "ap2" : null },
      { status: high ? 202 : 200 },
    );
  }),
  http.post(`${B}/v1/approvals/:id/decision`, async ({ request, params }) => {
    const body = (await request.json()) as { approve: boolean; note: string };
    calls.push({ method: "POST", path: `/v1/approvals/${String(params.id)}/decision`, body });
    const g = guard(request);
    if (g) return g;
    if (authed(request)?.name === "agent-svc") return HttpResponse.json({ decision: "denied", action: "x", detail: "separation of duties: requester cannot approve", result: null, approval_id: null }, { status: 403 });
    return HttpResponse.json({ decision: body.approve ? "executed" : "rejected", action: "create_financial_review", detail: "approved by jane", result: { case_id: "CAS1" }, approval_id: null });
  }),
];

export const server = setupServer(...handlers);
