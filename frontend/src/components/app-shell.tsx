import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { DropdownMenu } from "radix-ui";
import { motion } from "motion/react";
import {
  Activity, BookOpenCheck, Building2, ChevronDown, Command, Database, LayoutDashboard,
  LogOut, Radio, ScrollText, ShieldCheck, Users, Wand2, Zap,
} from "lucide-react";
import { Badge, Button, Tip } from "@/components/ui/primitives";
import { CommandPalette } from "@/components/command-palette";
import { useOverview } from "@/lib/hooks";
import { useSignIn } from "@/lib/auth";
import { DEMO_PERSONAS } from "@/lib/scenarios";
import { cn } from "@/lib/utils";
import { useSession } from "@/store/session";
import { Toaster } from "sonner";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/events", label: "Event Stream", icon: Activity },
  { to: "/approvals", label: "Approvals", icon: ShieldCheck, badge: true },
  { to: "/actions", label: "Action Catalog", icon: Wand2 },
  { to: "/accounts", label: "Accounts 360", icon: Building2 },
  { to: "/audit", label: "Audit Trail", icon: ScrollText },
  { to: "/salesforce", label: "Salesforce", icon: Database },
  { to: "/runbook", label: "Demo Runbook", icon: BookOpenCheck },
] as const;

export function AppShell() {
  const { data: ov } = useOverview();
  const [palette, setPalette] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((o) => !o);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="relative flex h-full overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] animate-aurora rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute -right-32 top-1/3 h-[30rem] w-[30rem] animate-aurora rounded-full bg-indigo-500/15 blur-[120px] [animation-delay:-6s]" />
        <div className="grid-bg absolute inset-0" />
      </div>
      <aside className="relative z-10 hidden w-64 shrink-0 flex-col border-r border-white/[0.07] bg-black/20 p-4 backdrop-blur-xl md:flex">
        <Brand />
        <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Primary">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
              activeProps={{ className: "!text-foreground bg-white/[0.07]", "aria-current": "page" }}
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  {isActive && <motion.span layoutId="nav-active" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gradient-to-b from-cyan-300 to-indigo-400" />}
                  <n.icon className="h-4 w-4" />
                  <span className="flex-1">{n.label}</span>
                  {"badge" in n && !!ov?.pending_approvals && (
                    <span data-testid="nav-approvals-badge" className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      {ov.pending_approvals}
                    </span>
                  )}
                </>
              )}
            </Link>
          ))}
        </nav>
        <p className="px-2 text-[11px] text-muted/70">v{ov?.version ?? "–"} · Press <kbd className="rounded border border-white/10 px-1">⌘K</kbd></p>
      </aside>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar onPalette={() => setPalette(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-10 pt-6 md:px-8">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette open={palette} onOpenChange={setPalette} />
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-[0_0_30px_-4px_rgba(34,211,238,.7)]">
        <ShieldCheck className="h-5 w-5 text-slate-950" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-tight">AI Control Tower</p>
        <p className="text-[11px] text-muted">Agentforce Enterprise Bridge</p>
      </div>
    </div>
  );
}

function Topbar({ onPalette }: { onPalette: () => void }) {
  const { data: ov, isError } = useOverview();
  const { user, live, setLive } = useSession();
  const signIn = useSignIn();
  const logout = useSession((s) => s.logout);
  const navigate = useNavigate();
  const healthy = !!ov && ov.bus.running && ov.salesforce_circuit !== "open" && !isError;

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.07] bg-black/10 px-4 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-2" data-testid="health">
        <span className="relative flex h-2.5 w-2.5">
          {healthy && <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />}
          <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", healthy ? "bg-emerald-400" : "bg-rose-500")} />
        </span>
        <span className="text-sm font-medium">{healthy ? "All systems nominal" : isError ? "Bridge unreachable" : "Connecting…"}</span>
        {ov && (
          <Badge tone={ov.mode === "live-salesforce" ? "cyan" : "indigo"} data-testid="mode-badge">
            {ov.mode === "live-salesforce" ? "Live Salesforce" : "Offline CRM"}
          </Badge>
        )}
      </div>
      <div className="flex-1" />
      <Tip label={live ? "Auto-refresh on (click to pause)" : "Paused (click to resume)"}>
        <Button variant="ghost" size="sm" onClick={() => setLive(!live)} aria-pressed={live} aria-label="Toggle live updates">
          <Radio className={cn("h-4 w-4", live && "text-emerald-400")} />
          <span className="hidden sm:inline">{live ? "Live" : "Paused"}</span>
        </Button>
      </Tip>
      <Button variant="secondary" size="sm" onClick={onPalette} aria-label="Open command palette">
        <Command className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Command</span>
      </Button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="secondary" size="sm" data-testid="persona-trigger" className="gap-2">
            <Users className="h-4 w-4 text-cyan-300" />
            <span>{user?.name}</span>
            <Badge tone="cyan" data-testid="role-badge">{user?.role}</Badge>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={8} className="glass z-50 w-72 rounded-xl bg-card p-1.5 shadow-2xl">
            <DropdownMenu.Label className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Switch persona (demo)</DropdownMenu.Label>
            {DEMO_PERSONAS.map((p) => (
              <DropdownMenu.Item
                key={p.key}
                onSelect={() => signIn.mutate({ key: p.key, silent: true })}
                className="flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-white/[0.07]"
              >
                <Zap className="mt-0.5 h-4 w-4 text-indigo-300" />
                <span>
                  <span className="font-medium">{p.name}</span> <span className="text-[11px] text-cyan-300">{p.role}</span>
                  <span className="block text-xs text-muted">{p.blurb}</span>
                </span>
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-white/10" />
            <DropdownMenu.Item
              onSelect={() => { logout(); navigate({ to: "/login" }); }}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-rose-300 outline-none data-[highlighted]:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}
