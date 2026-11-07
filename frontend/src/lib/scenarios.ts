import type { EventPayload } from "./types";

export interface Scenario {
  id: string;
  title: string;
  tagline: string;
  tags: string[];
  payload: EventPayload;
}

export const DEMO_PERSONAS = [
  { key: "agent-key", name: "agent-svc", role: "AGENT", blurb: "Ingests telemetry & invokes low-risk actions" },
  { key: "approver-key", name: "jane", role: "APPROVER", blurb: "Human-in-the-loop for high-risk actions" },
  { key: "viewer-key", name: "vic", role: "VIEWER", blurb: "Read-only visibility" },
  { key: "admin-key", name: "root", role: "ADMIN", blurb: "Full control" },
] as const;

export const SCENARIOS: Scenario[] = [
  {
    id: "pii-outage",
    title: "Payments gateway outage",
    tagline: "Critical event carrying an email and a card number — watch PII get stripped.",
    tags: ["PII redaction", "Case created"],
    payload: {
      source: "payments",
      account_name: "Acme Corporation",
      severity: "critical",
      message: "Gateway outage: jane.doe@example.com card 4111 1111 1111 1111 declined repeatedly",
    },
  },
  {
    id: "invoice",
    title: "$25k invoice mismatch",
    tagline: "Exceeds the financial threshold → High-risk action → human approval required.",
    tags: ["Human-in-the-loop", "Financial review"],
    payload: {
      source: "erp",
      account_name: "Globex Ltd",
      severity: "high",
      message: "Invoice reconciliation mismatch between ERP and billing",
      amount_usd: 25000,
    },
  },
  {
    id: "alias",
    title: "Same customer, new alias",
    tagline: "“ACME Corp.” resolves to the same canonical account as “Acme Corporation”.",
    tags: ["Entity resolution", "Grounding"],
    payload: {
      source: "payments",
      account_name: "ACME Corp.",
      severity: "high",
      message: "Gateway outage persists; card declines continue",
    },
  },
  {
    id: "heartbeat",
    title: "Heartbeat OK",
    tagline: "Low severity noise — the planner correctly takes no action.",
    tags: ["No-op"],
    payload: { source: "heartbeat", account_name: "Initech", severity: "low", message: "Heartbeat ok" },
  },
  {
    id: "latency",
    title: "Latency SLO breach",
    tagline: "Phone number in the message is redacted before the planner ever sees it.",
    tags: ["PII redaction"],
    payload: {
      source: "telemetry",
      account_name: "Initech",
      severity: "medium",
      message: "p95 latency above SLO; call +1 415-555-0100",
    },
  },
];

/** Deliberately violates the contract (unknown field) to show drift capture. */
export const DRIFT_PAYLOAD = {
  source: "legacy-erp",
  account_name: "Globex Ltd",
  severity: "urgent",
  message: "Payload from an un-migrated producer",
  priority_v2: 9,
};

export const RANDOM_BURST: EventPayload[] = [
  { source: "payments", account_name: "Acme Corporation", severity: "high", message: "Card declines spiking on EU gateway" },
  { source: "telemetry", account_name: "Globex Ltd", severity: "medium", message: "p95 latency above SLO on order API" },
  { source: "erp", account_name: "Initech", severity: "high", message: "Ledger sync lag exceeds 15 minutes", amount_usd: 18250 },
  { source: "heartbeat", account_name: "Initech", severity: "low", message: "Heartbeat ok" },
  { source: "payments", account_name: "ACME Corp.", severity: "critical", message: "Gateway outage: settlement batch failed" },
  { source: "telemetry", account_name: "Globex Ltd", severity: "high", message: "Error budget burn rate 14x for checkout" },
];
