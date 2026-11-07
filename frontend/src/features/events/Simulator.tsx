import { useState } from "react";
import { Bomb, FileWarning, Play, Rocket, SquarePen } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardBody, CardDescription, CardHeader, CardTitle, Dialog, Input, Label, Select, Textarea, Tip } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api";
import { useIngest, useInvalidateAll } from "@/lib/hooks";
import { DRIFT_PAYLOAD, RANDOM_BURST, SCENARIOS } from "@/lib/scenarios";
import type { EventPayload, Severity } from "@/lib/types";
import { can, useSession } from "@/store/session";

export function Simulator() {
  const user = useSession((s) => s.user);
  const ingest = useIngest();
  const invalidate = useInvalidateAll();
  const allowed = can(user, "events:write");
  const [custom, setCustom] = useState(false);
  const [busy, setBusy] = useState(false);

  async function burst() {
    setBusy(true);
    try {
      await Promise.all(RANDOM_BURST.map((p) => api.ingest(p)));
      toast.success(`Queued ${RANDOM_BURST.length} events on the async bus`);
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
      setTimeout(invalidate, 400);
    }
  }
  async function drift() {
    try {
      await api.ingest(DRIFT_PAYLOAD);
    } catch (e) {
      toast.error(`Schema drift blocked (HTTP ${(e as ApiError).status}): ${(e as ApiError).message}`);
      invalidate();
    }
  }

  return (
    <Card data-testid="simulator">
      <CardHeader>
        <div>
          <CardTitle>Event simulator</CardTitle>
          <CardDescription>{allowed ? "Fire realistic telemetry into the bridge." : "Requires events:write — switch to the AGENT persona."}</CardDescription>
        </div>
        <Badge tone={allowed ? "green" : "neutral"}>{allowed ? "armed" : "locked"}</Badge>
      </CardHeader>
      <CardBody className="space-y-2.5">
        {SCENARIOS.map((s) => (
          <div key={s.id} className="group rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:border-cyan-400/30">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="mt-0.5 text-xs text-muted">{s.tagline}</p>
                <div className="mt-2 flex flex-wrap gap-1">{s.tags.map((t) => <Badge key={t} tone="indigo">{t}</Badge>)}</div>
              </div>
              <Tip label={allowed ? "Send through the full pipeline" : "Your role cannot write events"}>
                <span>
                  <Button size="icon" variant="secondary" aria-label={`Fire ${s.title}`} disabled={!allowed || ingest.isPending} onClick={() => ingest.mutate(s.payload)}>
                    <Play className="h-4 w-4" />
                  </Button>
                </span>
              </Tip>
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="secondary" disabled={!allowed || busy} onClick={burst}><Rocket className="h-4 w-4" /> Burst ×{RANDOM_BURST.length}</Button>
          <Button variant="danger" disabled={!allowed} onClick={drift}><FileWarning className="h-4 w-4" /> Schema drift</Button>
          <Button variant="ghost" className="col-span-2" disabled={!allowed} onClick={() => setCustom(true)}><SquarePen className="h-4 w-4" /> Compose custom event</Button>
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted"><Bomb className="h-3 w-3" /> Drift sends an unknown field — the contract rejects it and records it in the DLQ.</p>
      </CardBody>
      <CustomEvent open={custom} onOpenChange={setCustom} />
    </Card>
  );
}

function CustomEvent({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const ingest = useIngest();
  const [f, setF] = useState({ source: "erp", account_name: "Globex Ltd", severity: "high" as Severity, message: "", amount: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: EventPayload = { source: f.source, account_name: f.account_name, severity: f.severity, message: f.message };
    if (f.amount) payload.amount_usd = Number(f.amount);
    ingest.mutate(payload, { onSuccess: () => onOpenChange(false) });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Compose telemetry event" description="Payload is validated against the versioned TelemetryEvent contract.">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor="ce-source">Source</Label><Input id="ce-source" required value={f.source} onChange={set("source")} /></div>
        <div><Label htmlFor="ce-account">Account name</Label><Input id="ce-account" required value={f.account_name} onChange={set("account_name")} /></div>
        <div><Label htmlFor="ce-sev">Severity</Label>
          <Select id="ce-sev" value={f.severity} onChange={set("severity")}>{["low", "medium", "high", "critical"].map((s) => <option key={s}>{s}</option>)}</Select></div>
        <div><Label htmlFor="ce-amt">Amount (USD)</Label><Input id="ce-amt" type="number" min="0" step="any" value={f.amount} onChange={set("amount")} /></div>
        <div className="sm:col-span-2"><Label htmlFor="ce-msg">Message</Label><Textarea id="ce-msg" required value={f.message} onChange={set("message")} placeholder="Try including an email or card number…" /></div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={ingest.isPending}>Send event</Button>
        </div>
      </form>
    </Dialog>
  );
}
