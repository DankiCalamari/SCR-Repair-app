"""
Seed SMS and email templates into an existing database.

Usage:
    python -m seed.seed_templates
"""

from __future__ import annotations

import asyncio
import sys
import uuid
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from database import async_session_factory
from models.sms import SmsTemplate
from models.email import EmailTemplate

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
    {
        "name": "Appointment Reminder",
        "body": "Hi {{customer_name}}, this is a reminder for your repair appointment tomorrow. Ticket {{ticket_number}} – {{device_type}}. Please arrive by {{appointment_time}}. – Sunset Country Repairs",
        "variables": ["customer_name", "ticket_number", "device_type", "appointment_time"],
    },
    {
        "name": "Cancelled – Reason Request",
        "body": "Hi {{customer_name}}, we noticed your repair ticket {{ticket_number}} was cancelled. Was there an issue with our service? We'd love your feedback. – Sunset Country Repairs",
        "variables": ["customer_name", "ticket_number"],
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
    {
        "name": "Welcome New Customer",
        "subject": "Welcome to Sunset Country Repairs!",
        "body": "Hi {{customer_name}},\n\nThanks for choosing Sunset Country Repairs! We're a local repair shop specialising in phone, tablet, and computer repairs.\n\nYou can track your repair status online using your ticket number. Simply visit our website and enter {{ticket_number}}.\n\nIf you have any questions, call us on {{business_phone}}.\n\nBest regards,\nThe Sunset Country Repairs Team",
        "body_html": "<p>Hi {{customer_name}},</p><p>Thanks for choosing Sunset Country Repairs! We're a local repair shop specialising in phone, tablet, and computer repairs.</p><p>You can track your repair status online using your ticket number. Simply visit our website and enter <strong>{{ticket_number}}</strong>.</p><p>If you have any questions, call us on <strong>{{business_phone}}</strong>.</p><p>Best regards,<br>The Sunset Country Repairs Team</p>",
        "variables": ["customer_name", "ticket_number", "business_phone"],
    },
    {
        "name": "Appointment Confirmation",
        "subject": "Appointment Confirmed – {{ticket_number}}",
        "body": "Hi {{customer_name}},\n\nYour repair appointment has been confirmed!\n\nDate: {{appointment_date}}\nTime: {{appointment_time}}\nTicket: {{ticket_number}}\nDevice: {{device_type}} ({{device_model}})\n\nPlease arrive 5 minutes early and bring a valid ID.\n\nIf you need to reschedule, please call us on {{business_phone}}.\n\nRegards,\nSunset Country Repairs",
        "body_html": "<p>Hi {{customer_name}},</p><p>Your repair appointment has been confirmed!</p><table style='margin: 16px 0'><tr><td>Date</td><td>{{appointment_date}}</td></tr><tr><td>Time</td><td>{{appointment_time}}</td></tr><tr><td>Ticket</td><td>{{ticket_number}}</td></tr><tr><td>Device</td><td>{{device_type}} ({{device_model}})</td></tr></table><p>Please arrive 5 minutes early and bring a valid ID.</p><p>If you need to reschedule, please call us on <strong>{{business_phone}}</strong>.</p><p>Regards,<br>Sunset Country Repairs</p>",
        "variables": ["customer_name", "ticket_number", "device_type", "device_model", "appointment_date", "appointment_time", "business_phone"],
    },
    {
        "name": "Warranty Expiry Reminder",
        "subject": "Warranty expiring soon – {{ticket_number}}",
        "body": "Hi {{customer_name}},\n\nYour warranty for {{device_type}} (ticket {{ticket_number}}) expires on {{warranty_expiry}}.\n\nIf you've noticed any issues or have concerns, please contact us before the expiry date.\n\nRegards,\nSunset Country Repairs",
        "body_html": "<p>Hi {{customer_name}},</p><p>Your warranty for <strong>{{device_type}}</strong> (ticket <strong>{{ticket_number}}</strong>) expires on <strong>{{warranty_expiry}}</strong>.</p><p>If you've noticed any issues or have concerns, please contact us before the expiry date.</p><p>Regards,<br>Sunset Country Repairs</p>",
        "variables": ["customer_name", "ticket_number", "device_type", "warranty_expiry"],
    },
]


async def seed_templates() -> None:
    async with async_session_factory() as session:
        # Seed SMS templates
        result = await session.execute(select(SmsTemplate).limit(1))
        if result.scalar_one_or_none() is None:
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
            await session.commit()
            print(f"Seeded {len(SMS_TEMPLATES)} SMS templates")
        else:
            print("SMS templates already exist, skipping")

        # Seed email templates
        result = await session.execute(select(EmailTemplate).limit(1))
        if result.scalar_one_or_none() is None:
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
            await session.commit()
            print(f"Seeded {len(EMAIL_TEMPLATES)} email templates")
        else:
            print("Email templates already exist, skipping")


if __name__ == "__main__":
    asyncio.run(seed_templates())
