import { useState } from "react";
import { motion } from "motion/react";
import { KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { Badge, Button, Card, Input, Label } from "@/components/ui/primitives";
import { useSignIn } from "@/lib/auth";
import { DEMO_PERSONAS } from "@/lib/scenarios";

const SHOW_PERSONAS = import.meta.env.VITE_DEMO_PERSONAS !== "false";

export function LoginPage() {
  const [key, setKey] = useState("");
  const signIn = useSignIn();
  const failed = signIn.isError;

  return (
    <div className="relative grid min-h-full place-items-center overflow-hidden px-4 py-10">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute left-1/2 top-[-10rem] h-[40rem] w-[40rem] -translate-x-1/2 animate-aurora rounded-full bg-gradient-to-tr from-cyan-500/25 to-indigo-500/25 blur-[130px]" />
        <div className="grid-bg absolute inset-0" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative w-full max-w-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-[0_0_60px_-6px_rgba(34,211,238,.8)]">
            <ShieldCheck className="h-8 w-8 text-slate-950" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight"><span className="text-gradient">AI Control Tower</span></h1>
          <p className="mt-3 text-muted">Govern every agent action between your enterprise telemetry and Salesforce Agentforce.</p>
        </div>
        <Card className="p-6">
          <form
            onSubmit={(e) => { e.preventDefault(); if (key.trim()) signIn.mutate({ key }); }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="api-key">Bridge API key</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
                <Input id="api-key" type="password" autoComplete="off" className="pl-9" placeholder="X-API-Key" value={key} onChange={(e) => setKey(e.target.value)} />
              </div>
              {failed && <p role="alert" className="mt-2 text-xs text-rose-300">{signIn.error.status === 401 ? "That key was not recognised." : signIn.error.message}</p>}
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={!key.trim() || signIn.isPending}>
              {signIn.isPending ? "Verifying…" : "Enter control tower"}
            </Button>
          </form>
          {SHOW_PERSONAS && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted"><Sparkles className="h-3.5 w-3.5 text-cyan-300" /> Demo personas</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_PERSONAS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => signIn.mutate({ key: p.key })}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.06]"
                    data-testid={`persona-${p.role}`}
                  >
                    <div className="flex items-center justify-between"><span className="text-sm font-semibold">{p.name}</span><Badge tone="cyan">{p.role}</Badge></div>
                    <p className="mt-1 text-xs text-muted">{p.blurb}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
