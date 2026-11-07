import { motion } from "motion/react";
import { BrainCircuit, Cable, DatabaseZap, Gavel, ScrollText, Send } from "lucide-react";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { AnimatedNumber } from "@/components/charts";
import type { Overview } from "@/lib/types";

export function PipelineFlow({ ov }: { ov?: Overview }) {
  const c = ov?.counters ?? {};
  const stages = [
    { icon: Cable, name: "Ingest", sub: "Schema-checked bus", value: (c.events_processed ?? 0) + (ov?.bus.dlq ?? 0), unit: "events" },
    { icon: DatabaseZap, name: "Ground", sub: "Entity resolution + PII strip", value: c.events_processed ?? 0, unit: "unified" },
    { icon: BrainCircuit, name: "Plan", sub: ov?.planner ?? "Planner", value: c.events_processed ?? 0, unit: "plans" },
    { icon: Gavel, name: "Govern", sub: "RBAC · risk tier · HITL", value: sum(c, "decision_"), unit: "decisions" },
    { icon: Send, name: "Act", sub: "Agentforce actions", value: c.decision_executed ?? 0, unit: "executed" },
    { icon: ScrollText, name: "Audit", sub: "Salesforce audit log", value: sum(c, "decision_"), unit: "records" },
  ];
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Governed agent pipeline</CardTitle>
          <CardDescription>Every event is grounded, planned, governed and audited before anything touches Salesforce.</CardDescription>
        </div>
      </CardHeader>
      <CardBody className="overflow-x-auto">
        <div className="flex min-w-[760px] items-stretch" data-testid="pipeline">
          {stages.map((s, i) => (
            <div key={s.name} className="flex flex-1 items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
                className="relative flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center"
              >
                <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 text-cyan-300 ring-1 ring-cyan-300/20">
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="truncate text-[11px] text-muted">{s.sub}</p>
                <p className="mt-2 font-mono text-lg font-bold text-foreground"><AnimatedNumber value={s.value} /></p>
                <p className="text-[10px] uppercase tracking-wider text-muted">{s.unit}</p>
              </motion.div>
              {i < stages.length - 1 && (
                <svg width="36" height="8" className="shrink-0" aria-hidden>
                  <line x1="0" y1="4" x2="36" y2="4" stroke="#22d3ee" strokeOpacity=".7" strokeWidth="2" strokeDasharray="4 4" className="animate-flow" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function sum(c: Record<string, number>, prefix: string) {
  return Object.entries(c).filter(([k]) => k.startsWith(prefix)).reduce((a, [, v]) => a + v, 0);
}
