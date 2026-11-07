import { createHashHistory, createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AccountsPage } from "@/features/accounts/AccountsPage";
import { ActionsPage } from "@/features/actions/ActionsPage";
import { ApprovalsPage } from "@/features/approvals/ApprovalsPage";
import { AuditPage } from "@/features/audit/AuditPage";
import { EventsPage } from "@/features/events/EventsPage";
import { LoginPage } from "@/features/login/LoginPage";
import { OverviewPage } from "@/features/overview/OverviewPage";
import { RunbookPage } from "@/features/runbook/RunbookPage";
import { SalesforcePage } from "@/features/salesforce/SalesforcePage";
import { useSession } from "@/store/session";

const root = createRootRoute({ component: Outlet });
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  beforeLoad: () => {
    if (useSession.getState().apiKey) throw redirect({ to: "/" });
  },
  component: LoginPage,
});
const shell = createRoute({
  getParentRoute: () => root,
  id: "shell",
  beforeLoad: () => {
    if (!useSession.getState().apiKey) throw redirect({ to: "/login" });
  },
  component: AppShell,
});
const page = <P extends string>(path: P, component: () => React.JSX.Element) =>
  createRoute({ getParentRoute: () => shell, path, component });

const tree = root.addChildren([
  login,
  shell.addChildren([
    page("/", OverviewPage),
    page("/events", EventsPage),
    page("/approvals", ApprovalsPage),
    page("/actions", ActionsPage),
    page("/accounts", AccountsPage),
    page("/audit", AuditPage),
    page("/salesforce", SalesforcePage),
    page("/runbook", RunbookPage),
  ]),
]);

export const createAppRouter = (history = createHashHistory()) =>
  createRouter({ routeTree: tree, history, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
