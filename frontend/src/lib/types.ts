export type Role = "VIEWER" | "AGENT" | "APPROVER" | "ADMIN";
export type Severity = "low" | "medium" | "high" | "critical";
export type Decision =
  | "executed"
  | "pending_approval"
  | "denied"
  | "rejected"
  | "failed";

export interface Whoami {
  name: string;
  role: Role;
  permissions: string[];
}

export interface Overview {
  version: string;
  mode: "live-salesforce" | "offline-in-memory";
  planner: string;
  financial_threshold_usd: number;
  bus: { running: boolean; dlq: number };
  audit_pending_sync: number;
  pending_approvals: number;
  salesforce_circuit: string;
  counters: Record<string, number>;
  latency_ms: { p50: number; p95: number };
}

export interface UnifiedEvent {
  event_id: string;
  account_key: string;
  account_name: string;
  source: string;
  severity: Severity;
  message: string;
  amount_usd: number;
  occurred_at: string;
}

export interface ActionOutcome {
  decision: Decision;
  action: string;
  detail: string;
  result: Record<string, unknown> | null;
  approval_id: string | null;
}

export interface PipelineResult {
  event_id: string;
  account_key: string;
  action: string | null;
  rationale: string;
  outcome: ActionOutcome | null;
  latency_ms: number;
}

export interface FeedItem {
  event: UnifiedEvent;
  result: PipelineResult;
}

export interface JsonSchemaProp {
  type?: string;
  title?: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  minLength?: number;
  maxLength?: number;
  exclusiveMinimum?: number;
  pattern?: string;
  anyOf?: { type?: string }[];
}

export interface InputSchema {
  properties: Record<string, JsonSchemaProp>;
  required?: string[];
}

export interface ActionManifest {
  name: string;
  description: string;
  risk: "low" | "high";
  permission: string;
  requiresApproval: boolean;
  inputSchema: InputSchema;
}

export interface Approval {
  approval_id: string;
  requester: string;
  action: string;
  params: Record<string, unknown>;
  event_id: string | null;
  expires_in_s: number;
  risk: "low" | "high";
}

export interface AuditRecord {
  audit_id: string;
  timestamp: string;
  actor: string;
  action: string;
  decision: Decision;
  event_id: string | null;
  detail: string;
  payload: Record<string, unknown>;
}

export interface AccountSummary {
  account_key: string;
  display_name: string;
  aliases: string[];
  event_count: number;
  exposure_usd: number;
  max_severity: Severity;
  last_event_at: string;
  sources: string[];
}

export interface SfCase {
  Id: string;
  Subject?: string;
  Status?: string;
  Priority?: string;
  Description?: string;
  [k: string]: unknown;
}

export interface IngestAck {
  event_id: string;
  status: "accepted" | "duplicate";
}

export interface EventPayload {
  source: string;
  account_name: string;
  severity: Severity;
  message: string;
  amount_usd?: number;
  [k: string]: unknown;
}
