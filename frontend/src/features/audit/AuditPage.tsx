import { useMemo, useState } from "react";
import { ScrollText, Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DecisionBadge } from "@/components/badges";
import { DataTable } from "@/components/data-table";
import { JsonView } from "@/components/json-view";
import { PageHeader } from "@/components/page";
import { Card, Dialog, EmptyState, Input, Select, Skeleton } from "@/components/ui/primitives";
import { useAudit } from "@/lib/hooks";
import type { AuditRecord } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export function AuditPage() {
  const { data, isLoading } = useAudit();
  const [q, setQ] = useState("");
  const [decision, setDecision] = useState("all");
  const [open, setOpen] = useState<AuditRecord | null>(null);
  const rows = useMemo(
    () => (data ?? []).filter((r) => (decision === "all" || r.decision === decision) && `${r.actor} ${r.action} ${r.detail}`.toLowerCase().includes(q.toLowerCase())),
    [data, q, decision],
  );
  const columns = useMemo(
    () =>
      [
        { id: "ts", header: "Time", accessorFn: (r: AuditRecord) => r.timestamp, sortFn: "datetime", cell: ({ row }: { row: { original: AuditRecord } }) => <span className="whitespace-nowrap text-xs text-muted">{timeAgo(row.original.timestamp)}</span> },
        { id: "actor", header: "Actor", accessorFn: (r: AuditRecord) => r.actor, sortFn: "alphanumeric", cell: ({ row }: { row: { original: AuditRecord } }) => <span className="font-medium">{row.original.actor}</span> },
        { id: "action", header: "Action", accessorFn: (r: AuditRecord) => r.action, sortFn: "alphanumeric", cell: ({ row }: { row: { original: AuditRecord } }) => <code className="text-xs text-cyan-200">{row.original.action}</code> },
        { id: "decision", header: "Decision", enableSorting: false, cell: ({ row }: { row: { original: AuditRecord } }) => <DecisionBadge decision={row.original.decision} /> },
        { id: "detail", header: "Detail", enableSorting: false, cell: ({ row }: { row: { original: AuditRecord } }) => <span className="block max-w-sm truncate text-xs text-muted">{row.original.detail}</span> },
      ] as unknown as ColumnDef<never, AuditRecord>[],
    [],
  );
  return (
    <>
      <PageHeader title="Audit trail" subtitle="Immutable record of every control-tower decision, mirrored to Bridge_Audit_Log__c in Salesforce." />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-white/[0.07] p-4">
          <div className="relative min-w-52 flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" /><Input aria-label="Search audit" className="pl-9" placeholder="Search actor, action, detail…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Select aria-label="Decision filter" className="w-48" value={decision} onChange={(e) => setDecision(e.target.value)}>
            <option value="all">All decisions</option>
            {["executed", "pending_approval", "denied", "rejected", "failed"].map((d) => <option key={d} value={d}>{d.replace("_", " ")}</option>)}
          </Select>
        </div>
        {isLoading ? <div className="p-4"><Skeleton className="h-40" /></div> : (
          <DataTable<AuditRecord> testId="audit-table" data={rows} columns={columns as never} rowId={(r) => r.audit_id} onRowClick={setOpen}
            empty={<EmptyState icon={<ScrollText className="h-5 w-5" />} title="No audit records" hint="Decisions will appear here as agents act." />} />
        )}
      </Card>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)} title="Audit record" description={open?.audit_id} className="w-[min(94vw,720px)]">
        {open && <div className="space-y-3 text-sm"><DecisionBadge decision={open.decision} /><p className="text-muted">{open.detail}</p><JsonView value={open} /></div>}
      </Dialog>
    </>
  );
}
