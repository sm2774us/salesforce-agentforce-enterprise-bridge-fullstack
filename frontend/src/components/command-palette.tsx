import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog as D } from "radix-ui";
import { Search } from "lucide-react";
import { useIngest } from "@/lib/hooks";
import { useSignIn } from "@/lib/auth";
import { DEMO_PERSONAS, SCENARIOS } from "@/lib/scenarios";
import { can, useSession } from "@/store/session";

interface Cmd { id: string; label: string; group: string; run: () => void }

const PAGES: [string, string][] = [
  ["/", "Overview"], ["/events", "Event Stream"], ["/approvals", "Approvals"], ["/actions", "Action Catalog"],
  ["/accounts", "Accounts 360"], ["/audit", "Audit Trail"], ["/salesforce", "Salesforce Cases"], ["/runbook", "Demo Runbook"],
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const ingest = useIngest();
  const signIn = useSignIn();
  const user = useSession((s) => s.user);
  const [q, setQ] = useState("");
  const canWrite = can(user, "events:write");
  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const cmds = useMemo<Cmd[]>(
    () => [
      ...PAGES.map(([to, label]) => ({ id: `go-${to}`, label: `Go to ${label}`, group: "Navigate", run: () => navigate({ to }) })),
      ...(canWrite
        ? SCENARIOS.map((s) => ({ id: `fire-${s.id}`, label: `Fire: ${s.title}`, group: "Simulate", run: () => ingest.mutate(s.payload) }))
        : []),
      ...DEMO_PERSONAS.map((p) => ({ id: `as-${p.role}`, label: `Act as ${p.name} (${p.role})`, group: "Persona", run: () => signIn.mutate({ key: p.key, silent: true }) })),
    ],
    [navigate, canWrite, ingest, signIn],
  );
  const shown = cmds.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <D.Content className="glass fixed left-1/2 top-[18%] z-50 w-[min(92vw,560px)] -translate-x-1/2 overflow-hidden rounded-2xl bg-card shadow-2xl">
          <D.Title className="sr-only">Command palette</D.Title>
          <D.Description className="sr-only">Search commands</D.Description>
          <div className="flex items-center gap-2 border-b border-white/10 px-4">
            <Search className="h-4 w-4 text-muted" />
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a command…" aria-label="Command search"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
              onKeyDown={(e) => { if (e.key === "Enter" && shown[0]) { shown[0].run(); onOpenChange(false); } }}
            />
          </div>
          <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
            {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No matching commands</li>}
            {shown.map((c) => (
              <li key={c.id}>
                <button
                  role="option" aria-selected="false"
                  onClick={() => { c.run(); onOpenChange(false); }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.07]"
                >
                  <span>{c.label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted">{c.group}</span>
                </button>
              </li>
            ))}
          </ul>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
