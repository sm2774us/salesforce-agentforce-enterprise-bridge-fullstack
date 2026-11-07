import { api, ApiError } from "./api";
import { DRIFT_PAYLOAD, SCENARIOS } from "./scenarios";
import type { Role } from "./types";

export interface RunbookStep {
  id: string;
  title: string;
  say: string;
  permission?: string;
  persona?: { key: string; label: string; role: Role };
  link?: { to: string; label: string };
  run?: () => Promise<string>;
}

const scenario = (id: string) => SCENARIOS.find((s) => s.id === id)!.payload;

export const RUNBOOK: RunbookStep[] = [
  {
    id: "overview", title: "Set the scene",
    say: "Fragmented telemetry in, governed Salesforce actions out. Every stage you see on screen is a control point.",
    link: { to: "/", label: "Open Mission control" },
  },
  {
    id: "pii", title: "Critical outage with PII in the payload",
    say: "A payments event contains a customer email and a card number. Watch both get redacted before the planner — or Salesforce — ever sees them.",
    permission: "events:write", persona: { key: "agent-key", label: "agent-svc", role: "AGENT" },
    link: { to: "/events", label: "Inspect the event" },
    run: async () => {
      const r = await api.ingestWait(scenario("pii-outage"));
      return `Planner chose ${r.action}; outcome: ${r.outcome?.decision}.`;
    },
  },
  {
    id: "alias", title: "Same customer, different spelling",
    say: "“ACME Corp.” arrives from another system. Identity resolution unifies it with “Acme Corporation” — one customer, one grounded history.",
    permission: "events:write", persona: { key: "agent-key", label: "agent-svc", role: "AGENT" },
    link: { to: "/accounts", label: "See Accounts 360" },
    run: async () => {
      const r = await api.ingestWait(scenario("alias"));
      return `Resolved to canonical key “${r.account_key}”.`;
    },
  },
  {
    id: "invoice", title: "A $25,000 financial discrepancy",
    say: "The amount crosses the policy threshold. The agent proposes a High-risk action — and the control tower parks it for a human.",
    permission: "events:write", persona: { key: "agent-key", label: "agent-svc", role: "AGENT" },
    link: { to: "/approvals", label: "Open approval queue" },
    run: async () => {
      const r = await api.ingestWait(scenario("invoice"));
      return `Governance verdict: ${r.outcome?.decision}.`;
    },
  },
  {
    id: "approve", title: "Human approves — separation of duties enforced",
    say: "Jane reviews the request and approves. The requester could never approve their own action.",
    permission: "approvals:decide", persona: { key: "approver-key", label: "jane", role: "APPROVER" },
    link: { to: "/salesforce", label: "Verify the Case in Salesforce" },
    run: async () => {
      const pending = await api.approvals();
      if (!pending.length) return "Nothing pending — run the invoice step first.";
      const o = await api.decide(pending[0].approval_id, true, "Approved during executive demo");
      return `Decision: ${o.decision} — ${o.detail}`;
    },
  },
  {
    id: "probe", title: "Policy probe: push past your permissions",
    say: "Try to escalate a Case with a malformed Id. RBAC and schema validation stop it — and the attempt is audited.",
    link: { to: "/audit", label: "See it in the audit trail" },
    run: async () => {
      const o = await api.invoke("escalate_case", { case_id: "not-an-id", reason: "probe" });
      return `Control tower said: ${o.decision} — ${o.detail}`;
    },
  },
  {
    id: "drift", title: "Upstream schema drift",
    say: "A legacy producer sends an unknown field. The contract rejects it with HTTP 422 and parks it in the dead-letter queue — no silent corruption.",
    permission: "events:write", persona: { key: "agent-key", label: "agent-svc", role: "AGENT" },
    link: { to: "/", label: "DLQ counter on Overview" },
    run: async () => {
      try {
        await api.ingest(DRIFT_PAYLOAD);
        return "Unexpectedly accepted.";
      } catch (e) {
        return `Blocked with HTTP ${(e as ApiError).status}: ${(e as ApiError).message}`;
      }
    },
  },
];
