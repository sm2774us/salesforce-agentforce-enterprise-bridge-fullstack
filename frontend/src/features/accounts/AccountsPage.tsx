import { Building2, Layers, Link2 } from "lucide-react";
import { SeverityBadge } from "@/components/badges";
import { PageHeader, Rise, Stagger } from "@/components/page";
import { Badge, Card, CardBody, EmptyState, Skeleton } from "@/components/ui/primitives";
import { useAccounts } from "@/lib/hooks";
import { timeAgo, usd } from "@/lib/utils";

export function AccountsPage() {
  const { data, isLoading } = useAccounts();
  return (
    <>
      <PageHeader title="Accounts 360" subtitle="Data Cloud–style identity resolution: messy name variants from different systems collapse into one canonical customer — and grounding never leaks across tenants." />
      {isLoading ? <Skeleton className="h-64" /> : !data?.length ? (
        <Card><EmptyState icon={<Building2 className="h-5 w-5" />} title="No accounts resolved yet" hint="Ingest events to see entities unify." /></Card>
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((a) => (
            <Rise key={a.account_key}>
              <Card className="h-full" data-testid="account-card">
                <CardBody className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/25 to-indigo-500/25 text-lg font-bold text-cyan-200">{a.display_name[0]}</div>
                      <div><p className="font-semibold">{a.display_name}</p><p className="font-mono text-[11px] text-muted">key: {a.account_key}</p></div>
                    </div>
                    <SeverityBadge severity={a.max_severity} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat icon={Layers} label="Unified events" value={String(a.event_count)} />
                    <Stat icon={Building2} label="Exposure" value={usd(a.exposure_usd)} />
                  </div>
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted"><Link2 className="h-3 w-3" /> Resolved aliases ({a.aliases.length})</p>
                    <div className="flex flex-wrap gap-1.5">{a.aliases.map((x) => <Badge key={x} tone="cyan" className="normal-case">{x}</Badge>)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                    sources: {a.sources.map((s) => <Badge key={s}>{s}</Badge>)}
                    <span className="ml-auto">{timeAgo(a.last_event_at)}</span>
                  </div>
                </CardBody>
              </Card>
            </Rise>
          ))}
        </Stagger>
      )}
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Layers; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="flex items-center gap-1.5 text-[11px] text-muted"><Icon className="h-3 w-3" />{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}
