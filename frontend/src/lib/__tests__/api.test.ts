import { http, HttpResponse } from "msw";
import { api, ApiError, formatDetail } from "../api";
import { describeOutcome } from "../hooks";
import { server } from "@/test/server";
import { can, useSession } from "@/store/session";

beforeEach(() => useSession.setState({ apiKey: "agent-key", user: null }));

describe("api client", () => {
  it("sends the API key header", async () => {
    expect((await api.whoami()).name).toBe("agent-svc");
  });
  it("expires the session on 401", async () => {
    useSession.setState({ apiKey: "bad" });
    await expect(api.overview()).rejects.toMatchObject({ status: 401 });
    expect(useSession.getState().apiKey).toBe("");
  });
  it("surfaces permission errors with the server detail", async () => {
    useSession.setState({ apiKey: "viewer-key" });
    await expect(api.approvals()).rejects.toThrow("missing permission approvals:decide");
  });
  it("treats non-2xx action outcomes as data, not errors", async () => {
    server.use(http.post("http://api.test/v1/actions/x", () => HttpResponse.json({ decision: "denied", action: "x", detail: "no", result: null, approval_id: null }, { status: 403 })));
    expect((await api.invoke("x", {})).decision).toBe("denied");
  });
  it("throws ApiError when an outcome endpoint returns no outcome", async () => {
    server.use(http.post("http://api.test/v1/approvals/zz/decision", () => HttpResponse.json({ detail: "approval not found" }, { status: 404 })));
    await expect(api.decide("zz", true, "")).rejects.toMatchObject({ status: 404, message: "approval not found" });
  });
  it("expires the session when an outcome endpoint answers 401", async () => {
    useSession.setState({ apiKey: "bad" });
    await expect(api.invoke("create_case", {})).rejects.toBeInstanceOf(ApiError);
    expect(useSession.getState().apiKey).toBe("");
  });
  it("reports an unreachable bridge", async () => {
    server.use(http.get("http://api.test/v1/overview", () => HttpResponse.error()));
    await expect(api.overview()).rejects.toMatchObject({ status: 0, message: expect.stringContaining("unreachable") });
  });
  it("flattens pydantic validation arrays", async () => {
    useSession.setState({ apiKey: "agent-key" });
    await expect(api.ingest({ priority_v2: 1 })).rejects.toThrow("body.priority_v2: Extra inputs are not permitted");
  });
});

describe("helpers", () => {
  it("formats unknown details generically", () => expect(formatDetail(undefined, 500)).toBe("Request failed (500)"));
  it("formats array items without loc", () => expect(formatDetail([{ msg: "bad" }])).toBe("bad"));
  it("describes every decision", () => {
    const mk = (decision: never) => describeOutcome({ decision, action: "a", detail: "d", result: null, approval_id: null });
    expect(mk("executed" as never)).toEqual({ ok: true, text: "a executed" });
    expect(mk("pending_approval" as never).ok).toBe(true);
    expect(mk("denied" as never).text).toMatch(/^Denied/);
    expect(mk("rejected" as never).text).toMatch(/^Rejected/);
    expect(mk("failed" as never).text).toMatch(/^Failed/);
  });
  it("checks permissions", () => {
    expect(can(null, "x")).toBe(false);
    expect(can({ name: "a", role: "AGENT", permissions: ["x"] }, "x")).toBe(true);
  });
});
