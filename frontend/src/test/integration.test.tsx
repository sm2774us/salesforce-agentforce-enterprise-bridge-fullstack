import { http, HttpResponse } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
import { server, calls } from "./server";
import { renderApp } from "./utils";
import { useSession } from "@/store/session";

describe("authentication & routing", () => {
  it("redirects unauthenticated visitors to the login screen", async () => {
    renderApp("/events");
    expect(await screen.findByRole("heading", { name: /AI Control Tower/ })).toBeInTheDocument();
  });

  it("rejects an unknown key with an inline error", async () => {
    const { user } = renderApp("/login");
    await user.type(await screen.findByLabelText(/Bridge API key/), "nope");
    await user.click(screen.getByRole("button", { name: /Enter control tower/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("not recognised");
    expect(useSession.getState().apiKey).toBe("");
  });

  it("signs in with a pasted key and lands on mission control", async () => {
    const { user } = renderApp("/login");
    await user.type(await screen.findByLabelText(/Bridge API key/), "agent-key");
    await user.click(screen.getByRole("button", { name: /Enter control tower/ }));
    expect(await screen.findByText("Mission control")).toBeInTheDocument();
    expect(useSession.getState().user?.role).toBe("AGENT");
  });

  it("signs in through a demo persona chip", async () => {
    const { user } = renderApp("/login");
    await user.click(await screen.findByTestId("persona-APPROVER"));
    expect(await screen.findByText("Mission control")).toBeInTheDocument();
    expect(await screen.findByTestId("role-badge")).toHaveTextContent("APPROVER");
  });

  it("surfaces a server outage on the login form", async () => {
    server.use(http.get("http://api.test/v1/whoami", () => HttpResponse.error()));
    const { user } = renderApp("/login");
    await user.type(await screen.findByLabelText(/Bridge API key/), "agent-key");
    await user.click(screen.getByRole("button", { name: /Enter control tower/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/unreachable/i);
  });

  it("signs out from the persona menu", async () => {
    const { user } = renderApp("/", "agent-key");
    await user.click(await screen.findByTestId("persona-trigger"));
    await user.click(await screen.findByText("Sign out"));
    expect(await screen.findByLabelText(/Bridge API key/)).toBeInTheDocument();
    expect(useSession.getState().apiKey).toBe("");
  });

  it("switches persona in place and updates the role badge", async () => {
    const { user } = renderApp("/", "agent-key");
    await user.click(await screen.findByTestId("persona-trigger"));
    await user.click(await screen.findByText("jane"));
    await waitFor(() => expect(screen.getByTestId("role-badge")).toHaveTextContent("APPROVER"));
  });
});

describe("mission control", () => {
  it("renders KPIs, pipeline, health and live activity from the API", async () => {
    renderApp("/", "agent-key");
    expect(await screen.findByTestId("pipeline")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("kpi-pending")).toHaveTextContent("Awaiting human"));
    expect(await screen.findByText("Acme Corporation")).toBeInTheDocument();
    expect(screen.getByText("RuleBasedPlanner")).toBeInTheDocument();
    expect(screen.getByTestId("mode-badge")).toHaveTextContent("Offline CRM");
    expect(screen.getByTestId("nav-approvals-badge")).toHaveTextContent("1");
  });

  it("shows an unreachable banner when the overview call fails", async () => {
    server.use(http.get("http://api.test/v1/overview", () => HttpResponse.error()));
    renderApp("/", "agent-key");
    expect(await screen.findByText("Bridge unreachable")).toBeInTheDocument();
  });
});

describe("event stream", () => {
  it("filters by severity and search, and shows redaction tokens", async () => {
    const { user } = renderApp("/events", "agent-key");
    const table = await screen.findByTestId("feed-table");
    expect(within(table).getAllByTestId("table-row")).toHaveLength(3);
    expect(within(table).getAllByTestId("redaction").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "critical" }));
    expect(within(screen.getByTestId("feed-table")).getAllByTestId("table-row")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "all" }));
    await user.type(screen.getByLabelText("Search events"), "heartbeat");
    expect(within(screen.getByTestId("feed-table")).getAllByTestId("table-row")).toHaveLength(1);
    await user.clear(screen.getByLabelText("Search events"));
    await user.type(screen.getByLabelText("Search events"), "zzz");
    expect(await screen.findByText("No events match your filters")).toBeInTheDocument();
  });

  it("opens forensics with entity resolution and rationale", async () => {
    const { user } = renderApp("/events", "agent-key");
    const rows = await within(await screen.findByTestId("feed-table")).findAllByTestId("table-row");
    await user.click(rows[0]);
    const dlg = await screen.findByRole("dialog");
    expect(within(dlg).getByText("What the planner saw")).toBeInTheDocument();
    expect(within(dlg).getByText("rule matched")).toBeInTheDocument();
    expect(within(dlg).getByText(/2 PII items redacted/)).toBeInTheDocument();
  });

  it("sorts a column when its header is clicked", async () => {
    const { user } = renderApp("/events", "agent-key");
    const table = await screen.findByTestId("feed-table");
    await user.click(within(table).getByRole("button", { name: /Account/ }));
    const first = within(within(table).getAllByTestId("table-row")[0]).getAllByRole("cell")[1];
    expect(first).toHaveTextContent("Acme Corporation");
    await user.click(within(table).getByRole("button", { name: /Account/ }));
    expect(within(within(table).getAllByTestId("table-row")[0]).getAllByRole("cell")[1]).toHaveTextContent("Initech");
  });

  it("fires a scenario through the pipeline as an AGENT", async () => {
    const { user } = renderApp("/events", "agent-key");
    await user.click(await screen.findByLabelText("Fire $25k invoice mismatch"));
    await waitFor(() => expect(calls.some((c) => c.path === "/v1/events")).toBe(true));
    expect(calls[0].body).toMatchObject({ account_name: "Globex Ltd", amount_usd: 25000 });
  });

  it("queues a burst and blocks schema drift with a clear message", async () => {
    const { user } = renderApp("/events", "agent-key");
    await user.click(await screen.findByRole("button", { name: /Burst/ }));
    await waitFor(() => expect(calls.length).toBe(6));
    await user.click(screen.getByRole("button", { name: /Schema drift/ }));
    expect(await screen.findByText(/Schema drift blocked \(HTTP 422\)/)).toBeInTheDocument();
  });

  it("composes and sends a custom event", async () => {
    const { user } = renderApp("/events", "agent-key");
    await user.click(await screen.findByRole("button", { name: /Compose custom event/ }));
    await user.type(screen.getByLabelText("Message"), "Custom outage jane@x.com");
    await user.type(screen.getByLabelText("Amount (USD)"), "12000");
    await user.click(screen.getByRole("button", { name: "Send event" }));
    await waitFor(() => expect(calls[0]?.body).toMatchObject({ message: "Custom outage jane@x.com", amount_usd: 12000, severity: "high" }));
  });

  it("locks the simulator for read-only roles", async () => {
    renderApp("/events", "viewer-key");
    expect(await screen.findByLabelText("Fire $25k invoice mismatch")).toBeDisabled();
    expect(screen.getByText("locked")).toBeInTheDocument();
  });
});

describe("approvals", () => {
  it("explains the role requirement to non-approvers", async () => {
    renderApp("/approvals", "agent-key");
    expect(await screen.findByText("Approver role required")).toBeInTheDocument();
  });

  it("lists pending requests with parameters and a countdown", async () => {
    renderApp("/approvals", "approver-key");
    const card = await screen.findByTestId("approval-card");
    expect(within(card).getByText("Create Financial Review")).toBeInTheDocument();
    expect(within(card).getByText("$25,000")).toBeInTheDocument();
    expect(within(card).getByText(/1[34]:\d\d/)).toBeInTheDocument();
  });

  it("approves with an audited note", async () => {
    const { user } = renderApp("/approvals", "approver-key");
    await user.click(await screen.findByRole("button", { name: /Approve/ }));
    await user.type(screen.getByLabelText(/Decision note/), "Looks right");
    await user.click(screen.getByRole("button", { name: "Confirm approval" }));
    await waitFor(() => expect(calls.at(-1)).toMatchObject({ path: "/v1/approvals/ap1/decision", body: { approve: true, note: "Looks right" } }));
    expect(await screen.findByText("create_financial_review executed")).toBeInTheDocument();
  });

  it("rejects a request", async () => {
    const { user } = renderApp("/approvals", "approver-key");
    await user.click(await screen.findByRole("button", { name: /Reject/ }));
    await user.click(screen.getByRole("button", { name: "Confirm rejection" }));
    await waitFor(() => expect(calls.at(-1)?.body).toMatchObject({ approve: false }));
  });

  it("shows separation-of-duties denial as an error toast", async () => {
    useSession.setState({ apiKey: "agent-key" });
    server.use(http.get("http://api.test/v1/approvals", () => HttpResponse.json([{ approval_id: "ap1", requester: "agent-svc", action: "escalate_case", params: {}, event_id: null, expires_in_s: 10, risk: "high" }])));
    const { user } = renderApp("/approvals", "approver-key");
    useSession.setState({ apiKey: "agent-key" }); // same identity as requester → backend denies
    await user.click(await screen.findByRole("button", { name: /Approve/ }));
    await user.click(screen.getByRole("button", { name: "Confirm approval" }));
    expect(await screen.findByText(/separation of duties/i)).toBeInTheDocument();
  });

  it("shows an empty queue state", async () => {
    server.use(http.get("http://api.test/v1/approvals", () => HttpResponse.json([])));
    renderApp("/approvals", "approver-key");
    expect(await screen.findByText("Queue is clear")).toBeInTheDocument();
  });
});

describe("action catalog", () => {
  it("renders risk tiers and gates invocation by permission", async () => {
    renderApp("/actions", "approver-key");
    const card = await screen.findByTestId("action-create_case");
    expect(within(card).getByRole("button", { name: /Invoke/ })).toBeDisabled();
    expect(within(card).getByText(/lacks action:create_case/)).toBeInTheDocument();
  });

  it("builds a form from the schema and invokes a low-risk action", async () => {
    const { user } = renderApp("/actions", "agent-key");
    await user.click(within(await screen.findByTestId("action-create_case")).getByRole("button", { name: /Invoke/ }));
    const submit = screen.getByRole("button", { name: /Submit to control tower/ });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(/Account Name/), "Acme Corporation");
    await user.type(screen.getByLabelText(/Subject/), "Outage");
    await user.selectOptions(screen.getByLabelText(/Priority/), "High");
    await user.click(submit);
    const result = await screen.findByTestId("invoke-result");
    expect(within(result).getByTestId("decision-executed")).toBeInTheDocument();
    expect(calls[0]).toMatchObject({ path: "/v1/actions/create_case", body: { params: { account_name: "Acme Corporation", subject: "Outage", priority: "High" } } });
  });

  it("queues a high-risk action and links to the approval queue", async () => {
    const { user } = renderApp("/actions", "agent-key");
    await user.click(within(await screen.findByTestId("action-create_financial_review")).getByRole("button", { name: /Invoke/ }));
    await user.type(screen.getByLabelText(/Account Name/), "Globex Ltd");
    await user.type(screen.getByLabelText(/Amount Usd/), "5000");
    await user.type(screen.getByLabelText(/Reason/), "check");
    await user.click(screen.getByRole("button", { name: /Submit to control tower/ }));
    const result = await screen.findByTestId("invoke-result");
    expect(within(result).getByTestId("decision-pending_approval")).toBeInTheDocument();
    expect(within(result).getByText(/approval queue/)).toBeInTheDocument();
  });

  it("shows the JSON schema exposed to Agentforce", async () => {
    const { user } = renderApp("/actions", "agent-key");
    await user.click(await screen.findByLabelText("View create_case schema"));
    expect(await screen.findByText(/"account_name"/)).toBeInTheDocument();
  });
});

describe("accounts, audit, salesforce", () => {
  it("shows resolved aliases per canonical account", async () => {
    renderApp("/accounts", "viewer-key");
    const card = await screen.findByTestId("account-card");
    expect(within(card).getByText("ACME Corp.")).toBeInTheDocument();
    expect(within(card).getByText("key: acme")).toBeInTheDocument();
  });

  it("filters the audit trail by decision and opens a record", async () => {
    const { user } = renderApp("/audit", "viewer-key");
    const table = await screen.findByTestId("audit-table");
    expect(within(table).getAllByTestId("table-row")).toHaveLength(2);
    await user.selectOptions(screen.getByLabelText("Decision filter"), "denied");
    expect(within(screen.getByTestId("audit-table")).getAllByTestId("table-row")).toHaveLength(1);
    await user.click(within(screen.getByTestId("audit-table")).getByTestId("table-row"));
    expect(await screen.findByText("Audit record")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.type(screen.getByLabelText("Search audit"), "nomatch");
    expect(await screen.findByText("No audit records")).toBeInTheDocument();
  });

  it("lists Salesforce cases created by governed actions", async () => {
    renderApp("/salesforce", "viewer-key");
    const item = await screen.findByTestId("case-item");
    expect(item).toHaveTextContent("Financial review: $25,000.00");
    expect(within(item).getByText("High")).toBeInTheDocument();
  });

  it("shows an empty state when no cases exist", async () => {
    server.use(http.get("http://api.test/v1/cases", () => HttpResponse.json([])));
    renderApp("/salesforce", "viewer-key");
    expect(await screen.findByText("No cases yet")).toBeInTheDocument();
  });
});

describe("runbook & command palette", () => {
  it("runs a scripted step and records its result", async () => {
    const { user } = renderApp("/runbook", "agent-key");
    const step = await screen.findByTestId("step-pii");
    await user.click(within(step).getByRole("button", { name: /Run step/ }));
    expect(await within(step).findByTestId("step-result")).toHaveTextContent(/create_case/);
  });

  it("offers a persona switch when the role lacks permission", async () => {
    const { user } = renderApp("/runbook", "viewer-key");
    const step = await screen.findByTestId("step-approve");
    await user.click(within(step).getByRole("button", { name: /Switch to jane/ }));
    await waitFor(() => expect(useSession.getState().user?.role).toBe("APPROVER"));
  });

  it("navigates and fires scenarios from the command palette", async () => {
    const { user, router } = renderApp("/", "agent-key");
    await screen.findByText("Mission control");
    await user.keyboard("{Control>}k{/Control}");
    const input = await screen.findByLabelText("Command search");
    await user.type(input, "audit");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(router.state.location.pathname).toBe("/audit"));
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByLabelText("Command search"), "Fire: Payments");
    await user.click(await screen.findByRole("option", { name: /Fire: Payments gateway outage/ }));
    await waitFor(() => expect(calls[0]?.path).toBe("/v1/events"));
  });

  it("shows an empty-state message for unmatched commands", async () => {
    const { user } = renderApp("/", "viewer-key");
    await screen.findByText("Mission control");
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByLabelText("Command search"), "qqqq");
    expect(await screen.findByText("No matching commands")).toBeInTheDocument();
  });

  it("pauses live updates from the top bar", async () => {
    const { user } = renderApp("/", "agent-key");
    useSession.setState({ live: true });
    await user.click(await screen.findByLabelText("Toggle live updates"));
    expect(useSession.getState().live).toBe(false);
  });
});
