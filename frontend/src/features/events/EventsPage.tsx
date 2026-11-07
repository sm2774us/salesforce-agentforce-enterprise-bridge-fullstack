import { useMemo, useState } from "react";
import { Activity, Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DecisionBadge, SeverityBadge } from "@/components/badges";
import { DataTable } from "@/components/data-table";
import { JsonView } from "@/components/json-view";
import { PageHeader } from "@/components/page";
import { Badge, Button, Card, Dialog, EmptyState, Input, Skeleton } from "@/components/ui/primitives";
import { useFeed } from "@/lib/hooks";
import { countRedactions, highlightRedactions } from "@/lib/redaction";
import type { FeedItem, Severity } from "@/lib/types";
import { cn, timeAgo, usd } from "@/lib/utils";
import { Simulator } from "./Simulator";

const SEVS: (Severity | "all")[] = ["all", "critical", "high", "medium", "low"];

export function EventsPage() {
  const { data, isLoading } = useFeed(100);
  const [sev, setSev] = useState<Severity | "all">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<FeedItem | null>(null);

  const rows = useMemo(
    () => (data ?? []).filter((f) => (sev === "all" || f.event.severity === sev) && `${f.event.account_name} ${f.event.message} ${f.event.source}`.toLowerCase().includes(q.toLowerCase())),
    [data, sev, q],
  );

  const columns = useMemo<ColumnDef<never, FeedItem>[]>(
    () => [
      { id: "time", header: "When", accessorFn: (r) => r.event.occurred_at, sortFn: "datetime", cell: ({ row }) => <span className="whitespace-nowrap text-xs text-muted">{timeAgo(row.original.event.occurred_at)}</span> },
      { id: "account", header: "Account", accessorFn: (r) => r.event.account_name, sortFn: "alphanumeric", cell: ({ row }) => <div><p className="font-medium">{row.original.event.account_name}</p><p className="text-[11px] text-muted">→ {row.original.result.account_key} · {row.original.event.source}</p></div> },
      { id: "severity", header: "Severity", accessorFn: (r) => r.event.severity, cell: ({ row }) => <SeverityBadge severity={row.original.event.severity} /> },
      { id: "message", header: "Message (post-redaction)", enableSorting: false, cell: ({ row }) => { const m = row.original.event.message; return <p className="max-w-md truncate text-xs text-foreground/90">{highlightRedactions(m)}</p>; } },
      { id: "action", header: "Agent action", accessorFn: (r) => r.result.action ?? "", sortFn: "alphanumeric", cell: ({ row }) => row.original.result.action ? <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-cyan-200">{row.original.result.action}</code> : <span className="text-xs text-muted">none</span> },
      { id: "decision", header: "Governance", enableSorting: false, cell: ({ row }) => row.original.result.outcome ? <DecisionBadge decision={row.original.result.outcome.decision} /> : <Badge>no-op</Badge> },
      { id: "latency", header: "Latency", accessorFn: (r) => r.result.latency_ms, sortFn: "alphanumeric", cell: ({ row }) => <span className="font-mono text-xs">{row.original.result.latency_ms.toFixed(1)} ms</span> },
    ] as ColumnDef<never, FeedItem>[],
    [],
  );

  return (
    <>
      <PageHeader title="Event stream" subtitle="Every telemetry event after identity resolution and PII stripping, with the agent's decision and the control tower's verdict." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] p-4">
            <div className="relative min-w-52 flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <Input aria-label="Search events" placeholder="Search account, message, source…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex gap-1" role="group" aria-label="Severity filter">
              {SEVS.map((s) => (
                <button key={s} onClick={() => setSev(s)} aria-pressed={sev === s} className={cn("rounded-md px-2.5 py-1 text-xs font-medium capitalize transition", sev === s ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40" : "text-muted hover:bg-white/5")}>{s}</button>
              ))}
            </div>
          </div>
          {isLoading ? <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div> : (
            <DataTable<FeedItem>
              testId="feed-table"
              data={rows}
              columns={columns as never}
              rowId={(r) => r.event.event_id}
              onRowClick={setOpen}
              empty={<EmptyState icon={<Activity className="h-5 w-5" />} title={data?.length ? "No events match your filters" : "No events yet"} hint={data?.length ? undefined : "Use the simulator to fire your first telemetry event."} />}
            />
          )}
        </Card>
        <Simulator />
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)} title="Event forensics" description={open?.event.event_id} className="w-[min(94vw,760px)]">
        {open && <Forensics item={open} />}
      </Dialog>
    </>
  );
}

function Forensics({ item }: { item: FeedItem }) {
  const { event: e, result: r } = item;
  const n = countRedactions(e.message);
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={e.severity} />
        {r.outcome && <DecisionBadge decision={r.outcome.decision} />}
        {e.amount_usd > 0 && <Badge tone="amber">{usd(e.amount_usd)}</Badge>}
        {n > 0 && <Badge tone="indigo">{n} PII item{n > 1 ? "s" : ""} redacted</Badge>}
      </div>
      <section><h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">What the planner saw</h4><p className="rounded-lg border border-white/10 bg-black/30 p-3">{highlightRedactions(e.message)}</p></section>
      <section className="grid gap-3 sm:grid-cols-2">
        <div><h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Entity resolution</h4><p>“{e.account_name}” → <code className="text-cyan-300">{r.account_key}</code></p></div>
        <div><h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Planner rationale</h4><p>{r.rationale}</p></div>
      </section>
      <section><h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Control-tower outcome</h4><JsonView value={r.outcome ?? { action: null }} /></section>
      <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(e.event_id)}>Copy event id</Button></div>
    </div>
  );
}
