from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_staff
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

    if data.repair_id:
        repair = await db.get(Repair, data.repair_id)
        if repair:
            context["ticket_number"] = repair.ticket_number
            customer = await db.get(Customer, repair.customer_id)

    if not customer and data.customer_id:
        customer = await db.get(Customer, data.customer_id)

    if customer:
        context["customer_name"] = customer.name
        email = customer.email
    else:
        raise HTTPException(status_code=400, detail="Customer or Repair context required")

    if not email:
        raise HTTPException(status_code=400, detail="Customer has no email address")

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
