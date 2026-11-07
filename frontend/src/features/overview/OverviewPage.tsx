import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Gauge, Hourglass, ShieldCheck, Timer, Zap } from "lucide-react";
import { AnimatedNumber, Donut, MeterBar, Sparkline } from "@/components/charts";
import { DECISION_COLORS, DecisionBadge, SeverityBadge } from "@/components/badges";
import { PageHeader, Rise, Stagger } from "@/components/page";
import { Badge, Button, Card, CardBody, CardDescription, CardHeader, CardTitle, EmptyState, Skeleton } from "@/components/ui/primitives";
import { useFeed, useOverview, useSeries } from "@/lib/hooks";
import type { Decision } from "@/lib/types";
import { timeAgo, titleCase, usd } from "@/lib/utils";
import { PipelineFlow } from "./PipelineFlow";

const DECISIONS: Decision[] = ["executed", "pending_approval", "denied", "rejected", "failed"];

export function OverviewPage() {
  const { data: ov, isLoading } = useOverview();
  const { data: feed } = useFeed(8);
  const series = useSeries(ov?.counters.events_processed);
  const c = ov?.counters ?? {};
  const slices = DECISIONS.map((d) => ({ label: titleCase(d), value: c[`decision_${d}`] ?? 0, color: DECISION_COLORS[d] }));
  const total = slices.reduce((a, s) => a + s.value, 0);
  const autonomy = total ? Math.round(((c.decision_executed ?? 0) / total) * 100) : 0;

  return (
    <Stagger>
      <PageHeader
        title="Mission control"
        subtitle="Real-time visibility into what your AI agents are doing, what they were allowed to do, and what needed a human."
        actions={<Link to="/events"><Button><Zap className="h-4 w-4" /> Launch simulator</Button></Link>}
      />
      <Rise className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Gauge} label="Events processed" loading={isLoading} value={c.events_processed ?? 0} spark={series} />
        <Kpi icon={ShieldCheck} label="Autonomous actions" loading={isLoading} value={c.decision_executed ?? 0} hint={`${autonomy}% of governed decisions`} color="#34d399" />
        <Kpi icon={Hourglass} label="Awaiting human" loading={isLoading} value={ov?.pending_approvals ?? 0} hint="High-risk actions held" color="#fbbf24" testId="kpi-pending" />
        <Kpi icon={AlertTriangle} label="Blocked by policy" loading={isLoading} value={(c.decision_denied ?? 0) + (c.decision_rejected ?? 0)} hint="denied + rejected" color="#fb4f6b" />
      </Rise>
      <Rise className="mt-4"><PipelineFlow ov={ov} /></Rise>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Rise>
          <Card className="h-full">
            <CardHeader><div><CardTitle>Decision mix</CardTitle><CardDescription>Outcome of every governed tool call</CardDescription></div></CardHeader>
            <CardBody className="flex flex-col items-center gap-4">
              <Donut slices={slices} center={<div><p className="font-mono text-2xl font-bold">{total}</p><p className="text-[10px] uppercase tracking-wider text-muted">decisions</p></div>} />
              <ul className="w-full space-y-1.5 text-xs">
                {slices.map((s) => (
                  <li key={s.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
                    <span className="font-mono">{s.value}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Rise>
        <Rise>
          <Card className="h-full">
            <CardHeader><div><CardTitle>Platform health</CardTitle><CardDescription>Latency, queues and Salesforce link</CardDescription></div></CardHeader>
            <CardBody className="space-y-5">
              <MeterBar label="Pipeline latency p50" value={ov?.latency_ms.p50 ?? 0} max={Math.max(50, ov?.latency_ms.p95 ?? 0)} />
              <MeterBar label="Pipeline latency p95" value={ov?.latency_ms.p95 ?? 0} max={Math.max(50, ov?.latency_ms.p95 ?? 0)} color="#818cf8" />
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <Fact k="Event bus" v={ov?.bus.running ? "running" : "stopped"} ok={!!ov?.bus.running} />
                <Fact k="Salesforce circuit" v={ov?.salesforce_circuit ?? "–"} ok={ov?.salesforce_circuit !== "open"} />
                <Fact k="Dead-letter queue" v={String(ov?.bus.dlq ?? 0)} ok={!ov?.bus.dlq} />
                <Fact k="Audit outbox" v={`${ov?.audit_pending_sync ?? 0} pending`} ok={!ov?.audit_pending_sync} />
              </dl>
              <p className="flex items-center gap-2 text-xs text-muted"><Timer className="h-3.5 w-3.5" /> Financial review threshold <span className="font-mono text-foreground">{usd(ov?.financial_threshold_usd ?? 0)}</span></p>
            </CardBody>
          </Card>
        </Rise>
        <Rise>
          <Card className="h-full">
            <CardHeader>
              <div><CardTitle>Live activity</CardTitle><CardDescription>Latest governed events</CardDescription></div>
              <Link to="/events" className="text-xs text-cyan-300 hover:underline">All <ArrowRight className="inline h-3 w-3" /></Link>
            </CardHeader>
            <CardBody className="space-y-2.5">
              {!feed ? <Skeleton className="h-40" /> : feed.length === 0 ? (
                <EmptyState icon={<Zap className="h-5 w-5" />} title="No events yet" hint="Fire a scenario from the Event Stream to watch the pipeline light up." />
              ) : feed.map((f) => (
                <div key={f.event.event_id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{f.event.account_name}</span>
                    <SeverityBadge severity={f.event.severity} />
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted">{f.event.message}</p>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
                    {f.result.outcome ? <DecisionBadge decision={f.result.outcome.decision} /> : <Badge>no action</Badge>}
                    <span>{timeAgo(f.event.occurred_at)}</span>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </Rise>
      </div>
    </Stagger>
  );
}

function Kpi({ icon: Icon, label, value, hint, spark, color = "#22d3ee", loading, testId }: {
  icon: typeof Gauge; label: string; value: number; hint?: string; spark?: number[]; color?: string; loading?: boolean; testId?: string;
}) {
  return (
    <Card className="relative overflow-hidden" data-testid={testId}>
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl" style={{ background: color, opacity: 0.18 }} />
      <CardBody>
        <div className="flex items-center justify-between text-muted"><span className="text-xs font-medium uppercase tracking-wider">{label}</span><Icon className="h-4 w-4" style={{ color }} /></div>
        <p className="mt-3 font-mono text-4xl font-bold tracking-tight">{loading ? <Skeleton className="h-10 w-20" /> : <AnimatedNumber value={value} />}</p>
        {spark ? <div className="mt-2"><Sparkline data={spark} color={color} /></div> : <p className="mt-2 text-xs text-muted">{hint}</p>}
      </CardBody>
    </Card>
  );
}

function Fact({ k, v, ok }: { k: string; v: string; ok: boolean }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
      <dt className="text-muted">{k}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 font-medium"><i className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-rose-500"}`} />{v}</dd>
    </div>
  );
}
