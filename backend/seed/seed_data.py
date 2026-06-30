"""
Seed data script for Sunset Country Repairs.

Creates a default admin user, sample customers, repairs in various
states, and system SMS templates – but only when the database is empty.

Usage:
    python -m seed.seed_data
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Ensure the project root is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uuid

from passlib.context import CryptContext
from sqlalchemy import select

from config import settings
from database import async_session_factory, init_db
from logging_config import configure as configure_logging, get_logger
from models.user import User, UserRole
from models.customer import Customer
from models.device import Device
from models.repair import Repair, RepairStatus, RepairStatusHistory
from models.system_setting import SystemSetting
from models.sms import SmsTemplate
from models.email import EmailTemplate

configure_logging()
logger = get_logger("seed")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SAMPLE_CUSTOMERS = [
    {
        "name": "Alice Johnson",
        "phone": "0400123456",
        "email": "alice@example.com.au",
        "address": "12 Sunset Rd, VIC 3000",
    },
    {
        "name": "Bob Williams",
        "phone": "0400987654",
        "email": "bob@example.com.au",
        "address": "45 Beach St, QLD 4000",
    },
    {
        "name": "Carol Davis",
        "phone": "0400555123",
        "email": "carol@example.com.au",
        "address": "78 Main St, NSW 2000",
    },
    {
        "name": "Dave Martinez",
        "phone": "0400789012",
        "email": "dave@example.com.au",
        "address": "3 Park Ave, WA 6000",
    },
    {
        "name": "Eve Thompson",
        "phone": "0400345678",
        "email": "eve@example.com.au",
        "address": "91 River Rd, SA 5000",
    },
]

SAMPLE_DEVICES = [
    {"device_type": "Smartphone", "brand": "Apple", "model": "iPhone 14 Pro", "colour": "Space Grey"},
    {"device_type": "Smartphone", "brand": "Samsung", "model": "Galaxy S23 Ultra", "colour": "Phantom Black"},
    {"device_type": "Tablet", "brand": "Apple", "model": "iPad Air (5th Gen)", "colour": "Starlight"},
    {"device_type": "Laptop", "brand": "Apple", "model": "MacBook Air M2", "colour": "Midnight"},
    {"device_type": "Smartphone", "brand": "Google", "model": "Pixel 7 Pro", "colour": "Obsidian"},
]

SAMPLE_ISSUES = [
    "Screen cracked after drop – touch unresponsive in top-right corner.",
    "Battery drains within 2 hours. Needs replacement.",
    "Charging port loose – cable falls out easily.",
    "Water damage – device submerged in pool for ~30 seconds.",
    "Speaker no sound – audio only works through headphones.",
]

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
        "name": "Repair Complete Notification",
        "subject": "Your device is ready for collection – {{ticket_number}}",
        "body": "Hi {{customer_name}},\n\nGreat news! Your {{device_type}} ({{device_model}}) has been repaired and is ready for collection.\n\nTicket: {{ticket_number}}\nCompleted: {{completed_date}}\n\nPlease bring a valid ID when collecting. Our business hours are Mon–Fri 9am–5pm, Sat 9am–1pm.\n\nRegards,\nSunset Country Repairs",
        "body_html": "<p>Hi {{customer_name}},</p><p>Great news! Your <strong>{{device_type}}</strong> ({{device_model}}) has been repaired and is ready for collection.</p><p>Ticket: <strong>{{ticket_number}}</strong><br>Completed: {{completed_date}}</p><p>Please bring a valid ID when collecting. Our business hours are Mon–Fri 9am–5pm, Sat 9am–1pm.</p><p>Regards,<br>Sunset Country Repairs</p>",
        "variables": ["customer_name", "ticket_number", "device_type", "device_model", "completed_date"],
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


def _hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


async def _is_db_empty(session) -> bool:
    """Return True when the users table has no rows."""
    result = await session.execute(select(User).limit(1))
    return result.scalar_one_or_none() is None


async def _create_admin(session) -> User:
    admin = User(
        id=uuid.uuid4(),
        email="admin@sunsetcountry.com.au",
        hashed_password=_hash_password("admin123"),
        full_name="System Administrator",
        phone="0400000000",
        role=UserRole.ADMIN,
        is_active=True,
        email_verified=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(admin)
    logger.info("seed_admin_created", email=admin.email)
    return admin


async def _create_customers(session) -> list[Customer]:
    customers = []
    for data in SAMPLE_CUSTOMERS:
        customer = Customer(
            id=uuid.uuid4(),
            name=data["name"],
            phone=data["phone"],
            email=data["email"],
            address=data["address"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(customer)
        customers.append(customer)
        logger.info("seed_customer_created", name=customer.name)

    await session.flush()
    return customers


async def _create_repairs(
    session, customers: list[Customer], admin: User
) -> list[Repair]:
    statuses = [
        RepairStatus.LEAD,
        RepairStatus.DEVICE_RECEIVED,
        RepairStatus.DIAGNOSING,
        RepairStatus.WAITING_FOR_CUSTOMER,
        RepairStatus.IN_PROGRESS,
    ]
    repairs = []

    for i, customer in enumerate(customers):
        device_data = SAMPLE_DEVICES[i]
        device = Device(
            id=uuid.uuid4(),
            customer_id=customer.id,
            device_type=device_data["device_type"],
            brand=device_data["brand"],
            model=device_data["model"],
            colour=device_data["colour"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(device)
        await session.flush()

        status = statuses[i % len(statuses)]
        ticket_number = f"TKT-{2024000 + i + 1}"
        repair = Repair(
            id=uuid.uuid4(),
            ticket_number=ticket_number,
            customer_id=customer.id,
            device_id=device.id,
            status=status,
            issue_description=SAMPLE_ISSUES[i],
            diagnosis="Pending diagnosis" if status.value in ("lead", "device_received") else "Diagnosed – parts required",
            intake_date=datetime.utcnow() - timedelta(days=10 - i * 2),
            created_at=datetime.utcnow() - timedelta(days=10 - i * 2),
            updated_at=datetime.utcnow(),
        )
        session.add(repair)
        await session.flush()

        # Add status history
        history = RepairStatusHistory(
            id=uuid.uuid4(),
            repair_id=repair.id,
            from_status=None,
            to_status=status.value,
            changed_by=admin.id,
            notes=f"Initial status set to {status.value}",
            created_at=repair.created_at,
        )
        session.add(history)

        repairs.append(repair)
        logger.info(
            "seed_repair_created",
            ticket=ticket_number,
            status=status.value,
            customer=customer.name,
        )

    return repairs


async def _create_sms_templates(session) -> None:
    for data in SMS_TEMPLATES:
        template = SmsTemplate(
            id=uuid.uuid4(),
            name=data["name"],
            body=data["body"],
            variables=data["variables"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(template)
        logger.info("seed_sms_template_created", name=data["name"])


SYSTEM_SETTINGS = [
    ("business_name", "Sunset Country Repairs", "Business trading name"),
    ("business_email", "info@sunsetcountryrepairs.com.au", "Primary business email"),
    ("business_phone", "03 5023 0000", "Business phone number"),
    ("business_address", "123 Main Street, Mildura VIC 3500", "Business physical address"),
    ("abn", "12 345 678 901", "Australian Business Number"),
    ("primary_color", "#f59e0b", "Primary brand color (hex)"),
    ("accent_color", "#10b981", "Accent brand color (hex)"),
    ("logo_url", "", "URL to business logo"),
    ("admin_logo_url", "", "Admin panel logo URL"),
    ("favicon_url", "", "URL to favicon"),
    ("email_signature", "Regards,\nSunset Country Repairs\n03 5023 0000", "Appended to all outgoing emails"),
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
]


async def _create_system_settings(session) -> None:
    for key, value, description in SYSTEM_SETTINGS:
        setting = SystemSetting(
            id=uuid.uuid4(),
            key=key,
            value=value,
            description=description,
            updated_at=datetime.utcnow(),
        )
        session.add(setting)
        logger.info("seed_system_setting_created", key=key)


async def _create_email_templates(session) -> None:
    for data in EMAIL_TEMPLATES:
        template = EmailTemplate(
            id=uuid.uuid4(),
            name=data["name"],
            subject=data["subject"],
            body=data["body"],
            body_html=data.get("body_html"),
            variables=data["variables"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
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

        admin = await _create_admin(session)
        customers = await _create_customers(session)
        await _create_repairs(session, customers, admin)
        await _create_system_settings(session)
        await _create_sms_templates(session)
        await _create_email_templates(session)

        await session.commit()

    logger.info("seed_completed")


if __name__ == "__main__":
    asyncio.run(seed())
