"""
FastAPI application entry point for Sunset Country Repairs.

Initialises the database, ensures upload directories exist, wires up
middleware (CORS, rate-limiting, request-logging), registers all API
routers, and provides a health-check endpoint.
"""

from __future__ import annotations

import os
import time
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from api.v1 import api_router
from config import settings
from database import engine, init_db
from logging_config import (
    bind_correlation_id,
    clear_context,
    configure as configure_logging,
    get_logger,
)

# ── Import every model so SQLAlchemy registers them with Base.metadata ──
import models  # noqa: F401 – side-effect import for model registration
from models.user import User  # noqa: F401
from models.customer import Customer  # noqa: F401
from models.device import Device  # noqa: F401
from models.repair import Repair, RepairStatusHistory  # noqa: F401
from models.photo import Photo  # noqa: F401
from models.document import Document  # noqa: F401
from models.quote import Quote, QuoteApproval  # noqa: F401
from models.invoice import Invoice, InvoiceItem  # noqa: F401
from models.sms import SmsMessage  # noqa: F401
from models.email import EmailMessage  # noqa: F401
from models.warranty import WarrantyRecord, WarrantyClaim  # noqa: F401
from models.lead import Lead  # noqa: F401
from models.audit_log import AuditLog  # noqa: F401
from models.system_setting import SystemSetting  # noqa: F401
from models.user import UserRole  # noqa: F401

# ── Logging ──────────────────────────────────────────────────────────────
configure_logging()
logger = get_logger(__name__)


# ── Rate limiting storage ────────────────────────────────────────────────
_rate_limit_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_MAX_REQUESTS = 100
RATE_LIMIT_WINDOW_SECONDS = 60


def _is_rate_limited(client_ip: str) -> bool:
    """Return True when *client_ip* has exceeded 100 requests/minute."""
    now = time.time()
    timestamps = _rate_limit_store[client_ip]

    # purge stale entries
    _rate_limit_store[client_ip] = [
        ts for ts in timestamps if now - ts < RATE_LIMIT_WINDOW_SECONDS
    ]

    if len(_rate_limit_store[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return True

    _rate_limit_store[client_ip].append(now)
    return False


# ── Middleware ────────────────────────────────────────────────────────────
class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate-limiter (100 req/min per IP)."""

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"

        if _is_rate_limited(client_ip):
            logger.warning("rate_limit_exceeded", client_ip=client_ip)
            return Response(
                content='{"detail":"Rate limit exceeded. Max 100 requests/minute."}',
                status_code=429,
                media_type="application/json",
            )

        return await call_next(request)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Attach a correlation-id to every request and log access details."""

    async def dispatch(self, request: Request, call_next):
        cid = request.headers.get("X-Correlation-ID")
        bind_correlation_id(cid)

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("unhandled_request_error")
            raise
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.info(
                "request_completed",
                method=request.method,
                path=request.url.path,
                status_code=response.status_code if "response" in dir() else 500,
                duration_ms=round(duration_ms, 2),
            )
            clear_context()

        response.headers["X-Correlation-ID"] = bind_correlation_id()
        return response


# ── Lifespan ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown tasks."""
    logger.info("application_starting", app_name=settings.APP_NAME)

    # Ensure upload directories exist

    upload_base = settings.STORAGE_LOCAL_PATH
    for subdir in ("photos", "documents", "invoices", "warranties"):
        path = os.path.join(upload_base, subdir)
        os.makedirs(path, exist_ok=True)
        logger.info("upload_dir_ready", path=path)

    # Create database tables
    await init_db()
    logger.info("database_initialised")

    # Ensure system settings exist
    _DEFAULT_SYSTEM_SETTINGS = [
        ("business_name", "Sunset Country Repairs", "Business trading name"),
        ("business_email", "info@sunsetcountryrepairs.com.au", "Primary business email"),
        ("business_phone", "03 5023 0000", "Business phone number"),
        ("business_address", "Mildura", "Business location"),
        ("abn", "", "Australian Business Number"),
        ("primary_color", "#f59e0b", "Primary brand color"),
        ("accent_color", "#10b981", "Accent brand color"),
        ("smtp_port", "587", "SMTP server port"),
        ("smtp_use_tls", "true", "Enable TLS for SMTP"),
        ("imap_port", "993", "IMAP server port"),
        ("session_timeout", "60", "Session timeout in minutes"),
        ("require_email_verify", "false", "Require email verification"),
        ("notify_new_lead", "true", "Notify on new lead"),
        ("notify_quote_approved", "true", "Notify when quote approved"),
        ("notify_repair_complete", "true", "Notify when repair complete"),
        ("notify_warranty_claim", "true", "Notify on warranty claim"),
        ("notify_invoice_paid", "true", "Notify when invoice is paid"),
        ("notify_repair_status_change", "true", "Notify on any repair status change"),
        ("admin_notify_email", "true", "Send admin notifications via email"),
        ("admin_notify_sms", "true", "Send admin notifications via SMS"),
        ("admin_notify_push", "true", "Send admin notifications via push"),
        ("email_signature", "", "Email signature appended to outgoing emails"),
    ]
    from models.system_setting import SystemSetting
    from sqlalchemy import select
    from database import async_session_factory as _sf
    async with _sf() as _sess:
        _r = await _sess.execute(select(SystemSetting).limit(1))
        if _r.scalar_one_or_none() is None:
            import uuid as _u
            from datetime import datetime as _dt
            for _k, _v, _d in _DEFAULT_SYSTEM_SETTINGS:
                _sess.add(SystemSetting(
                    id=_u.uuid4(), key=_k, value=_v,
                    description=_d, updated_at=_dt.utcnow(),
                ))
            await _sess.commit()
            logger.info("system_settings_seeded")

    logger.info("application_ready")
    yield

    logger.info("application_shutting_down")
    await engine.dispose()
    logger.info("database_engine_disposed")


# ── App instance ─────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Backend API for Sunset Country Repairs management system",
    lifespan=lifespan,
    docs_url="/docs" if settings.APP_DEBUG else None,
    redoc_url="/redoc" if settings.APP_DEBUG else None,
)

# CORS — when frontend is served from the same origin, CORS is not needed.
# Keep it permissive for API-only access from other origins (mobile apps, etc.)
_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if not _cors_origins:
    _cors_origins = [settings.APP_URL]
if "*" in _cors_origins:
    _cors_origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Correlation-ID"],
)

# Custom middleware (order matters – last added runs first)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestLoggingMiddleware)


# ── Exception handlers ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler so unhandled errors return a clean 500 JSON."""
    logger.exception(
        "unhandled_exception",
        path=request.url.path,
        method=request.method,
        error=str(exc),
    )
    return Response(
        content='{"detail":"Internal server error"}',
        status_code=500,
        media_type="application/json",
    )


# ── Health check ─────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health_check():
    """Liveness probe."""
    return {"status": "ok"}


# ── Static file serving for uploads ─────────────────────────────────────
os.makedirs(settings.STORAGE_LOCAL_PATH, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.STORAGE_LOCAL_PATH), name="uploads")

# ── API routers ──────────────────────────────────────────────────────────
app.include_router(api_router, prefix="/api")

# ── Frontend static files ───────────────────────────────────────────────
# Serve the public-site (marketing pages) at root
_PUBLIC_SITE_DIR = os.path.join(os.path.dirname(__file__), "public-site", "dist")
# Serve the RMS app (auth/portal/admin) at /app
_RMS_DIR = os.path.join(os.path.dirname(__file__), "rms", "dist")

class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Disable caching for assets and SPA index files
        if (request.url.path.startswith("/assets/") or 
            request.url.path.startswith("/app/assets/") or
            request.url.path.startswith("/app/") and not request.url.path.startswith("/app/api/")):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response


app.add_middleware(NoCacheMiddleware)

# Mount RMS assets and static files at /app
if os.path.isdir(_RMS_DIR):
    app.mount("/app/assets", StaticFiles(directory=os.path.join(_RMS_DIR, "assets")), name="rms-assets")
    # Serve root-level static files from RMS dist (logo.svg, favicon.svg, etc.)
    app.mount("/app/static", StaticFiles(directory=_RMS_DIR), name="rms-root")

# Mount public-site assets at root /assets
if os.path.isdir(_PUBLIC_SITE_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(_PUBLIC_SITE_DIR, "assets")), name="public-assets")
    # Serve root-level static files from public-site dist (logo.svg, favicon.svg, etc.)
    app.mount("/static", StaticFiles(directory=_PUBLIC_SITE_DIR), name="public-root")


# ── SPA catch-all (must be registered last) ─────────────────────────────
from fastapi.responses import FileResponse
from fastapi import HTTPException

@app.get("/app/{full_path:path}", include_in_schema=False)
async def rms_spa(full_path: str):
    """Serve the RMS SPA for any /app/* route."""
    # Don't intercept API paths
    if full_path.startswith("api/") or full_path.startswith("uploads/"):
        raise HTTPException(status_code=404)
    # Serve PWA assets directly from RMS dist
    if full_path in ("sw.js", "manifest.webmanifest", "registerSW.js"):
        file_path = os.path.join(_RMS_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path, headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            })
    if os.path.isdir(_RMS_DIR):
        index = os.path.join(_RMS_DIR, "index.html")
        if os.path.isfile(index):
            return FileResponse(index, headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            })
    raise HTTPException(status_code=404)

@app.get("/{full_path:path}", include_in_schema=False)
async def public_spa(full_path: str):
    """Serve the public-site SPA for any non-API, non-asset route."""
    # Don't intercept API, uploads, or asset paths
    if full_path.startswith(("api/", "uploads/", "assets/", "app/", "docs", "redoc", "openapi")):
        raise HTTPException(status_code=404)
    if os.path.isdir(_PUBLIC_SITE_DIR):
        index = os.path.join(_PUBLIC_SITE_DIR, "index.html")
        if os.path.isfile(index):
            return FileResponse(index, headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            })
    raise HTTPException(status_code=404)
