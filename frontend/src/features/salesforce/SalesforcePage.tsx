import { CloudCog, FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/page";
import { Badge, Card, CardBody, CardDescription, CardHeader, CardTitle, EmptyState, Skeleton } from "@/components/ui/primitives";
import { useCases, useOverview } from "@/lib/hooks";
import type { SfCase } from "@/lib/types";

const PRI: Record<string, "red" | "amber" | "green"> = { High: "red", Medium: "amber", Low: "green" };

export function SalesforcePage() {
  const { data, isLoading } = useCases();
  const { data: ov } = useOverview();
  const live = ov?.mode === "live-salesforce";
  return (
    <>
      <PageHeader title="Salesforce system of record" subtitle="Cases created by governed Agentforce actions, read straight from the CRM gateway." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone={live ? "cyan" : "indigo"}><CloudCog className="h-3 w-3" />{live ? "Live org via OAuth JWT bearer" : "Offline in-memory CRM"}</Badge>
        <Badge tone={ov?.salesforce_circuit === "open" ? "red" : "green"}>circuit: {ov?.salesforce_circuit ?? "–"}</Badge>
        <Badge tone={ov?.audit_pending_sync ? "amber" : "green"}>audit outbox: {ov?.audit_pending_sync ?? 0}</Badge>
      </div>
      <Card>
        <CardHeader><div><CardTitle>Recent cases</CardTitle><CardDescription>Newest first · refreshes automatically</CardDescription></div></CardHeader>
        <CardBody>
          {isLoading ? <Skeleton className="h-40" /> : !data?.length ? (
            <EmptyState icon={<FolderKanban className="h-5 w-5" />} title="No cases yet" hint="Run the payments outage scenario, or approve the financial review." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2" data-testid="case-list">
              {data.map((c: SfCase) => (
                <li key={c.Id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4" data-testid="case-item">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{c.Subject}</p>
                    <div className="flex shrink-0 gap-1.5">{c.Status && <Badge tone="amber">{c.Status}</Badge>}{c.Priority && <Badge tone={PRI[c.Priority] ?? "neutral"}>{c.Priority}</Badge>}</div>
                  </div>
                  {c.Description && <p className="mt-2 line-clamp-3 text-xs text-muted">{c.Description}</p>}
                  <p className="mt-2 font-mono text-[11px] text-muted">{c.Id}</p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
