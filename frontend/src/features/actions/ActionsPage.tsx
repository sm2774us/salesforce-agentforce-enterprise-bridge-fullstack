import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Code2, Play, ShieldAlert, ShieldCheck } from "lucide-react";
import { DecisionBadge, RiskBadge } from "@/components/badges";
import { JsonView } from "@/components/json-view";
import { PageHeader, Rise, Stagger } from "@/components/page";
import { Badge, Button, Card, CardBody, Dialog, Input, Label, Select, Skeleton, Textarea } from "@/components/ui/primitives";
import { useActions, useInvoke } from "@/lib/hooks";
import { fieldsFromSchema, missingRequired, paramsFromValues } from "@/lib/schemaForm";
import type { ActionManifest, ActionOutcome } from "@/lib/types";
import { titleCase } from "@/lib/utils";
import { can, useSession } from "@/store/session";

export function ActionsPage() {
  const { data, isLoading } = useActions();
  const user = useSession((s) => s.user);
  const [sel, setSel] = useState<ActionManifest | null>(null);
  const [schema, setSchema] = useState<ActionManifest | null>(null);
  return (
    <>
      <PageHeader title="Agentforce action catalog" subtitle="Metadata-driven actions, published as an OpenAPI External Service. Risk tier decides whether an action runs autonomously or waits for a human." />
      {isLoading ? <Skeleton className="h-64" /> : (
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.map((a) => (
            <Rise key={a.name}>
              <Card className="h-full" data-testid={`action-${a.name}`}>
                <CardBody className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/5">{a.requiresApproval ? <ShieldAlert className="h-5 w-5 text-amber-300" /> : <ShieldCheck className="h-5 w-5 text-emerald-300" />}</div>
                    <RiskBadge risk={a.risk} />
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-sm font-semibold text-cyan-200">{a.name}</p>
                    <p className="mt-1 text-sm text-muted">{a.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <Badge tone="neutral">{a.permission}</Badge>
                    {a.requiresApproval && <Badge tone="amber">needs human approval</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" variant="secondary" disabled={!can(user, a.permission)} onClick={() => setSel(a)}><Play className="h-4 w-4" /> Invoke</Button>
                    <Button variant="ghost" size="icon" aria-label={`View ${a.name} schema`} onClick={() => setSchema(a)}><Code2 className="h-4 w-4" /></Button>
                  </div>
                  {!can(user, a.permission) && <p className="text-[11px] text-rose-300/80">Your role lacks {a.permission}</p>}
                </CardBody>
              </Card>
            </Rise>
          ))}
        </Stagger>
      )}
      {sel && <InvokeDialog action={sel} onClose={() => setSel(null)} />}
      <Dialog open={!!schema} onOpenChange={(o) => !o && setSchema(null)} title={schema?.name ?? ""} description="JSON Schema exposed to Agentforce via /openapi.json">
        {schema && <JsonView value={schema.inputSchema} className="max-h-96" />}
      </Dialog>
    </>
  );
}

function InvokeDialog({ action, onClose }: { action: ActionManifest; onClose: () => void }) {
  const fields = useMemo(() => fieldsFromSchema(action.inputSchema), [action]);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.name, f.defaultValue])));
  const [result, setResult] = useState<ActionOutcome | null>(null);
  const invoke = useInvoke();
  const missing = missingRequired(fields, values);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Invoke ${action.name}`} description={action.requiresApproval ? "High risk — this will be queued for human approval." : "Low risk — this executes immediately."}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); invoke.mutate({ name: action.name, params: paramsFromValues(fields, values) }, { onSuccess: setResult }); }}>
        {fields.map((f) => (
          <div key={f.name}>
            <Label htmlFor={`f-${f.name}`}>{f.label}{f.required && <span className="text-rose-400"> *</span>}{f.hint && <span className="ml-2 font-normal text-muted/70">{f.hint}</span>}</Label>
            {f.kind === "select" ? (
              <Select id={`f-${f.name}`} value={values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}>{f.options?.map((o) => <option key={o}>{o}</option>)}</Select>
            ) : f.kind === "textarea" ? (
              <Textarea id={`f-${f.name}`} value={values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
            ) : (
              <Input id={`f-${f.name}`} type={f.kind === "number" ? "number" : "text"} step="any" placeholder={f.placeholder} value={values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
            )}
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button type="submit" disabled={invoke.isPending || missing.length > 0} title={missing.length ? `Missing: ${missing.join(", ")}` : undefined}>Submit to control tower</Button>
        </div>
      </form>
      {result && (
        <div className="mt-4 space-y-2" data-testid="invoke-result">
          <div className="flex items-center gap-2"><DecisionBadge decision={result.decision} /><span className="text-xs text-muted">{titleCase(result.action)}</span></div>
          <JsonView value={result} />
          {result.decision === "pending_approval" && <Link to="/approvals" onClick={onClose} className="text-xs text-cyan-300 hover:underline">Go to approval queue →</Link>}
        </div>
      )}
    </Dialog>
  );
}
