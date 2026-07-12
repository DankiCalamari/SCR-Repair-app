import re
import uuid
from uuid import UUID
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate

from fastapi import HTTPException, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
import aiosmtplib
from aioimaplib import aioimaplib

from config import settings
from models.email import EmailMessage, EmailDirection, EmailStatus, EmailTemplate
from models.customer import Customer
from models.repair import Repair, RepairStatus


async def get_email_or_404(db: AsyncSession, email_id: UUID) -> EmailMessage:
    result = await db.execute(select(EmailMessage).where(EmailMessage.id == email_id))
    email = result.scalar_one_or_none()
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email message not found",
        )
    return email


async def get_email_templates(db: AsyncSession) -> list[EmailTemplate]:
    """Return Email templates from database."""
    result = await db.execute(select(EmailTemplate).order_by(EmailTemplate.name))
    return list(result.scalars().all())


def render_email_template(template: EmailTemplate, data: dict) -> tuple[str, str, str | None]:
    """Replace {{variable}} placeholders in template subject and body."""
    subject = template.subject
    body = template.body
    body_html = template.body_html
    
    for key, value in data.items():
        placeholder = "{{" + key + "}}"
        replacement = str(value)
        subject = subject.replace(placeholder, replacement)
        body = body.replace(placeholder, replacement)
        if body_html:
            body_html = body_html.replace(placeholder, replacement)
            
    return subject, body, body_html


async def list_emails(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    repair_id: UUID | None = None,
    customer_id: UUID | None = None,
    direction: str | None = None,
    unassigned: bool = False,
) -> tuple[list[EmailMessage], int]:
    query = select(EmailMessage)
    count_query = select(func.count(EmailMessage.id))

    filters = []
    if repair_id:
        filters.append(EmailMessage.repair_id == repair_id)
    if customer_id:
        filters.append(EmailMessage.customer_id == customer_id)
    if direction:
        filters.append(EmailMessage.direction == direction)
    if unassigned:
        filters.append(EmailMessage.customer_id == None)

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    query = query.order_by(EmailMessage.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    emails = list(result.scalars().all())

    return emails, total


async def send_email(
    to_address: str,
    subject: str,
    body: str,
    db: AsyncSession,
    body_html: str | None = None,
    customer_id: UUID | None = None,
    repair_id: UUID | None = None,
    user_id: UUID | None = None,
) -> EmailMessage:
    from_address = settings.SMTP_FROM_EMAIL

    # Fetch email signature from database settings
    from models.system_setting import SystemSetting
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == "email_signature"))
    signature_setting = result.scalar_one_or_none()
    signature = signature_setting.value if signature_setting and signature_setting.value else ""

    # Build signature HTML/Plain text if configured
    signature_html = ""
    signature_text = ""
    if signature:
        # Check if signature is an image URL
        if signature.startswith("/uploads/") or signature.startswith("http"):
            # Convert relative URL to absolute URL for email HTML
            if signature.startswith("/uploads/"):
                image_url = f"{settings.APP_URL}{signature}"
            else:
                image_url = signature
            signature_html = f'<br><br><img src="{image_url}" alt="Email signature" style="max-width: 100%; height: auto;">'
            signature_text = ""  # No plain text version for image
        else:
            # Plain text signature
            signature_text = f"\n\n{signature}"
            signature_html = f"<br><br>{signature.replace(chr(10), '<br>')}"

    # Append signature to body
    body = f"{body}{signature_text}"
    if body_html:
        body_html = f"{body_html}{signature_html}"

    email_msg = EmailMessage(
        direction=EmailDirection.OUTBOUND,
        status=EmailStatus.PENDING,
        from_address=from_address,
        to_address=to_address,
        subject=subject,
        body=body,
        body_html=body_html,
        customer_id=customer_id,
        repair_id=repair_id,
    )
    db.add(email_msg)
    await db.flush()
    await db.refresh(email_msg)

    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        email_msg.status = EmailStatus.FAILED
        email_msg.error_message = "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD."
        await db.flush()
        await db.refresh(email_msg)
        return email_msg

    # Build MIME message
    if body_html:
        msg = MIMEMultipart("alternative")
        msg.attach(MIMEText(body, "plain"))
        msg.attach(MIMEText(body_html, "html"))
    else:
        msg = MIMEText(body, "plain")

    msg["From"] = f"{settings.SMTP_FROM_NAME} <{from_address}>"
    msg["To"] = to_address
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = f"<{uuid.uuid4()}@{settings.SMTP_HOST}>"

    try:
        smtp = aiosmtplib.SMTP(
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            use_tls=settings.USE_TLS,
            timeout=30,
        )
        await smtp.connect()
        if not settings.USE_TLS:
            await smtp.starttls()
        await smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        await smtp.send_message(msg)
        await smtp.quit()

        email_msg.status = EmailStatus.SENT
        email_msg.external_id = msg["Message-ID"]
    except aiosmtplib.SMTPAuthenticationError as exc:
        email_msg.status = EmailStatus.FAILED
        email_msg.error_message = f"SMTP authentication failed: {str(exc)}"
    except aiosmtplib.SMTPRecipientsRefused as exc:
        email_msg.status = EmailStatus.FAILED
        email_msg.error_message = f"Recipient refused: {str(exc)}"
    except aiosmtplib.SMTPException as exc:
        email_msg.status = EmailStatus.FAILED
        email_msg.error_message = f"SMTP error: {str(exc)}"
    except Exception as exc:
        email_msg.status = EmailStatus.FAILED
        email_msg.error_message = f"Email sending error: {str(exc)}"

    await db.flush()
    await db.refresh(email_msg)
    return email_msg


async def test_smtp_connection() -> dict:
    """Test SMTP connection."""
    if not settings.SMTP_HOST:
        return {
            "success": False,
            "message": "SMTP host is not configured",
            "host": None,
            "port": None,
        }

    try:
        smtp = aiosmtplib.SMTP(
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            use_tls=settings.USE_TLS,
            timeout=15,
        )
        await smtp.connect()

        # Try authentication if credentials are set
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            if not settings.USE_TLS:
                await smtp.starttls()
            await smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        else:
            # Still try STARTTLS for connection test even without auth
            if not settings.USE_TLS:
                await smtp.starttls()

        await smtp.quit()
        return {
            "success": True,
            "message": "SMTP connection successful",
            "host": settings.SMTP_HOST,
            "port": settings.SMTP_PORT,
        }
    except aiosmtplib.SMTPAuthenticationError as exc:
        return {
            "success": False,
            "message": f"SMTP authentication failed: {str(exc)}",
            "host": settings.SMTP_HOST,
            "port": settings.SMTP_PORT,
        }
    except aiosmtplib.SMTPException as exc:
        return {
            "success": False,
            "message": f"SMTP error: {str(exc)}",
            "host": settings.SMTP_HOST,
            "port": settings.SMTP_PORT,
        }
    except Exception as exc:
        return {
            "success": False,
            "message": f"Connection error: {str(exc)}",
            "host": settings.SMTP_HOST,
            "port": settings.SMTP_PORT,
        }


async def test_imap_connection() -> dict:
    """Test IMAP connection."""
    if not settings.IMAP_HOST:
        return {
            "success": False,
            "message": "IMAP host is not configured",
            "host": None,
            "port": None,
        }

    try:
        client = aioimaplib.IMAP4_SSL(host=settings.IMAP_HOST, port=settings.IMAP_PORT, timeout=15)
        await client.wait_hello_from_server()

        if settings.IMAP_USER and settings.IMAP_PASSWORD:
            await client.login(settings.IMAP_USER, settings.IMAP_PASSWORD)

        await client.logout()
        return {
            "success": True,
            "message": "IMAP connection successful",
            "host": settings.IMAP_HOST,
            "port": settings.IMAP_PORT,
        }
    except Exception as exc:
        return {
            "success": False,
            "message": f"IMAP connection error: {str(exc)}",
            "host": settings.IMAP_HOST,
            "port": settings.IMAP_PORT,
        }


def extract_phone_from_text(text: str) -> str | None:
    """Extract an Australian mobile phone number from text.

    Matches patterns like:
      04xx xxx xxx
      04xxxxxxxx
      +61 4xx xxx xxx
      +614xxxxxxxx
    Returns the digits-only normalised number (no +, spaces, or dashes), or None.
    """
    # Australian mobile: starts with 04 or +614, followed by 8 digits
    patterns = [
        r'(?:\+61\s?4\d{2}\s?\d{3}\s?\d{3})',   # +61 4xx xxx xxx
        r'(?:\+614\d{8})',                          # +614xxxxxxxx
        r'(?:04\d{2}\s?\d{3}\s?\d{3})',            # 04xx xxx xxx
        r'(?:04\d{8})',                             # 04xxxxxxxx
    ]
    for pat in patterns:
        match = re.search(pat, text)
        if match:
            digits = re.sub(r'[^\d]', '', match.group())
            # Normalise: if starts with 614, convert to 04
            if digits.startswith('614') and len(digits) == 11:
                digits = '0' + digits[2:]
            return digits
    return None


async def find_customer_by_email(db: AsyncSession, email_addr: str) -> Customer | None:
    """Look up a customer by email address (case-insensitive)."""
    result = await db.execute(
        select(Customer).where(func.lower(Customer.email) == func.lower(email_addr))
    )
    return result.scalar_one_or_none()


async def find_active_repair(db: AsyncSession, customer_id: UUID) -> Repair | None:
    """Return the most recently updated non-terminal repair for a customer."""
    result = await db.execute(
        select(Repair)
        .where(Repair.customer_id == customer_id)
        .where(Repair.status != RepairStatus.COMPLETED)
        .where(Repair.status != RepairStatus.CANCELLED)
        .order_by(Repair.updated_at.desc())
    )
    return result.scalar_one_or_none()


async def sync_imap_emails(db: AsyncSession) -> dict:
    """Fetch emails from IMAP inbox and process replies."""
    if not settings.IMAP_HOST or not settings.IMAP_USER or not settings.IMAP_PASSWORD:
        return {
            "synced": 0,
            "failed": 0,
            "messages": [],
            "error": "IMAP is not configured",
        }

    synced = 0
    failed = 0
    processed_messages = []

    try:
        client = aioimaplib.IMAP4_SSL(host=settings.IMAP_HOST, port=settings.IMAP_PORT, timeout=30)
        await client.wait_hello_from_server()
        await client.login(settings.IMAP_USER, settings.IMAP_PASSWORD)
        await client.select("INBOX")

        # Search for unread messages
        _, message_numbers = await client.search("UNSEEN")

        for num in message_numbers[0].split():
            try:
                _, msg_data = await client.fetch(num, "(RFC822)")
                email_body = msg_data[1]

                # Parse the email headers to extract basic info
                from email import message_from_bytes
                parsed = message_from_bytes(email_body)

                subject = parsed.get("Subject", "")
                from_addr = parsed.get("From", "")
                to_addr = parsed.get("To", "")
                message_id = parsed.get("Message-ID", "")

                # Try to extract plain text body
                body_text = ""
                if parsed.is_multipart():
                    for part in parsed.walk():
                        if part.get_content_type() == "text/plain":
                            body_text = part.get_payload(decode=True).decode("utf-8", errors="replace")
                            break
                else:
                    body_text = parsed.get_payload(decode=True).decode("utf-8", errors="replace")

                # Auto-link to customer & repair
                customer_id = None
                repair_id = None

                # Strategy 1: Extract phone number from email body
                phone = extract_phone_from_text(body_text)
                if phone:
                    from services.sms_service import find_customer_by_phone
                    customer = await find_customer_by_phone(db, phone)
                    if customer:
                        customer_id = customer.id
                        repair = await find_active_repair(db, customer_id)
                        repair_id = repair.id if repair else None

                # Strategy 2: Match sender email to customer
                if not customer_id:
                    # Extract clean email from "Name <email>" format
                    email_match = re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', from_addr)
                    sender_email = email_match.group().lower() if email_match else from_addr.lower()
                    customer = await find_customer_by_email(db, sender_email)
                    if customer:
                        customer_id = customer.id
                        repair = await find_active_repair(db, customer_id)
                        repair_id = repair.id if repair else None

                inbound = EmailMessage(
                    direction=EmailDirection.INBOUND,
                    status=EmailStatus.RECEIVED,
                    from_address=from_addr,
                    to_address=to_addr,
                    subject=subject,
                    body=body_text,
                    external_id=message_id,
                    customer_id=customer_id,
                    repair_id=repair_id,
                )
                db.add(inbound)
                await db.flush()
                await db.refresh(inbound)

                processed_messages.append(inbound)
                synced += 1

            except Exception as exc:
                failed += 1

        await client.logout()

    except Exception as exc:
        return {
            "synced": synced,
            "failed": failed,
            "messages": processed_messages,
            "error": f"IMAP sync error: {str(exc)}",
        }

    return {
        "synced": synced,
        "failed": failed,
        "messages": processed_messages,
    }
