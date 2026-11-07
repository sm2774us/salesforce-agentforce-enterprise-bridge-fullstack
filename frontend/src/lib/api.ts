import { useSession } from "@/store/session";
import type {
  AccountSummary,
  ActionManifest,
  ActionOutcome,
  Approval,
  AuditRecord,
  EventPayload,
  FeedItem,
  IngestAck,
  Overview,
  PipelineResult,
  SfCase,
  Whoami,
} from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: unknown,
  ) {
    super(formatDetail(detail, status));
    this.name = "ApiError";
  }
}

export function formatDetail(detail: unknown, status = 0): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) =>
        d.loc ? `${d.loc.join(".")}: ${d.msg}` : (d.msg ?? JSON.stringify(d)),
      )
      .join("; ");
  }
  return `Request failed (${status})`;
}

async function raw(path: string, init: RequestInit = {}, key?: string) {
  const apiKey = key ?? useSession.getState().apiKey;
  const headers = new Headers(init.headers);
  if (apiKey) headers.set("X-API-Key", apiKey);
  if (init.body) headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Bridge unreachable — is the server running?");
  }
  const body: unknown = await res.json().catch(() => null);
  return { res, body };
}

async function request<T>(path: string, init?: RequestInit, key?: string) {
  const { res, body } = await raw(path, init, key);
  if (!res.ok) {
    if (res.status === 401) useSession.getState().expire();
    throw new ApiError(res.status, (body as { detail?: unknown })?.detail);
  }
  return body as T;
}

/** Action/approval endpoints return an ActionOutcome for every decision. */
async function outcome(path: string, payload: unknown): Promise<ActionOutcome> {
  const { res, body } = await raw(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (body && typeof body === "object" && "decision" in body) {
    return body as ActionOutcome;
  }
  if (res.status === 401) useSession.getState().expire();
  throw new ApiError(res.status, (body as { detail?: unknown })?.detail);
}

export const api = {
  whoami: (key?: string) => request<Whoami>("/v1/whoami", undefined, key),
  overview: () => request<Overview>("/v1/overview"),
  feed: (limit = 60) => request<FeedItem[]>(`/v1/feed?limit=${limit}`),
  accounts: () => request<AccountSummary[]>("/v1/accounts"),
  dlq: () => request<Record<string, unknown>[]>("/v1/dlq"),
  cases: () => request<SfCase[]>("/v1/cases"),
  actions: () => request<ActionManifest[]>("/v1/actions"),
  approvals: () => request<Approval[]>("/v1/approvals"),
  audit: (limit = 200) => request<AuditRecord[]>(`/v1/audit?limit=${limit}`),
  ingest: (payload: unknown) =>
    request<IngestAck>("/v1/events", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  ingestWait: (payload: EventPayload) =>
    request<PipelineResult>("/v1/events?wait=true", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  invoke: (name: string, params: Record<string, unknown>) =>
    outcome(`/v1/actions/${encodeURIComponent(name)}`, { params }),
  decide: (id: string, approve: boolean, note: string) =>
    outcome(`/v1/approvals/${encodeURIComponent(id)}/decision`, {
      approve,
      note,
    }),
};
