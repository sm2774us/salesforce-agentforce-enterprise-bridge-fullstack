import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Loader2, Play, UserCog } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page";
import { Badge, Button, Card, CardBody } from "@/components/ui/primitives";
import { useInvalidateAll } from "@/lib/hooks";
import { useSignIn } from "@/lib/auth";
import { RUNBOOK } from "@/lib/runbook";
import { can, useSession } from "@/store/session";

export function RunbookPage() {
  const user = useSession((s) => s.user);
  const signIn = useSignIn();
  const invalidate = useInvalidateAll();
  const [done, setDone] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<string>) {
    setBusy(id);
    try {
      const msg = await fn();
      setDone((d) => ({ ...d, [id]: msg }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      invalidate();
    }
  }

  const completed = Object.keys(done).length;
  return (
    <>
      <PageHeader title="Executive demo runbook" subtitle="A scripted, repeatable narrative. Each step performs the real API call — switch personas when prompted." actions={<Badge tone="cyan">{completed}/{RUNBOOK.filter((s) => s.run).length} steps run</Badge>} />
      <ol className="relative space-y-4 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-gradient-to-b before:from-cyan-400/50 before:to-indigo-500/10">
        {RUNBOOK.map((s, i) => {
          const allowed = !s.permission || can(user, s.permission);
          return (
            <motion.li key={s.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative pl-14" data-testid={`step-${s.id}`}>
              <span className="absolute left-0 top-4 grid h-10 w-10 place-items-center rounded-full border border-cyan-400/30 bg-card text-sm font-bold text-cyan-200">
                {done[s.id] ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : i + 1}
              </span>
              <Card><CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{s.title}</p>
                    <p className="mt-1 max-w-2xl text-sm text-muted">{s.say}</p>
                  </div>
                  {s.persona && <Badge tone={allowed ? "green" : "amber"}>as {s.persona.label} · {s.persona.role}</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {s.run && (allowed ? (
                    <Button size="sm" disabled={busy !== null} onClick={() => run(s.id, s.run!)}>{busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run step</Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => s.persona && signIn.mutate({ key: s.persona.key, silent: true })}><UserCog className="h-4 w-4" /> Switch to {s.persona?.label}</Button>
                  ))}
                  {s.link && <Link to={s.link.to} className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline">{s.link.label} <ArrowRight className="h-3 w-3" /></Link>}
                </div>
                {done[s.id] && <p className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-200" data-testid="step-result">{done[s.id]}</p>}
              </CardBody></Card>
            </motion.li>
          );
        })}
      </ol>
    </>
  );
}
