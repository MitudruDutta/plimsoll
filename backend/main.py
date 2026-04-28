"""FastAPI application entrypoint for Plimsoll Maritime Risk Intelligence API.

The legacy DJI sales-bot endpoints have been removed; the API surface lives in
module routers (`maritime`, `demo`, `market_sentinel`, `hedge`, `visual_risk`,
`analytics`). This file is the slim orchestrator: app construction, middleware,
exception handlers, health probes, and router wiring.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from modules.analytics.analytics import router as analytics_router
from modules.analytics.visual_risk_routes import router as visual_risk_router
from modules.demo.demo_routes import router as demo_router
from modules.financial.hedge_routes import router as hedge_router
from modules.financial.market_sentinel_routes import router as market_sentinel_router
from modules.maritime.maritime_routes import router as maritime_router
from shared.auth import User, get_current_user
from shared.auth.supabase_auth import _jwks_cache, _resolve_jwks_url
from shared.config import get_settings
from shared.database.database import Base, get_db, get_engine
from shared.observability.pii_filter import install_pii_redaction
from shared.observability.security_headers import SecurityHeadersMiddleware
from shared.rate_limit import SLOWAPI_AVAILABLE, RateLimitExceeded, SlowAPIMiddleware, limiter

logging.basicConfig(level=logging.INFO)
install_pii_redaction()
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks. Replaces the deprecated `@app.on_event`."""
    if settings.auto_create_tables:
        try:
            Base.metadata.create_all(bind=get_engine())
        except Exception:
            logger.exception("Automatic table creation failed")
            raise
    else:
        logger.info("Skipping automatic table creation")

    # Warm the JWKS cache at startup so the first authenticated request
    # doesn't fail due to a cold-cache network round-trip timeout.
    jwks_url = _resolve_jwks_url(settings)
    if jwks_url:
        try:
            await _jwks_cache.get(jwks_url)
            logger.info("JWKS cache primed from %s", jwks_url)
        except Exception as exc:
            logger.warning("Could not prime JWKS cache at startup: %s — will retry on first request", exc)

    yield


app = FastAPI(
    title="Plimsoll Maritime Risk Intelligence API",
    description=(
        "Maritime risk intelligence platform: vessel and route compliance, "
        "document analysis, market sentinel signals, and financial hedging."
    ),
    version="0.1.0",
    lifespan=lifespan,
)


if SLOWAPI_AVAILABLE:
    app.state.limiter = limiter
    app.add_exception_handler(
        RateLimitExceeded,
        lambda request, exc: JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Slow down."},
        ),
    )
    app.add_middleware(SlowAPIMiddleware)
else:  # pragma: no cover
    app.state.limiter = limiter


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.debug(
        "Request validation failed",
        extra={"path": request.url.path, "errors": exc.errors()},
    )
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


cors_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
if not cors_origins:
    logger.warning("CORS_ORIGINS empty; rejecting cross-origin browser calls.")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)
app.add_middleware(SecurityHeadersMiddleware)


app.include_router(demo_router)
app.include_router(market_sentinel_router)
app.include_router(maritime_router)
app.include_router(hedge_router)
app.include_router(visual_risk_router)
app.include_router(analytics_router)


@app.get("/")
def read_root():
    return {
        "message": "Plimsoll Maritime Risk Intelligence API",
        "version": "0.1.0",
        "status": "running",
    }


@app.get("/healthz", include_in_schema=False)
def healthz():
    """Liveness probe — does not touch external dependencies."""
    return {"status": "ok", "service": "plimsoll-backend"}


@app.get("/readyz", include_in_schema=False)
def readyz(db: Session = Depends(get_db)):
    """Readiness probe for dependency-backed traffic."""
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("Readiness check failed: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    return {"status": "ready", "database": "ok"}


@app.get("/api/protected")
def read_protected(user: User = Depends(get_current_user)):
    """Identity probe. Returns the minimal authenticated user view."""
    return {
        "message": "You are authenticated",
        "user_id": user.id,
        "email": user.email or "",
        "is_admin": user.role == "admin",
    }


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host=host, port=port)
