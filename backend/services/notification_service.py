"""Central notification dispatcher for admin alerts and customer auto-replies.

Sends email + SMS to the admin contact (from system settings) when significant
events occur, and optionally notifies customers using pre-seeded templates.
"""

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.system_setting import SystemSetting
from models.customer import Customer
from models.email import EmailTemplate
from models.sms import SmsTemplate

logger = logging.getLogger(__name__)


async def _get_setting(db: AsyncSession, key: str, default: str = "") -> str:
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key == key)
    )
    row = result.scalar_one_or_none()
    return row.value if row else default


async def _is_enabled(db: AsyncSession, key: str, default: bool = True) -> bool:
    val = await _get_setting(db, key, "true" if default else "false")
    return val.lower() in ("true", "1", "yes")


async def _get_admin_contact(db: AsyncSession) -> tuple[str | None, str | None]:
    """Return (admin_email, admin_phone) from system settings."""
    email = await _get_setting(db, "business_email")
    phone = await _get_setting(db, "business_phone")
    return (email or None, phone or None)


async def _get_customer(db: AsyncSession, customer_id: UUID) -> Customer | None:
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    return result.scalar_one_or_none()


async def _find_email_template(db: AsyncSession, name: str) -> EmailTemplate | None:
    result = await db.execute(
        select(EmailTemplate).where(EmailTemplate.name == name)
    )
    return result.scalar_one_or_none()


async def _find_sms_template(db: AsyncSession, name: str) -> SmsTemplate | None:
    result = await db.execute(
        select(SmsTemplate).where(SmsTemplate.name == name)
    )
    return result.scalar_one_or_none()


# ── Admin Notifications ──────────────────────────────────────────────────


async def notify_admin(
    db: AsyncSession,
    subject: str,
    message: str,
    sms_body: str | None = None,
) -> None:
    """Send an email + optional SMS to the admin contact."""
    from services.email_service import send_email
    from services.sms_service import send_sms

    admin_email, admin_phone = await _get_admin_contact(db)
    send_email_enabled = await _is_enabled(db, "admin_notify_email")
    send_sms_enabled = await _is_enabled(db, "admin_notify_sms")

    if admin_email and send_email_enabled:
        try:
            await send_email(
                to_address=admin_email,
                subject=subject,
                body=message,
                db=db,
            )
        except Exception as exc:
            logger.warning("Failed to send admin email notification: %s", exc)

    if sms_body and admin_phone and send_sms_enabled:
        try:
            await send_sms(
                to_number=admin_phone,
                body=sms_body,
                db=db,
            )
        except Exception as exc:
            logger.warning("Failed to send admin SMS notification: %s", exc)

    # ── Push notification ────────────────────────────────────────────────
    try:
        from services.push_service import notify_admin_push
        push_title = subject
        push_body = sms_body if sms_body else message[:100]
        await notify_admin_push(db, push_title, push_body)
    except Exception as exc:
        logger.warning("Failed to send admin push notification: %s", exc)


async def notify_new_lead(db: AsyncSession, lead) -> None:
    """Notify admin of a new lead / contact form submission."""
    if not await _is_enabled(db, "notify_new_lead"):
        return

    device_info = ""
    if lead.device_type:
        device_info = f" — {lead.device_type}"
        if lead.device_model:
            device_info += f" ({lead.device_model})"

    subject = f"New Lead: {lead.name}"
    message = (
        f"A new lead has been submitted.\n\n"
        f"Name: {lead.name}\n"
        f"Phone: {lead.phone or 'N/A'}\n"
        f"Email: {lead.email or 'N/A'}\n"
        f"Device: {lead.device_type or 'N/A'} {lead.device_model or ''}\n"
        f"Source: {lead.source or 'N/A'}\n"
        f"Issue: {lead.issue_description or 'N/A'}\n"
    )

    sms_body = f"New lead: {lead.name}"
    if lead.phone:
        sms_body += f" ({lead.phone})"
    if lead.device_type:
        sms_body += f" — {lead.device_type}"

    await notify_admin(db, subject, message, sms_body=sms_body)


async def notify_repair_status_change(
    db: AsyncSession,
    repair,
    old_status: str,
    new_status: str,
) -> None:
    """Notify admin and customer of a repair status change."""
    from services.email_service import send_email, render_email_template
    from services.sms_service import send_sms, render_sms_template

    customer = await _get_customer(db, repair.customer_id) if repair.customer_id else None

    # ── Admin notification ──────────────────────────────────────────────
    if await _is_enabled(db, "notify_repair_status_change"):
        subject = f"Repair {repair.ticket_number} — Status Changed"
        message = (
            f"Repair ticket {repair.ticket_number} status changed:\n\n"
            f"From: {old_status}\n"
            f"To: {new_status}\n"
        )
        if customer:
            message += f"Customer: {customer.name}\n"
            message += f"Phone: {customer.phone or 'N/A'}\n"

        sms_body = f"Repair {repair.ticket_number}: {old_status} → {new_status}"
        await notify_admin(db, subject, message, sms_body=sms_body)

    # ── Customer notification ───────────────────────────────────────────
    if not customer:
        return

    status_label = new_status.replace("_", " ").title()

    if new_status in ("ready_for_collection", "completed"):
        if not await _is_enabled(db, "notify_repair_complete"):
            return

        template = await _find_email_template(db, "Repair Complete Notification")
        context = {
            "customer_name": customer.name,
            "ticket_number": repair.ticket_number,
            "status": status_label,
        }

        if customer.email and template:
            subject, body, body_html = render_email_template(template, context)
            try:
                await send_email(
                    to_address=customer.email,
                    subject=subject,
                    body=body,
                    db=db,
                    body_html=body_html,
                    customer_id=customer.id,
                    repair_id=repair.id,
                )
            except Exception as exc:
                logger.warning("Failed to send repair complete email: %s", exc)

        sms_tpl = await _find_sms_template(db, "Repair Complete -- Ready for Collection")
        if customer.phone and sms_tpl:
            sms_body = render_sms_template(sms_tpl.body, context)
            try:
                await send_sms(
                    to_number=customer.phone,
                    body=sms_body,
                    db=db,
                    customer_id=customer.id,
                    repair_id=repair.id,
                )
            except Exception as exc:
                logger.warning("Failed to send repair complete SMS: %s", exc)


async def notify_quote_sent(db: AsyncSession, quote, repair) -> None:
    """Notify customer that a quote is ready for review."""
    from services.email_service import send_email, render_email_template
    from services.sms_service import send_sms, render_sms_template

    customer = await _get_customer(db, repair.customer_id) if repair.customer_id else None
    if not customer:
        return

    template = await _find_email_template(db, "Quote Ready")
    context = {
        "customer_name": customer.name,
        "quote_number": quote.quote_number,
        "total_amount": f"${quote.total_amount:.2f}",
        "ticket_number": repair.ticket_number if repair else "",
    }

    if customer.email and template:
        subject, body, body_html = render_email_template(template, context)
        try:
            await send_email(
                to_address=customer.email,
                subject=subject,
                body=body,
                db=db,
                body_html=body_html,
                customer_id=customer.id,
                repair_id=repair.id if repair else None,
            )
        except Exception as exc:
            logger.warning("Failed to send quote email: %s", exc)

    sms_tpl = await _find_sms_template(db, "Quote Sent")
    if customer.phone and sms_tpl:
        sms_body = render_sms_template(sms_tpl.body, context)
        try:
            await send_sms(
                to_number=customer.phone,
                body=sms_body,
                db=db,
                customer_id=customer.id,
                repair_id=repair.id if repair else None,
            )
        except Exception as exc:
            logger.warning("Failed to send quote SMS: %s", exc)


async def notify_quote_approved(db: AsyncSession, quote, repair) -> None:
    """Notify admin that a quote has been approved."""
    if not await _is_enabled(db, "notify_quote_approved"):
        return

    customer = await _get_customer(db, repair.customer_id) if repair.customer_id else None

    subject = f"Quote Approved: {quote.quote_number}"
    message = (
        f"A quote has been approved.\n\n"
        f"Quote: {quote.quote_number}\n"
        f"Amount: ${quote.total_amount:.2f}\n"
    )
    if repair:
        message += f"Repair: {repair.ticket_number}\n"
    if customer:
        message += f"Customer: {customer.name}\n"
        message += f"Phone: {customer.phone or 'N/A'}\n"

    sms_body = f"Quote {quote.quote_number} APPROVED — ${quote.total_amount:.2f}"
    if customer:
        sms_body += f" ({customer.name})"

    await notify_admin(db, subject, message, sms_body=sms_body)


async def notify_quote_declined(db: AsyncSession, quote, repair) -> None:
    """Notify admin that a quote has been declined."""
    customer = await _get_customer(db, repair.customer_id) if repair.customer_id else None

    subject = f"Quote Declined: {quote.quote_number}"
    message = (
        f"A quote has been declined.\n\n"
        f"Quote: {quote.quote_number}\n"
        f"Amount: ${quote.total_amount:.2f}\n"
    )
    if repair:
        message += f"Repair: {repair.ticket_number}\n"
    if customer:
        message += f"Customer: {customer.name}\n"
        message += f"Phone: {customer.phone or 'N/A'}\n"

    sms_body = f"Quote {quote.quote_number} DECLINED — ${quote.total_amount:.2f}"
    if customer:
        sms_body += f" ({customer.name})"

    await notify_admin(db, subject, message, sms_body=sms_body)


async def notify_invoice_paid(db: AsyncSession, invoice, repair) -> None:
    """Notify admin and customer of invoice payment."""
    from services.email_service import send_email, render_email_template

    if not await _is_enabled(db, "notify_invoice_paid"):
        return

    customer = await _get_customer(db, repair.customer_id) if repair.customer_id else None

    # ── Admin notification ──────────────────────────────────────────────
    subject = f"Invoice Paid: {invoice.invoice_number}"
    message = (
        f"An invoice has been marked as paid.\n\n"
        f"Invoice: {invoice.invoice_number}\n"
        f"Amount: ${invoice.total_amount:.2f}\n"
        f"Paid: ${invoice.paid_amount:.2f}\n"
    )
    if repair:
        message += f"Repair: {repair.ticket_number}\n"
    if customer:
        message += f"Customer: {customer.name}\n"

    sms_body = f"Invoice {invoice.invoice_number} PAID — ${invoice.paid_amount:.2f}"
    if customer:
        sms_body += f" ({customer.name})"

    await notify_admin(db, subject, message, sms_body=sms_body)

    # ── Customer receipt ────────────────────────────────────────────────
    if not customer or not customer.email:
        return

    template = await _find_email_template(db, "Payment Receipt")
    context = {
        "customer_name": customer.name,
        "invoice_number": invoice.invoice_number,
        "total_amount": f"${invoice.total_amount:.2f}",
        "paid_amount": f"${invoice.paid_amount:.2f}",
        "ticket_number": repair.ticket_number if repair else "",
    }

    if template:
        subject, body, body_html = render_email_template(template, context)
        try:
            await send_email(
                to_address=customer.email,
                subject=subject,
                body=body,
                db=db,
                body_html=body_html,
                customer_id=customer.id,
                repair_id=repair.id if repair else None,
            )
        except Exception as exc:
            logger.warning("Failed to send payment receipt email: %s", exc)


async def notify_warranty_claim(db: AsyncSession, claim, warranty, repair) -> None:
    """Notify admin of a new warranty claim."""
    if not await _is_enabled(db, "notify_warranty_claim"):
        return

    customer = await _get_customer(db, repair.customer_id) if repair and repair.customer_id else None

    subject = f"New Warranty Claim: {warranty.warranty_number}"
    message = (
        f"A new warranty claim has been filed.\n\n"
        f"Warranty: {warranty.warranty_number}\n"
        f"Description: {claim.description or 'N/A'}\n"
    )
    if repair:
        message += f"Original Repair: {repair.ticket_number}\n"
    if customer:
        message += f"Customer: {customer.name}\n"
        message += f"Phone: {customer.phone or 'N/A'}\n"

    sms_body = f"Warranty claim: {warranty.warranty_number}"
    if customer:
        sms_body += f" — {customer.name}"

    await notify_admin(db, subject, message, sms_body=sms_body)


async def notify_warranty_claim_resolved(
    db: AsyncSession,
    claim,
    warranty,
    repair,
) -> None:
    """Notify customer that their warranty claim has been resolved."""
    from services.email_service import send_email, render_email_template

    customer = await _get_customer(db, repair.customer_id) if repair and repair.customer_id else None
    if not customer or not customer.email:
        return

    template = await _find_email_template(db, "Warranty Claim Update")
    context = {
        "customer_name": customer.name,
        "warranty_number": warranty.warranty_number,
        "status": claim.status.value.replace("_", " ").title(),
        "resolution_notes": claim.resolution_notes or "",
        "ticket_number": repair.ticket_number if repair else "",
    }

    if template:
        subject, body, body_html = render_email_template(template, context)
        try:
            await send_email(
                to_address=customer.email,
                subject=subject,
                body=body,
                db=db,
                body_html=body_html,
                customer_id=customer.id,
                repair_id=repair.id if repair else None,
            )
        except Exception as exc:
            logger.warning("Failed to send warranty resolution email: %s", exc)


async def send_lead_acknowledgement(db: AsyncSession, lead) -> None:
    """Send an auto-reply acknowledgement to a lead who submitted the contact form."""
    from services.email_service import send_email, render_email_template

    if not lead.email:
        return

    template = await _find_email_template(db, "Lead Acknowledgement")
    if not template:
        return

    context = {
        "customer_name": lead.name,
        "device_type": lead.device_type or "your device",
    }
    subject, body, body_html = render_email_template(template, context)

    try:
        await send_email(
            to_address=lead.email,
            subject=subject,
            body=body,
            db=db,
            body_html=body_html,
            customer_id=lead.customer_id,
        )
    except Exception as exc:
        logger.warning("Failed to send lead acknowledgement email: %s", exc)
