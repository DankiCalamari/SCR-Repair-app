import time
from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import engine
from models.repair import Repair, RepairStatus, RepairStatusHistory
from models.invoice import Invoice, InvoiceStatus
from models.quote import Quote, QuoteStatus
from models.lead import Lead, LeadStatus
from schemas.dashboard import (
    DashboardStats,
    RecentActivity,
    DashboardWidgets,
)
from schemas.system_health import SystemHealthResponse, ComponentHealth

# Track when the application started for uptime calculation
_START_TIME = time.time()


async def get_dashboard_widgets(db: AsyncSession) -> dict:
    """Return dashboard widget data including counts and recent items."""
    # Total leads (new status)
    leads_new_result = await db.execute(
        select(func.count(Lead.id)).where(Lead.status == LeadStatus.NEW)
    )
    total_leads_new = leads_new_result.scalar() or 0

    # Active repairs (all statuses except completed/cancelled)
    excluded_statuses = [RepairStatus.COMPLETED.value, RepairStatus.CANCELLED.value]
    active_repairs_result = await db.execute(
        select(func.count(Repair.id)).where(~Repair.status.in_(excluded_statuses))
    )
    active_repairs = active_repairs_result.scalar() or 0

    # Ready for collection
    ready_result = await db.execute(
        select(func.count(Repair.id)).where(
            Repair.status == RepairStatus.READY_FOR_COLLECTION
        )
    )
    ready_for_collection = ready_result.scalar() or 0

    # Outstanding quotes (draft + sent)
    quotes_result = await db.execute(
        select(func.count(Quote.id)).where(
            Quote.status.in_([QuoteStatus.DRAFT, QuoteStatus.SENT])
        )
    )
    outstanding_quotes = quotes_result.scalar() or 0

    # Outstanding invoices (sent + overdue)
    invoices_result = await db.execute(
        select(func.count(Invoice.id)).where(
            Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.OVERDUE])
        )
    )
    outstanding_invoices = invoices_result.scalar() or 0

    # Total revenue (sum of paid invoices)
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total_amount), 0)).where(
            Invoice.status == InvoiceStatus.PAID
        )
    )
    total_revenue = float(revenue_result.scalar() or 0)

    # Recent repairs (last 10)
    recent_repairs_result = await db.execute(
        select(Repair)
        .order_by(Repair.created_at.desc())
        .limit(10)
    )
    recent_repairs = list(recent_repairs_result.scalars().all())

    # Recent leads (last 5)
    recent_leads_result = await db.execute(
        select(Lead)
        .order_by(Lead.created_at.desc())
        .limit(5)
    )
    recent_leads = list(recent_leads_result.scalars().all())

    return {
        "total_leads_new": total_leads_new,
        "active_repairs": active_repairs,
        "ready_for_collection": ready_for_collection,
        "outstanding_quotes": outstanding_quotes,
        "outstanding_invoices": outstanding_invoices,
        "total_revenue": total_revenue,
        "recent_repairs": recent_repairs,
        "recent_leads": recent_leads,
    }


async def get_system_health(db: AsyncSession) -> dict:
    """Check health of all system components."""
    components = []

    # Database health check
    db_healthy = True
    db_latency = None
    db_message = "Connected"
    try:
        start = time.time()
        await db.execute(select(1))
        db_latency = (time.time() - start) * 1000
        db_status = "healthy"
    except Exception as e:
        db_healthy = False
        db_status = "unhealthy"
        db_message = str(e)

    components.append(
        {
            "name": "database",
            "status": db_status,
            "latency_ms": round(db_latency, 2) if db_latency is not None else None,
            "message": db_message,
            "last_checked": datetime.utcnow(),
        }
    )

    # SMS gateway health check
    sms_status = "unknown"
    sms_message = "SMS gateway not configured"
    sms_latency = None
    if settings.SMS_GATEWAY_URL:
        try:
            import httpx

            start = time.time()
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"{settings.SMS_GATEWAY_URL}/health",
                    headers={"X-API-Key": settings.SMS_API_KEY},
                )
                sms_latency = (time.time() - start) * 1000
                if resp.status_code == 200:
                    sms_status = "healthy"
                    sms_message = "SMS gateway reachable"
                else:
                    sms_status = "degraded"
                    sms_message = f"SMS gateway returned {resp.status_code}"
        except Exception as e:
            sms_status = "unhealthy"
            sms_message = str(e)
    else:
        sms_message = "SMS_GATEWAY_URL not configured"

    components.append(
        {
            "name": "sms_gateway",
            "status": sms_status,
            "latency_ms": round(sms_latency, 2) if sms_latency is not None else None,
            "message": sms_message,
            "last_checked": datetime.utcnow(),
        }
    )

    # SMTP health check
    smtp_status = "unknown"
    smtp_message = "SMTP not configured"
    smtp_latency = None
    if settings.SMTP_HOST:
        try:
            import smtplib
            import socket

            start = time.time()
            if settings.USE_TLS:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5)
                server.starttls()
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5)
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.quit()
            smtp_latency = (time.time() - start) * 1000
            smtp_status = "healthy"
            smtp_message = "SMTP server reachable"
        except Exception as e:
            smtp_status = "unhealthy"
            smtp_message = str(e)
    else:
        smtp_message = "SMTP_HOST not configured"

    components.append(
        {
            "name": "smtp",
            "status": smtp_status,
            "latency_ms": round(smtp_latency, 2) if smtp_latency is not None else None,
            "message": smtp_message,
            "last_checked": datetime.utcnow(),
        }
    )

    # IMAP health check
    imap_status = "unknown"
    imap_message = "IMAP not configured"
    imap_latency = None
    if settings.IMAP_HOST:
        try:
            import imaplib

            start = time.time()
            mail = imaplib.IMAP4_SSL(settings.IMAP_HOST, settings.IMAP_PORT)
            mail.login(settings.IMAP_USER, settings.IMAP_PASSWORD)
            mail.logout()
            imap_latency = (time.time() - start) * 1000
            imap_status = "healthy"
            imap_message = "IMAP server reachable"
        except Exception as e:
            imap_status = "unhealthy"
            imap_message = str(e)
    else:
        imap_message = "IMAP_HOST not configured"

    components.append(
        {
            "name": "imap",
            "status": imap_status,
            "latency_ms": round(imap_latency, 2) if imap_latency is not None else None,
            "message": imap_message,
            "last_checked": datetime.utcnow(),
        }
    )

    # Overall status
    statuses = [c["status"] for c in components]
    if any(s == "unhealthy" for s in statuses):
        overall_status = "unhealthy"
    elif any(s == "degraded" for s in statuses):
        overall_status = "degraded"
    elif all(s == "healthy" for s in statuses):
        overall_status = "healthy"
    else:
        overall_status = "degraded"

    uptime_seconds = time.time() - _START_TIME

    return {
        "status": overall_status,
        "version": "1.0.0",
        "uptime_seconds": round(uptime_seconds, 2),
        "timestamp": datetime.utcnow(),
        "components": components,
    }
