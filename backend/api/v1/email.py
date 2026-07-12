from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_staff
from config import settings
from models.user import User
from models.customer import Customer
from models.repair import Repair
from models.email import EmailTemplate
from schemas.email import (
    EmailSendRequest,
    EmailMessageResponse,
    EmailSyncResponse,
    EmailConnectionTest,
    EmailTemplateResponse,
    EmailTemplateSendRequest,
)
from services.email_service import (
    get_email_or_404,
    list_emails as list_emails_service,
    send_email,
    sync_imap_emails,
    test_imap_connection,
    test_smtp_connection,
    get_email_templates,
    render_email_template,
)

router = APIRouter()


@router.get("/templates", response_model=list[EmailTemplateResponse])
async def list_email_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    templates = await get_email_templates(db)
    return [
        EmailTemplateResponse(
            id=t.id,
            name=t.name,
            subject=t.subject,
            body=t.body,
            body_html=t.body_html,
            variables=t.variables
        ) for t in templates
    ]


@router.post("/send-template", response_model=EmailMessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def send_template_email(
    data: EmailTemplateSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    template = await db.get(EmailTemplate, data.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    context = {}
    customer = None
    repair = None
    quote = None
    invoice = None

    # Fetch customer and repair context
    if data.repair_id:
        repair = await db.get(Repair, data.repair_id)
        if repair:
            context["ticket_number"] = repair.ticket_number
            context["issue_description"] = repair.issue_description
            customer = await db.get(Customer, repair.customer_id)
            
            # Fetch device info if available
            if repair.device_id:
                from models.device import Device
                device = await db.get(Device, repair.device_id)
                if device:
                    context["device_type"] = device.device_type
                    context["device_model"] = f"{device.brand} {device.model}".strip()

    if not customer and data.customer_id:
        customer = await db.get(Customer, data.customer_id)

    if customer:
        context["customer_name"] = customer.name
        email = customer.email
    else:
        raise HTTPException(status_code=400, detail="Customer or Repair context required")

    if not email:
        raise HTTPException(status_code=400, detail="Customer has no email address")

    # Fetch additional context based on template name or variables used
    # Check if template uses quote-related variables
    template_var_str = " ".join(template.variables) if template.variables else ""
    
    if repair and ("labour_cost" in template_var_str or "parts_cost" in template_var_str or "total_amount" in template_var_str or "quote_link" in template_var_str):
        from models.quote import Quote
        quote_result = await db.execute(
            select(Quote)
            .where(Quote.repair_id == repair.id)
            .order_by(Quote.created_at.desc())
            .limit(1)
        )
        quote = quote_result.scalar_one_or_none()
        if quote:
            context["labour_cost"] = f"{quote.labour_cost:.2f}" if quote.labour_cost else "0.00"
            context["parts_cost"] = f"{quote.parts_cost:.2f}" if quote.parts_cost else "0.00"
            context["total_amount"] = f"{quote.total_amount:.2f}" if quote.total_amount else "0.00"
            context["quote_link"] = f"{settings.APP_URL}/portal/repairs/{repair.id}?tab=quotes"

    if repair and ("subtotal" in template_var_str or "gst_amount" in template_var_str or "due_date" in template_var_str or "paid_amount" in template_var_str):
        from models.invoice import Invoice
        invoice_result = await db.execute(
            select(Invoice)
            .where(Invoice.repair_id == repair.id)
            .order_by(Invoice.created_at.desc())
            .limit(1)
        )
        invoice = invoice_result.scalar_one_or_none()
        if invoice:
            context["subtotal"] = f"{invoice.subtotal:.2f}"
            context["gst_amount"] = f"{invoice.gst_amount:.2f}"
            context["total_amount"] = f"{invoice.total_amount:.2f}"
            context["due_date"] = invoice.due_date.strftime("%d %b %Y") if invoice.due_date else ""
            context["paid_amount"] = f"{invoice.paid_amount:.2f}" if invoice.paid_amount else "0.00"

    if repair and ("completed_date" in template_var_str):
        context["completed_date"] = datetime.now(timezone.utc).strftime("%d %b %Y")

    # Fetch appointment info if needed
    if repair and ("appointment_date" in template_var_str or "appointment_time" in template_var_str):
        from models.booking import Booking
        booking_result = await db.execute(
            select(Booking)
            .where(Booking.repair_id == repair.id)
            .order_by(Booking.created_at.desc())
            .limit(1)
        )
        booking = booking_result.scalar_one_or_none()
        if booking:
            context["appointment_date"] = booking.date.strftime("%d %b %Y") if booking.date else ""
            context["appointment_time"] = booking.time.strftime("%H:%M") if booking.time else ""

    # Fetch warranty info if needed
    if repair and ("warranty_expiry" in template_var_str or "claim_status" in template_var_str or "resolution_notes" in template_var_str):
        from models.warranty import WarrantyRecord
        warranty_result = await db.execute(
            select(WarrantyRecord)
            .where(WarrantyRecord.repair_id == repair.id)
        )
        warranty = warranty_result.scalar_one_or_none()
        if warranty:
            context["warranty_expiry"] = warranty.expiry_date.strftime("%d %b %Y") if warranty.expiry_date else ""
            context["claim_status"] = warranty.status.value if warranty.status else ""
            context["resolution_notes"] = warranty.notes or ""

    subject, body, body_html = render_email_template(template, context)

    email_msg = await send_email(
        to_address=email,
        subject=subject,
        body=body,
        body_html=body_html,
        db=db,
        customer_id=customer.id,
        repair_id=data.repair_id,
        user_id=current_user.id,
    )
    return email_msg


@router.get("", response_model=dict)
async def list_emails(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    repair_id: UUID | None = Query(None),
    customer_id: UUID | None = Query(None),
    direction: str | None = Query(None),
    unassigned: bool = Query(False),
):
    emails, total = await list_emails_service(
        db, skip=skip, limit=limit, repair_id=repair_id, customer_id=customer_id, direction=direction, unassigned=unassigned
    )
    return {
        "data": [EmailMessageResponse.model_validate(e) for e in emails],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/{email_id}/assign", response_model=EmailMessageResponse)
async def assign_email_to_repair(
    email_id: UUID,
    repair_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    email_msg = await get_email_or_404(db, email_id)
    repair = await db.get(Repair, repair_id)
    if repair is None:
        raise HTTPException(status_code=404, detail="Repair not found")
    email_msg.repair_id = repair_id
    email_msg.customer_id = repair.customer_id
    await db.flush()
    await db.refresh(email_msg)
    return email_msg


@router.post("/send", response_model=EmailMessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def send_email_endpoint(
    data: EmailSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    email = await send_email(
        to_address=data.to_address,
        subject=data.subject,
        body=data.body,
        body_html=data.body_html,
        db=db,
        customer_id=data.customer_id,
        repair_id=data.repair_id,
        user_id=current_user.id,
    )
    return email


@router.post("/test", response_model=dict)
async def test_email_connections(
    current_user: User = Depends(require_staff),
):
    smtp_result = await test_smtp_connection()
    imap_result = await test_imap_connection()
    return {
        "smtp": smtp_result,
        "imap": imap_result,
    }


@router.get("/status", response_model=dict)
async def get_email_service_status(
    current_user: User = Depends(require_staff),
):
    from config import settings
    return {
        "smtp_configured": bool(settings.SMTP_HOST and settings.SMTP_USER),
        "imap_configured": bool(settings.IMAP_HOST and settings.IMAP_USER),
        "smtp_host": settings.SMTP_HOST or None,
        "smtp_port": settings.SMTP_PORT if settings.SMTP_HOST else None,
        "imap_host": settings.IMAP_HOST or None,
        "imap_port": settings.IMAP_PORT if settings.IMAP_HOST else None,
        "from_email": settings.SMTP_FROM_EMAIL,
        "from_name": settings.SMTP_FROM_NAME,
    }


@router.post("/sync", response_model=dict)
async def sync_emails(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    result = await sync_imap_emails(db)
    return result
