"""FastAPI surface; /openapi.json doubles as the Agentforce External Service."""

import hmac
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ValidationError

from bridge import __version__
from bridge.approvals import ApprovalExpiredError, ApprovalNotFoundError
from bridge.bus import BusFullError, SchemaDriftError
from bridge.config import Settings
from bridge.container import Container, build_container
from bridge.models import ActionRequest, Decision, Principal, TelemetryEvent
from bridge.rbac import RbacPolicy

_STATUS = {
    Decision.EXECUTED: 200,
    Decision.PENDING_APPROVAL: 202,
    Decision.DENIED: 403,
    Decision.REJECTED: 422,
    Decision.FAILED: 502,
}


class ActionBody(BaseModel):
    """Body for direct action invocation."""

    params: dict[str, Any] = Field(default_factory=dict)
    event_id: str | None = None


class DecisionBody(BaseModel):
    """Body for approval decisions."""

    approve: bool
    note: str = Field(default="", max_length=500)


def create_app(
    settings: Settings | None = None, container: Container | None = None
) -> FastAPI:
    """Creates the ASGI application."""
    settings = settings or Settings.from_env()
    c = container or build_container(settings)
    policy = RbacPolicy()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        await c.bus.start()
        try:
            yield
        finally:
            await c.bus.stop()
            await c.aclose()

    app = FastAPI(
        title="Agentforce Enterprise Bridge",
        version=__version__,
        lifespan=lifespan,
    )

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.cors_origins),
            allow_methods=["GET", "POST"],
            allow_headers=["X-API-Key", "Content-Type"],
        )

    def authenticate(x_api_key: str | None = Header(default=None)) -> Principal:
        if x_api_key:
            for key, principal in settings.api_keys.items():
                if hmac.compare_digest(key.encode(), x_api_key.encode()):
                    return principal
        raise HTTPException(401, "invalid or missing API key")

    def require(permission: str):
        def dependency(
            principal: Principal = Depends(authenticate),
        ) -> Principal:
            if not policy.allows(principal.role, permission):
                raise HTTPException(403, f"missing permission {permission}")
            return principal

        return dependency

    @app.get("/healthz")
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/readyz")
    async def readyz() -> JSONResponse:
        circuit = getattr(c.gateway, "breaker_state", "n/a")
        ready = c.bus.running and circuit != "open"
        return JSONResponse(
            {
                "bus": c.bus.running,
                "salesforce_circuit": circuit,
                "audit_pending_sync": c.audit.pending_sync,
            },
            status_code=200 if ready else 503,
        )

    @app.get("/metrics", response_class=PlainTextResponse)
    async def metrics() -> str:
        return c.metrics.render()

    @app.get("/v1/actions")
    async def actions(_: Principal = Depends(require("events:read"))):
        return c.registry.manifest()

    @app.post("/v1/events")
    async def ingest(
        request: Request,
        wait: bool = False,
        _: Principal = Depends(require("events:write")),
    ) -> JSONResponse:
        try:
            payload = await request.json()
        except ValueError:
            raise HTTPException(400, "body must be JSON") from None
        if not isinstance(payload, dict):
            raise HTTPException(422, "body must be a JSON object")
        if wait:
            try:
                event = TelemetryEvent.model_validate(payload)
            except ValidationError as exc:
                raise HTTPException(
                    422,
                    exc.errors(
                        include_url=False,
                        include_context=False,
                        include_input=False,
                    ),
                ) from exc
            result = await c.pipeline.process(event)
            return JSONResponse(result.model_dump(mode="json"))
        try:
            event, is_new = c.bus.publish_raw(payload)
        except SchemaDriftError as exc:
            raise HTTPException(422, exc.errors) from exc
        except BusFullError:
            return JSONResponse(
                {"detail": "queue full"},
                status_code=429,
                headers={"Retry-After": "1"},
            )
        return JSONResponse(
            {
                "event_id": event.event_id,
                "status": "accepted" if is_new else "duplicate",
            },
            status_code=202 if is_new else 200,
        )

    @app.post("/v1/actions/{name}")
    async def invoke(
        name: str,
        body: ActionBody,
        principal: Principal = Depends(authenticate),
    ) -> JSONResponse:
        outcome = await c.tower.submit(
            principal,
            ActionRequest(
                action=name, params=body.params, event_id=body.event_id
            ),
        )
        return JSONResponse(
            outcome.model_dump(mode="json"),
            status_code=_STATUS[outcome.decision],
        )

    @app.get("/v1/approvals")
    async def approvals(_: Principal = Depends(require("approvals:decide"))):
        return [
            {
                "approval_id": p.approval_id,
                "requester": p.requester.name,
                "action": p.request.action,
                "params": p.request.params,
                "event_id": p.request.event_id,
                "expires_in_s": c.approvals.seconds_left(p),
                "risk": c.registry.get(p.request.action).risk.value,
            }
            for p in c.approvals.list_pending()
        ]

    @app.post("/v1/approvals/{approval_id}/decision")
    async def decide(
        approval_id: str,
        body: DecisionBody,
        principal: Principal = Depends(authenticate),
    ) -> JSONResponse:
        try:
            outcome = await c.tower.decide(
                principal, approval_id, body.approve, body.note
            )
        except ApprovalNotFoundError:
            raise HTTPException(404, "approval not found") from None
        except ApprovalExpiredError:
            raise HTTPException(410, "approval expired") from None
        return JSONResponse(
            outcome.model_dump(mode="json"),
            status_code=_STATUS[outcome.decision],
        )

    @app.get("/v1/audit")
    async def audit(
        limit: int = 50, _: Principal = Depends(require("events:read"))
    ):
        return [
            r.model_dump(mode="json")
            for r in c.audit.recent(max(1, min(limit, 500)))
        ]

    @app.get("/v1/whoami")
    async def whoami(principal: Principal = Depends(authenticate)):
        grants = sorted(
            perm
            for perm in (
                "events:read",
                "events:write",
                "approvals:decide",
                *(f"action:{n}" for n in c.registry.names()),
            )
            if policy.allows(principal.role, perm)
        )
        return {
            "name": principal.name,
            "role": principal.role.value,
            "permissions": grants,
        }

    @app.get("/v1/overview")
    async def overview(_: Principal = Depends(require("events:read"))):
        return {
            "version": __version__,
            "mode": (
                "live-salesforce"
                if getattr(c.gateway, "breaker_state", None)
                else "offline-in-memory"
            ),
            "planner": type(c.pipeline.planner).__name__,
            "financial_threshold_usd": settings.financial_threshold_usd,
            "bus": {"running": c.bus.running, "dlq": len(c.bus.dlq)},
            "audit_pending_sync": c.audit.pending_sync,
            "pending_approvals": len(c.approvals.list_pending()),
            "salesforce_circuit": getattr(c.gateway, "breaker_state", "n/a"),
            **c.metrics.snapshot(),
        }

    @app.get("/v1/feed")
    async def feed(
        limit: int = 50, _: Principal = Depends(require("events:read"))
    ):
        return c.pipeline.feed(max(1, min(limit, 500)))

    @app.get("/v1/accounts")
    async def accounts(_: Principal = Depends(require("events:read"))):
        return c.grounding.accounts()

    @app.get("/v1/dlq")
    async def dlq(_: Principal = Depends(require("events:read"))):
        return list(c.bus.dlq)

    @app.get("/v1/cases")
    async def cases(_: Principal = Depends(require("events:read"))):
        rows = await c.gateway.query(
            "SELECT Id, Subject, Status, Priority, Description FROM Case "
            "ORDER BY CreatedDate DESC LIMIT 25"
        )
        return [{k: v for k, v in r.items() if k != "attributes"} for r in rows]

    ui_dir = Path(settings.ui_dir) if settings.ui_dir else None
    if ui_dir and (ui_dir / "index.html").is_file():
        app.mount("/", StaticFiles(directory=ui_dir, html=True), name="ui")

    return app
