from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.deps import get_db, require_staff, require_admin
from config import settings
from models.user import User
from models.customer import Customer
from models.repair import Repair
from models.sms import SmsGatewaySettings, SmsTemplate
from schemas.sms import (
    SmsSendRequest,
    SmsMessageResponse,
    SmsWebhookPayload,
    SmsTemplateResponse,
    SmsGatewayStatus,
    SmsGatewaySettingsSchema,
    SmsGatewaySettingsUpdate,
    SmsTemplateSendRequest,
)
from services.sms_service import (
    get_gateway_status,
    get_sms_or_404,
    get_sms_templates,
    list_sms_messages as list_sms_messages_service,
    process_webhook,
    send_sms,
    test_sms_gateway,
    render_sms_template,
)

router = APIRouter()


@router.get("", response_model=dict)
async def list_sms_messages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    repair_id: UUID | None = Query(None),
    customer_id: UUID | None = Query(None),
    direction: str | None = Query(None),
    unassigned: bool = Query(False),
):
    messages, total = await list_sms_messages_service(
        db, skip=skip, limit=limit, repair_id=repair_id, customer_id=customer_id, direction=direction, unassigned=unassigned
    )
    return {
        "data": [SmsMessageResponse.model_validate(m) for m in messages],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/{sms_id}/assign", response_model=SmsMessageResponse)
async def assign_sms_to_repair(
    sms_id: UUID,
    repair_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    sms = await get_sms_or_404(db, sms_id)
    repair = await db.get(Repair, repair_id)
    if repair is None:
        raise HTTPException(status_code=404, detail="Repair not found")
    sms.repair_id = repair_id
    sms.customer_id = repair.customer_id
    await db.flush()
    await db.refresh(sms)
    return sms


@router.post("/send", response_model=SmsMessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def send_sms_endpoint(
    data: SmsSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    sms = await send_sms(
        to_number=data.to_number,
        body=data.body,
        db=db,
        customer_id=data.customer_id,
        repair_id=data.repair_id,
        user_id=current_user.id,
        sim_number=data.sim_number,
    )
    return sms


@router.post("/send-template", response_model=SmsMessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def send_template_sms(
    data: SmsTemplateSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    template = await db.get(SmsTemplate, data.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    context = {}
    customer = None

    if data.repair_id:
        repair = await db.get(Repair, data.repair_id)
        if repair:
            context["ticket_number"] = repair.ticket_number
            context["repair_status"] = repair.status.value
            customer = await db.get(Customer, repair.customer_id)
            if repair.device_id:
                from models.device import Device
                device = await db.get(Device, repair.device_id)
                if device:
                    context["device_model"] = f"{device.brand} {device.model}"
                    context["device_type"] = device.device_type

    if not customer and data.customer_id:
        customer = await db.get(Customer, data.customer_id)

    if customer:
        context["customer_name"] = customer.name
        phone = customer.phone
    else:
        raise HTTPException(status_code=400, detail="Customer or Repair context required")

    rendered_body = render_sms_template(template.body, context)

    sms = await send_sms(
        to_number=phone,
        body=rendered_body,
        db=db,
        customer_id=customer.id,
        repair_id=data.repair_id,
        user_id=current_user.id,
        sim_number=data.sim_number,
    )
    return sms


@router.get("/settings", response_model=SmsGatewaySettingsSchema)
async def get_sms_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(SmsGatewaySettings).where(SmsGatewaySettings.is_active == True))
    gw_settings = result.scalar_one_or_none()

    webhook_url = f"{settings.APP_URL.rstrip('/')}/api/v1/sms/webhook"
    if not gw_settings:
        return SmsGatewaySettingsSchema(
            gateway_url="https://api.sms-gate.app",
            username=settings.SMS_GATEWAY_USERNAME,
            is_active=True,
            webhook_secret=settings.SMS_WEBHOOK_SECRET,
            webhook_url=webhook_url,
        )

    return SmsGatewaySettingsSchema(
        id=gw_settings.id,
        gateway_url="https://api.sms-gate.app",
        username=gw_settings.username,
        is_active=gw_settings.is_active,
        webhook_secret=gw_settings.webhook_secret,
        webhook_url=webhook_url,
    )


@router.put("/settings", response_model=SmsGatewaySettingsSchema)
async def update_sms_settings(
    data: SmsGatewaySettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(SmsGatewaySettings).where(SmsGatewaySettings.is_active == True))
    gw_settings = result.scalar_one_or_none()

    if not gw_settings:
        gw_settings = SmsGatewaySettings(
            gateway_url=data.gateway_url,
            username=data.username,
            password=data.password or "",
            webhook_secret=data.webhook_secret,
            is_active=data.is_active,
        )
        db.add(gw_settings)
    else:
        gw_settings.gateway_url = data.gateway_url
        gw_settings.username = data.username
        if data.password:
            gw_settings.password = data.password
        gw_settings.webhook_secret = data.webhook_secret
        gw_settings.is_active = data.is_active

    await db.flush()
    await db.refresh(gw_settings)

    webhook_url = f"{settings.APP_URL.rstrip('/')}/api/v1/sms/webhook"
    return SmsGatewaySettingsSchema(
        id=gw_settings.id,
        gateway_url="https://api.sms-gate.app",
        username=gw_settings.username,
        is_active=gw_settings.is_active,
        webhook_secret=gw_settings.webhook_secret,
        webhook_url=webhook_url,
    )


@router.post("/webhook", status_code=status.HTTP_200_OK, include_in_schema=False)
async def sms_webhook(
    payload: SmsWebhookPayload,
    db: AsyncSession = Depends(get_db),
):
    """Webhook endpoint for SMS Gate - no auth required."""
    try:
        result_msg = await process_webhook(payload.event, payload.payload, db)
        return {"status": "ok", "message_id": str(result_msg.id) if result_msg else None}
    except Exception as exc:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"SMS webhook error: {exc}")
        # Still return 200 to prevent retries on expected errors
        return {"status": "error", "message": str(exc)}


@router.get("/gateway-status", response_model=SmsGatewayStatus)
async def check_gateway_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    status_data = await get_gateway_status(db)
    return SmsGatewayStatus(**status_data)


@router.post("/test", status_code=status.HTTP_200_OK)
async def test_sms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    result = await test_sms_gateway(db)
    return result


@router.get("/templates", response_model=list[SmsTemplateResponse])
async def list_sms_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    templates = await get_sms_templates(db)
    return [
        SmsTemplateResponse(
            id=str(t.id),
            name=t.name,
            body=t.body,
            variables=t.variables
        ) for t in templates
    ]
