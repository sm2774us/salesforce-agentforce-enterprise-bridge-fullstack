"""Tests for the read-only API surface used by the web console."""

import dataclasses

from fastapi.testclient import TestClient

from bridge import cli
from bridge.api import create_app
from bridge.config import Settings, parse_api_keys
from bridge.container import build_container
from bridge.metrics import Metrics
from bridge.salesforce import InMemorySalesforce
from bridge.samples import ACCOUNTS, SAMPLE_EVENTS

A, V, P = {"X-API-Key": "ak"}, {"X-API-Key": "vk"}, {"X-API-Key": "pk"}
KEYS = "ak=svc:AGENT,vk=vic:VIEWER,pk=pat:APPROVER,xk=root:ADMIN"


def _client(**kw):
    s = Settings(api_keys=parse_api_keys(KEYS), **kw)
    c = build_container(s, gateway=InMemorySalesforce(ACCOUNTS))
    return TestClient(create_app(s, c))


def test_console_endpoints_end_to_end():
    with _client() as t:
        for ev in SAMPLE_EVENTS:
            assert (
                t.post("/v1/events?wait=true", json=ev, headers=A).status_code
                == 200
            )
        who = t.get("/v1/whoami", headers=V).json()
        assert who["role"] == "VIEWER" and who["permissions"] == ["events:read"]
        assert t.get("/v1/whoami").status_code == 401
        ov = t.get("/v1/overview", headers=V).json()
        assert ov["mode"] == "offline-in-memory"
        assert ov["pending_approvals"] == 1
        assert ov["counters"]["events_processed"] == len(SAMPLE_EVENTS)
        assert ov["planner"] == "RuleBasedPlanner"
        feed = t.get("/v1/feed?limit=3", headers=V).json()
        assert len(feed) == 3
        assert feed[0]["event"]["event_id"] == feed[0]["result"]["event_id"]
        assert "4111" not in str(feed)
        accts = t.get("/v1/accounts", headers=V).json()
        acme = next(a for a in accts if a["account_key"] == "acme")
        assert acme["event_count"] == 2 and len(acme["aliases"]) == 2
        assert t.get("/v1/dlq", headers=V).json() == []
        cases = t.get("/v1/cases", headers=V).json()
        assert cases and "attributes" not in cases[0]
        pend = t.get("/v1/approvals", headers=P).json()[0]
        assert pend["risk"] == "high" and pend["expires_in_s"] > 0
        assert pend["event_id"]


def test_cors_and_metrics_snapshot():
    with _client(cors_origins=("http://localhost:5173",)) as t:
        r = t.options(
            "/v1/overview",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "x-api-key",
            },
        )
        assert (
            r.headers["access-control-allow-origin"] == "http://localhost:5173"
        )
    m = Metrics()
    m.incr("a")
    m.observe_latency(0.002)
    assert m.snapshot() == {
        "counters": {"a": 1},
        "latency_ms": {"p50": 2.0, "p95": 2.0},
    }


def test_static_ui_and_env_parsing(tmp_path):
    (tmp_path / "index.html").write_text("<html>console</html>")
    with _client(ui_dir=str(tmp_path)) as t:
        assert "console" in t.get("/").text
        assert t.get("/healthz").json() == {"status": "ok"}
    s = Settings.from_env(
        {"BRIDGE_CORS_ORIGINS": "http://a, http://b,", "BRIDGE_UI_DIR": "x"}
    )
    assert s.cors_origins == ("http://a", "http://b") and s.ui_dir == "x"


def test_inmemory_query_order_and_limit():
    import asyncio

    sf = InMemorySalesforce()

    async def go():
        for i in range(3):
            await sf.create_record("Case", {"Subject": str(i)})
        return await sf.query(
            "SELECT Id FROM Case ORDER BY CreatedDate DESC LIMIT 2"
        )

    assert [r["Subject"] for r in asyncio.run(go())] == ["2", "1"]


def test_serve_demo_app(tmp_path, monkeypatch):
    (tmp_path / "frontend" / "dist").mkdir(parents=True)
    (tmp_path / "frontend" / "dist" / "index.html").write_text(
        "<html>ui</html>"
    )
    monkeypatch.chdir(tmp_path)
    app = cli._serve_app(demo=True)
    with TestClient(app) as t:
        assert "ui" in t.get("/").text
        who = t.get("/v1/whoami", headers={"X-API-Key": "approver-key"}).json()
        assert who["name"] == "jane"
    plain = cli._serve_app(demo=False)
    assert plain is not None
    assert dataclasses.is_dataclass(Settings)
