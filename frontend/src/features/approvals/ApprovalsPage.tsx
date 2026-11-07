import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Clock, Lock, ShieldQuestion, X } from "lucide-react";
import { RiskBadge } from "@/components/badges";
import { PageHeader } from "@/components/page";
import { Badge, Button, Card, CardBody, Dialog, EmptyState, Label, Skeleton, Textarea } from "@/components/ui/primitives";
import { useApprovals, useCountdown, useDecide } from "@/lib/hooks";
import type { Approval } from "@/lib/types";
import { mmss, titleCase, usd } from "@/lib/utils";
import { can, useSession } from "@/store/session";

export function ApprovalsPage() {
  const user = useSession((s) => s.user);
  const allowed = can(user, "approvals:decide");
  const { data, isLoading, dataUpdatedAt } = useApprovals();
  const [target, setTarget] = useState<{ a: Approval; approve: boolean } | null>(null);

  return (
    <>
      <PageHeader title="Human-in-the-loop approvals" subtitle="High-risk agent actions are held here until an authorised human decides. The requester can never approve their own request." />
      {!allowed ? (
        <Card><EmptyState icon={<Lock className="h-5 w-5" />} title="Approver role required" hint={`You are signed in as ${user?.name} (${user?.role}). Switch to the APPROVER persona from the top bar to review the queue.`} /></Card>
      ) : isLoading ? (
        <Skeleton className="h-48" />
      ) : !data?.length ? (
        <Card><EmptyState icon={<ShieldQuestion className="h-5 w-5" />} title="Queue is clear" hint="Fire the “$25k invoice mismatch” scenario to create a high-risk request." /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2" data-testid="approval-list">
          <AnimatePresence>
            {data.map((a) => <ApprovalCard key={a.approval_id} a={a} anchor={dataUpdatedAt} onDecide={(approve) => setTarget({ a, approve })} />)}
          </AnimatePresence>
        </div>
      )}
      {target && <DecideDialog target={target} onClose={() => setTarget(null)} />}
    </>
  );
}

function ApprovalCard({ a, anchor, onDecide }: { a: Approval; anchor: number; onDecide: (approve: boolean) => void }) {
  const left = useCountdown(a.expires_in_s, anchor);
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: 40 }} data-testid="approval-card">
      <Card className="border-amber-400/20">
        <CardBody className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold">{titleCase(a.action)}</p>
              <p className="text-xs text-muted">Requested by <span className="text-foreground">{a.requester}</span></p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <RiskBadge risk={a.risk} />
              <span className="flex items-center gap-1 font-mono text-xs text-amber-300"><Clock className="h-3 w-3" />{mmss(left)}</span>
            </div>
          </div>
          <dl className="grid gap-1.5 rounded-xl border border-white/[0.07] bg-black/25 p-3 text-xs">
            {Object.entries(a.params).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4"><dt className="text-muted">{titleCase(k)}</dt><dd className="text-right font-medium">{k.includes("amount") && typeof v === "number" ? usd(v) : String(v)}</dd></div>
            ))}
          </dl>
          <div className="flex gap-2">
            <Button variant="success" className="flex-1" onClick={() => onDecide(true)}><Check className="h-4 w-4" /> Approve</Button>
            <Button variant="danger" className="flex-1" onClick={() => onDecide(false)}><X className="h-4 w-4" /> Reject</Button>
          </div>
          {a.event_id && <p className="text-[10px] text-muted">Triggered by event <code>{a.event_id.slice(0, 12)}…</code></p>}
        </CardBody>
      </Card>
    </motion.div>
  );
}

function DecideDialog({ target, onClose }: { target: { a: Approval; approve: boolean }; onClose: () => void }) {
  const [note, setNote] = useState("");
  const decide = useDecide();
  const { a, approve } = target;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={approve ? "Approve action" : "Reject action"} description={`${titleCase(a.action)} requested by ${a.requester}`}>
      <div className="space-y-4">
        <div><Label htmlFor="note">Decision note (audited)</Label><Textarea id="note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for your decision…" /></div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={approve ? "success" : "danger"} disabled={decide.isPending} onClick={() => decide.mutate({ id: a.approval_id, approve, note }, { onSuccess: onClose })}>
            {approve ? "Confirm approval" : "Confirm rejection"}
          </Button>
        </div>
        <Badge tone="neutral">Recorded in Bridge_Audit_Log__c</Badge>
      </div>
    </Dialog>
  );
}
