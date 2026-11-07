import { useEffect, useRef, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "./api";
import type { ActionOutcome, EventPayload } from "./types";
import { can, useSession } from "@/store/session";

export const qk = {
  overview: ["overview"],
  feed: ["feed"],
  accounts: ["accounts"],
  dlq: ["dlq"],
  cases: ["cases"],
  actions: ["actions"],
  approvals: ["approvals"],
  audit: ["audit"],
} as const;

function useLive(ms: number) {
  const live = useSession((s) => s.live);
  return live ? ms : false;
}

const poll = (ms: number | false) => ({
  refetchInterval: ms,
  placeholderData: keepPreviousData,
  refetchIntervalInBackground: false,
});

export const useOverview = () =>
  useQuery({ queryKey: qk.overview, queryFn: api.overview, ...poll(useLive(1500)) });
export const useFeed = (limit = 60) =>
  useQuery({ queryKey: [...qk.feed, limit], queryFn: () => api.feed(limit), ...poll(useLive(1500)) });
export const useAccounts = () =>
  useQuery({ queryKey: qk.accounts, queryFn: api.accounts, ...poll(useLive(3000)) });
export const useDlq = () =>
  useQuery({ queryKey: qk.dlq, queryFn: api.dlq, ...poll(useLive(3000)) });
export const useCases = () =>
  useQuery({ queryKey: qk.cases, queryFn: api.cases, ...poll(useLive(3000)) });
export const useAudit = () =>
  useQuery({ queryKey: qk.audit, queryFn: () => api.audit(300), ...poll(useLive(2000)) });
export const useActions = () =>
  useQuery({ queryKey: qk.actions, queryFn: api.actions, staleTime: 60_000 });

export function useApprovals() {
  const user = useSession((s) => s.user);
  const interval = useLive(1500);
  return useQuery({
    queryKey: qk.approvals,
    queryFn: api.approvals,
    enabled: can(user, "approvals:decide"),
    ...poll(interval),
  });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function describeOutcome(o: ActionOutcome): { ok: boolean; text: string } {
  switch (o.decision) {
    case "executed":
      return { ok: true, text: `${o.action} executed` };
    case "pending_approval":
      return { ok: true, text: `${o.action} queued for human approval` };
    case "denied":
      return { ok: false, text: `Denied — ${o.detail}` };
    case "rejected":
      return { ok: false, text: `Rejected — ${o.detail}` };
    default:
      return { ok: false, text: `Failed — ${o.detail}` };
  }
}

export function toastOutcome(o: ActionOutcome) {
  const { ok, text } = describeOutcome(o);
  if (!ok) toast.error(text);
  else if (o.decision === "pending_approval") toast.warning(text);
  else toast.success(text);
}

export function useInvoke() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (v: { name: string; params: Record<string, unknown> }) =>
      api.invoke(v.name, v.params),
    onSuccess: (o) => {
      toastOutcome(o);
      invalidate();
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useDecide() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (v: { id: string; approve: boolean; note: string }) =>
      api.decide(v.id, v.approve, v.note),
    onSuccess: (o) => {
      toastOutcome(o);
      invalidate();
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

export function useIngest() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (payload: EventPayload) => api.ingestWait(payload),
    onSuccess: (r) => {
      const o = r.outcome;
      if (!o) toast.info(`Event grounded to “${r.account_key}” — no action needed`);
      else toastOutcome(o);
      invalidate();
    },
    onError: (e: ApiError) => toast.error(`Ingest failed: ${e.message}`),
  });
}

/** Samples a monotonically increasing counter into a bounded series. */
export function useSeries(value: number | undefined, size = 40): number[] {
  const [series, setSeries] = useState<number[]>([]);
  const last = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (value === undefined) return;
    const delta = last.current === undefined ? 0 : Math.max(0, value - last.current);
    last.current = value;
    setSeries((s) => [...s, delta].slice(-size));
  }, [value, size]);
  return series;
}

/** Seconds remaining, ticking locally between server refreshes. */
export function useCountdown(initial: number, anchor: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, initial - (now - anchor) / 1000);
}
