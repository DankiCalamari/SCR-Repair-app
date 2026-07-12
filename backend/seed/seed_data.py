"""
Seed data script for Sunset Country Repairs.

Creates system settings, SMS templates, and email templates – but only when the database is empty.
Does NOT create a default admin user - initial setup is done via the web UI.

Usage:
    python -m seed.seed_data
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure the project root is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uuid

from sqlalchemy import select

from config import settings
from database import async_session_factory, init_db
from logging_config import configure as configure_logging, get_logger
from models.system_setting import SystemSetting
from models.sms import SmsTemplate
from models.email import EmailTemplate

configure_logging()
logger = get_logger("seed")

SMS_TEMPLATES = [
    {
        "name": "Device Received",
        "body": "Hi {{customer_name}}, we've received your {{device_type}} ({{device_model}}). We'll begin diagnostics shortly. – Sunset Country Repairs",
        "variables": ["customer_name", "device_type", "device_model"],
    },
    {
        "name": "Diagnosis Complete",
        "body": "Hi {{customer_name}}, your {{device_type}} has been diagnosed. We'll send a quote shortly. – Sunset Country Repairs",
        "variables": ["customer_name", "device_type"],
    },
    {
        "name": "Quote Sent",
        "body": "Hi {{customer_name}}, your repair quote is ready. Please visit {{quote_link}} to review and approve. – Sunset Country Repairs",
        "variables": ["customer_name", "quote_link"],
    },
    {
        "name": "Repair Complete – Ready for Collection",
        "body": "Hi {{customer_name}}, your {{device_type}} ({{device_model}}) is repaired and ready for collection! Visit us during business hours. – Sunset Country Repairs",
        "variables": ["customer_name", "device_type", "device_model"],
    },
    {
        "name": "Follow-Up Check-In",
        "body": "Hi {{customer_name}}, just checking in – is your {{device_type}} working well after the repair? Reply YES or NO. – Sunset Country Repairs",
        "variables": ["customer_name", "device_type"],
    },
    {
        "name": "Payment Reminder",
        "body": "Hi {{customer_name}}, a friendly reminder that your repair invoice of ${{total_amount}} is due. Please pay at your earliest convenience. – Sunset Country Repairs",
        "variables": ["customer_name", "total_amount"],
    },
    {
        "name": "Warranty Claim Received",
        "body": "Hi {{customer_name}}, we've received your warranty claim for ticket {{ticket_number}}. We'll review it and get back to you shortly. – Sunset Country Repairs",
        "variables": ["customer_name", "ticket_number"],
    },
    {
        "name": "Parts Ordered",
        "body": "Hi {{customer_name}}, we've ordered the parts needed for your {{device_type}} repair. We'll update you once they arrive. – Sunset Country Repairs",
        "variables": ["customer_name", "device_type"],
    },
]

EMAIL_TEMPLATES = [
    {
        "name": "Repair Intake Confirmation",
        "subject": "We've received your device – {{ticket_number}}",
        "body": "Hi {{customer_name}},\n\nWe've received your {{device_type}} ({{device_model}}) for repair. Your ticket number is {{ticket_number}}.\n\nIssue description: {{issue_description}}\n\nWe'll begin diagnostics and keep you updated on the progress.\n\nRegards,\nSunset Country Repairs",
        "body_html": "<p>Hi {{customer_name}},</p><p>We've received your <strong>{{device_type}}</strong> ({{device_model}}) for repair. Your ticket number is <strong>{{ticket_number}}</strong>.</p><p><em>Issue description:</em> {{issue_description}}</p><p>We'll begin diagnostics and keep you updated on the progress.</p><p>Regards,<br>Sunset Country Repairs</p>",
        "variables": ["customer_name", "ticket_number", "device_type", "device_model", "issue_description"],
    },
    {
        "name": "Quote Ready",
        "subject": "Your repair quote is ready – {{ticket_number}}",
        "body": "Hi {{customer_name}},\n\nYour repair quote for {{device_type}} ({{device_model}}) is ready.\n\nLabour: ${{labour_cost}}\nParts: ${{parts_cost}}\nTotal: ${{total_amount}}\n\nTo approve this quote, please visit:\n{{quote_link}}\n\nThis quote is valid until {{valid_until}}.\n\nRegards,\nSunset Country Repairs",
        "body_html": "<p>Hi {{customer_name}},</p><p>Your repair quote for <strong>{{device_type}}</strong> ({{device_model}}) is ready.</p><table style='margin: 16px 0'><tr><td>Labour</td><td>${{labour_cost}}</td></tr><tr><td>Parts</td><td>${{parts_cost}}</td></tr><tr><td><strong>Total</strong></td><td><strong>${{total_amount}}</strong></td></tr></table><p>To approve this quote, please visit:<br><a href='{{quote_link}}'>{{quote_link}}</a></p><p><em>This quote is valid until {{valid_until}}.</em></p><p>Regards,<br>Sunset Country Repairs</p>",
        "variables": ["customer_name", "ticket_number", "device_type", "device_model", "labour_cost", "parts_cost", "total_amount", "quote_link", "valid_until"],
    },
    {
        "name": "Invoice",
        "subject": "Invoice for repair – {{ticket_number}}",
        "body": "Hi {{customer_name}},\n\nPlease find your invoice details below for ticket {{ticket_number}}.\n\nSubtotal: ${{subtotal}}\nGST: ${{gst_amount}}\nTotal Due: ${{total_amount}}\nDue Date: {{due_date}}\n\nPayment can be made in-store or via bank transfer.\n\nRegards,\nSunset Country Repairs",
        "body_html": "<p>Hi {{customer_name}},</p><p>Please find your invoice details below for ticket <strong>{{ticket_number}}</strong>.</p><table style='margin: 16px 0'><tr><td>Subtotal</td><td>${{subtotal}}</td></tr><tr><td>GST</td><td>${{gst_amount}}</td></tr><tr><td><strong>Total Due</strong></td><td><strong>${{total_amount}}</strong></td></tr><tr><td>Due Date</td><td>{{due_date}}</td></tr></table><p>Payment can be made in-store or via bank transfer.</p><p>Regards,<br>Sunset Country Repairs</p>",
        "variables": ["customer_name", "ticket_number", "subtotal", "gst_amount", "total_amount", "due_date"],
    },
    {
        "name": "Payment Receipt",
        "subject": "Payment received – {{ticket_number}}",
        "body": "Hi {{customer_name}},\n\nWe've received your payment of ${{paid_amount}} for ticket {{ticket_number}}.\n\nThank you for choosing Sunset Country Repairs!\n\nRegards,\nSunset Country Repairs",
        "body_html": "<p>Hi {{customer_name}},</p><p>We've received your payment of <strong>${{paid_amount}}</strong> for ticket <strong>{{ticket_number}}</strong>.</p><p>Thank you for choosing Sunset Country Repairs!</p><p>Regards,<br>Sunset Country Repairs</p>",
        "variables": ["customer_name", "ticket_number", "paid_amount"],
    },
    {
        "name": "Warranty Claim Update",
        "subject": "Warranty claim update – {{ticket_number}}",
        "body": "Hi {{customer_name}},\n\nWe've reviewed your warranty claim for ticket {{ticket_number}}.\n\nStatus: {{claim_status}}\n\n{{resolution_notes}}\n\nIf you have any questions, please don't hesitate to contact us.\n\nRegards,\nSunset Country Repairs",
        "body_html": "<p>Hi {{customer_name}},</p><p>We've reviewed your warranty claim for ticket <strong>{{ticket_number}}</strong>.</p><p>Status: <strong>{{claim_status}}</strong></p><p>{{resolution_notes}}</p><p>If you have any questions, please don't hesitate to contact us.</p><p>Regards,<br>Sunset Country Repairs</p>",
        "variables": ["customer_name", "ticket_number", "claim_status", "resolution_notes"],
    },
    {
        "name": "Follow-Up Satisfaction Check",
        "subject": "How was your repair experience?",
        "body": "Hi {{customer_name}},\n\nIt's been a while since we repaired your {{device_type}} (ticket {{ticket_number}}). We hope everything is working well!\n\nIf you have any issues or feedback, please let us know. Your satisfaction is important to us.\n\nRegards,\nSunset Country Repairs",
        "body_html": "<p>Hi {{customer_name}},</p><p>It's been a while since we repaired your <strong>{{device_type}}</strong> (ticket {{ticket_number}}). We hope everything is working well!</p><p>If you have any issues or feedback, please let us know. Your satisfaction is important to us.</p><p>Regards,<br>Sunset Country Repairs</p>",
        "variables": ["customer_name", "ticket_number", "device_type"],
    },
    {
        "name": "Lead Acknowledgement",
        "subject": "Thanks for your enquiry!",
        "body": "Hi {{customer_name}},\n\nThanks for contacting Sunset Country Repairs about your {{device_type}}.\n\nWe'll review your enquiry and get back to you within 24 hours.\n\nIn the meantime, feel free to call us on {{business_phone}} if you need urgent assistance.\n\nRegards,\nSunset Country Repairs",
        "body_html": "<p>Hi {{customer_name}},</p><p>Thanks for contacting Sunset Country Repairs about your <strong>{{device_type}}</strong>.</p><p>We'll review your enquiry and get back to you within 24 hours.</p><p>In the meantime, feel free to call us on <strong>{{business_phone}}</strong> if you need urgent assistance.</p><p>Regards,<br>Sunset Country Repairs</p>",
        "variables": ["customer_name", "device_type", "business_phone"],
    },
]

SYSTEM_SETTINGS = [
    ("business_name", "Sunset Country Repairs", "Business trading name"),
    ("business_email", "info@sunsetcountryrepairs.com.au", "Primary business email"),
    ("business_phone", "03 5023 0000", "Business phone number"),
    ("business_address", "Mildura", "Business location"),
    ("abn", "", "Australian Business Number"),
    ("primary_color", "#f59e0b", "Primary brand color (hex)"),
    ("accent_color", "#10b981", "Accent brand color (hex)"),
    ("logo_url", "", "URL to business logo"),
    ("admin_logo_url", "", "Admin panel logo URL"),
    ("favicon_url", "", "URL to favicon"),
    ("email_signature", "", "Appended to all outgoing emails"),
    ("smtp_host", "", "SMTP server host"),
    ("smtp_port", "587", "SMTP server port"),
    ("smtp_user", "", "SMTP username"),
    ("smtp_from_name", "Sunset Country Repairs", "From name for outgoing emails"),
    ("smtp_from_email", "", "From email address"),
    ("smtp_use_tls", "true", "Enable TLS for SMTP"),
    ("imap_host", "", "IMAP server host"),
    ("imap_port", "993", "IMAP server port"),
    ("imap_user", "", "IMAP username"),
    ("session_timeout", "60", "Session timeout in minutes"),
    ("require_email_verify", "false", "Require email verification for new users"),
    ("notify_new_lead", "true", "Notify on new lead"),
    ("notify_quote_approved", "true", "Notify when quote approved"),
    ("notify_repair_complete", "true", "Notify when repair complete"),
    ("notify_warranty_claim", "true", "Notify on warranty claim"),
    ("notify_invoice_paid", "true", "Notify when invoice is paid"),
    ("notify_repair_status_change", "true", "Notify on any repair status change"),
    ("admin_notify_email", "true", "Send admin notifications via email"),
    ("admin_notify_sms", "true", "Send admin notifications via SMS"),
    ("admin_notify_push", "true", "Send admin notifications via push"),
    ("authentik_url", "", "Authentik SSO server URL (e.g., https://auth.example.com)"),
    ("authentik_client_id", "", "Authentik OAuth client ID"),
    ("authentik_client_secret", "", "Authentik OAuth client secret"),
    ("authentik_redirect_uri", "", "OAuth redirect URI for Authentik"),
]


async def _is_db_empty(session) -> bool:
    """Return True when the system_settings table has no rows."""
    result = await session.execute(select(SystemSetting).limit(1))
    return result.scalar_one_or_none() is None


async def _create_system_settings(session) -> None:
    for key, value, description in SYSTEM_SETTINGS:
        setting = SystemSetting(
            id=uuid.uuid4(),
            key=key,
            value=value,
            description=description,
            updated_at=datetime.now(timezone.utc),
        )
        session.add(setting)
        logger.info("seed_system_setting_created", key=key)


async def _create_sms_templates(session) -> None:
    for data in SMS_TEMPLATES:
        template = SmsTemplate(
            id=uuid.uuid4(),
            name=data["name"],
            body=data["body"],
            variables=data["variables"],
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(template)
        logger.info("seed_sms_template_created", name=data["name"])


async def _create_email_templates(session) -> None:
    for data in EMAIL_TEMPLATES:
        template = EmailTemplate(
            id=uuid.uuid4(),
            name=data["name"],
            subject=data["subject"],
            body=data["body"],
            body_html=data.get("body_html"),
            variables=data["variables"],
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(template)
        logger.info("seed_email_template_created", name=data["name"])


async def seed() -> None:
    """Main entry point – idempotent, only populates an empty database."""
    logger.info("seed_started")

    # Ensure tables exist
    await init_db()

    async with async_session_factory() as session:
        if not await _is_db_empty(session):
            logger.info("seed_skipped_database_not_empty")
            return

        await _create_system_settings(session)
        await _create_sms_templates(session)
        await _create_email_templates(session)

        await session.commit()

    logger.info("seed_completed")


if __name__ == "__main__":
    asyncio.run(seed())