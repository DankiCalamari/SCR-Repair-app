from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import smtplib
import imaplib

from api.deps import get_db, require_staff
from models.user import User
from config import settings
from services.dashboard_service import get_system_health

router = APIRouter()


@router.get("")
async def get_overall_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    health = await get_system_health(db)
    return health


@router.get("/database")
async def check_database(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    try:
        import time
        start = time.time()
        await db.execute(select(1))
        latency_ms = (time.time() - start) * 1000
        return {
            "name": "database",
            "status": "healthy",
            "latency_ms": round(latency_ms, 2),
            "message": "Database connection successful",
        }
    except Exception as e:
        return {
            "name": "database",
            "status": "unhealthy",
            "latency_ms": None,
            "message": str(e),
        }


@router.get("/sms-gateway")
async def check_sms_gateway(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    if not settings.SMS_GATEWAY_URL:
        return {
            "name": "sms_gateway",
            "status": "unknown",
            "latency_ms": None,
            "message": "SMS_GATEWAY_URL not configured",
        }

    try:
        import httpx
        import time

        start = time.time()
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{settings.SMS_GATEWAY_URL}/health",
                headers={"X-API-Key": settings.SMS_API_KEY},
            )
            latency_ms = (time.time() - start) * 1000
            if resp.status_code == 200:
                return {
                    "name": "sms_gateway",
                    "status": "healthy",
                    "latency_ms": round(latency_ms, 2),
                    "message": "SMS gateway reachable",
                }
            return {
                "name": "sms_gateway",
                "status": "degraded",
                "latency_ms": round(latency_ms, 2),
                "message": f"SMS gateway returned {resp.status_code}",
            }
    except Exception as e:
        return {
            "name": "sms_gateway",
            "status": "unhealthy",
            "latency_ms": None,
            "message": str(e),
        }


@router.get("/smtp")
async def check_smtp(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    if not settings.SMTP_HOST:
        return {
            "name": "smtp",
            "status": "unknown",
            "latency_ms": None,
            "message": "SMTP_HOST not configured",
        }

    try:
        import time

        start = time.time()
        if settings.USE_TLS:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5)
            server.starttls()
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5)
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.quit()
        latency_ms = (time.time() - start) * 1000
        return {
            "name": "smtp",
            "status": "healthy",
            "latency_ms": round(latency_ms, 2),
            "message": "SMTP server reachable",
        }
    except Exception as e:
        return {
            "name": "smtp",
            "status": "unhealthy",
            "latency_ms": None,
            "message": str(e),
        }


@router.get("/imap")
async def check_imap(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    if not settings.IMAP_HOST:
        return {
            "name": "imap",
            "status": "unknown",
            "latency_ms": None,
            "message": "IMAP_HOST not configured",
        }

    try:
        import time

        start = time.time()
        mail = imaplib.IMAP4_SSL(settings.IMAP_HOST, settings.IMAP_PORT)
        mail.login(settings.IMAP_USER, settings.IMAP_PASSWORD)
        mail.logout()
        latency_ms = (time.time() - start) * 1000
        return {
            "name": "imap",
            "status": "healthy",
            "latency_ms": round(latency_ms, 2),
            "message": "IMAP server reachable",
        }
    except Exception as e:
        return {
            "name": "imap",
            "status": "unhealthy",
            "latency_ms": None,
            "message": str(e),
        }
