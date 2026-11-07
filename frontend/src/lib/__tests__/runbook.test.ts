import { http, HttpResponse } from "msw";
import { RUNBOOK } from "../runbook";
import { server } from "@/test/server";
import { useSession } from "@/store/session";

const step = (id: string) => RUNBOOK.find((s) => s.id === id)!;

describe("runbook", () => {
  beforeEach(() => useSession.setState({ apiKey: "agent-key" }));

  it("is a coherent narrative", () => {
    expect(RUNBOOK.length).toBeGreaterThanOrEqual(6);
    for (const s of RUNBOOK.filter((x) => x.persona)) expect(s.permission).toBeTruthy();
    expect(new Set(RUNBOOK.map((s) => s.id)).size).toBe(RUNBOOK.length);
  });
  it("runs the PII, alias and invoice steps through the pipeline", async () => {
    expect(await step("pii").run!()).toMatch(/create_case/);
    expect(await step("alias").run!()).toMatch(/acme/);
    expect(await step("invoice").run!()).toMatch(/executed/);
  });
  it("approves the first pending request", async () => {
    useSession.setState({ apiKey: "approver-key" });
    expect(await step("approve").run!()).toMatch(/executed/);
  });
  it("explains when nothing is pending", async () => {
    useSession.setState({ apiKey: "approver-key" });
    server.use(http.get("http://api.test/v1/approvals", () => HttpResponse.json([])));
    expect(await step("approve").run!()).toMatch(/Nothing pending/);
  });
  it("probes policy and reports the verdict", async () => {
    expect(await step("probe").run!()).toMatch(/Control tower said/);
  });
  it("shows drift being blocked", async () => {
    expect(await step("drift").run!()).toMatch(/Blocked with HTTP 422/);
  });
  it("flags an unexpectedly accepted drift payload", async () => {
    server.use(http.post("http://api.test/v1/events", () => HttpResponse.json({ event_id: "1", status: "accepted" }, { status: 202 })));
    expect(await step("drift").run!()).toMatch(/Unexpectedly/);
  });
});
