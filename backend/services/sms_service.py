import random
import base64
import uuid
from uuid import UUID
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from config import settings
from models.sms import SmsMessage, SmsDirection, SmsStatus, SmsGatewaySettings, SmsTemplate, SmsWebhookLog, SmsDeliveryReport
from models.customer import Customer
from models.repair import Repair, RepairStatus


# ── HARDCODED SMS GATE CONFIGURATION ──────────────────────────────────────
SMSGATE_BASE_URL = "https://api.sms-gate.app"
SMSGATE_USERNAME = "8ACQBH"
SMSGATE_PASSWORD = "hfux-1gha2ipfe"


class SmsGateClient:
    def __init__(self, username: str = SMSGATE_USERNAME, password: str = SMSGATE_PASSWORD):
        self.url = SMSGATE_BASE_URL
        self.username = username
        self.password = password
        # Use Basic Auth for these app-provided credentials
        auth_str = f"{username}:{password}"
        self.auth_header = f"Basic {base64.b64encode(auth_str.encode()).decode()}"

    async def send_message(self, phone_numbers: list[str], body: str, sim_number: int | None = None, device_id_override: str | None = None) -> dict:
        """Enqueue message via Cloud API."""
        import logging
        logger = logging.getLogger(__name__)
        
        # When device_id_override is provided, use it directly
        device_id = device_id_override
        
        # Otherwise try to auto-detect
        if not device_id:
            device = await self.get_device_state()
            device_id = device.get("id")

        if not device_id:
            raise Exception("No active SMS device found to send the message. Check gateway configuration or enter Device ID manually in SMS Settings.")

        # Ensure phone numbers are in international format (e.g., +61...)
        formatted_numbers = []
        for phone in phone_numbers:
            normalized = "".join(filter(str.isdigit, phone))
            if normalized.startswith("04"):
                formatted_numbers.append(f"+61{normalized[1:]}")
            elif not normalized.startswith("+"):
                formatted_numbers.append(f"+{normalized}")
            else:
                formatted_numbers.append(phone)

        payload = {
            "deviceId": device_id,
            "phoneNumbers": formatted_numbers,
            "textMessage": {
                "text": body
            }
        }
        if sim_number is not None:
            payload["simNumber"] = sim_number

        # Try different possible API endpoint paths
        endpoint_paths = [
            "/3rdparty/v1/message",
            "/api/v1/message",
            "/v1/message",
            "/message",
        ]
        
        logger.info(f"Sending SMS payload: {payload}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            last_error = None
            for path in endpoint_paths:
                try:
                    response = await client.post(
                        f"{self.url}{path}",
                        json=payload,
                        headers={
                            "Authorization": self.auth_header,
                            "Content-Type": "application/json",
                        },
                    )
                    if response.status_code in (200, 201, 202):
                        json_response = response.json()
                        logger.info(f"SMS sent successfully via {path}: {json_response}")
                        # Return a list format for consistency with webhook processing
                        if isinstance(json_response, dict) and "id" in json_response:
                            return [json_response]
                        return json_response
                    elif response.status_code != 404:
                        # Log non-404 errors
                        logger.warning(f"SMS send to {path} failed: {response.status_code} {response.text}")
                        last_error = f"HTTP {response.status_code}: {response.text}"
                        response.raise_for_status()
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 404:
                        continue
                    last_error = str(e)
                    raise
                except Exception as e:
                    last_error = str(e)
                    raise
            # All endpoints failed with 404 - this should not happen if device_id is provided manually
            raise Exception(f"SMS gateway API endpoint not found. Manual Device ID required in SMS Settings. Last error: {last_error}")

    async def get_devices(self) -> list[dict]:
        """List registered devices."""
        import logging
        logger = logging.getLogger(__name__)
        
        # Try different possible API endpoint paths
        endpoint_paths = [
            "/3rdparty/v1/devices",
            "/api/v1/devices", 
            "/v1/devices",
            "/devices",
        ]
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            for path in endpoint_paths:
                try:
                    response = await client.get(
                        f"{self.url}{path}",
                        headers={"Authorization": self.auth_header},
                    )
                    if response.status_code == 200:
                        return response.json()
                    elif response.status_code != 404:
                        # Non-404 error, stop trying
                        response.raise_for_status()
                except httpx.HTTPStatusError as e:
                    if e.response.status_code != 404:
                        raise
                    continue
            
            logger.warning(f"SMS Gate API: All device endpoint paths returned 404 - gateway may be misconfigured")
            return []

    async def get_device_state(self, device_id_override: str | None = None) -> dict:
        """Retrieve state for the gateway device."""
        # If device_id is provided (from settings), use it directly
        if device_id_override:
            return {"id": device_id_override, "status": "configured", "simCards": []}
        
        devices = await self.get_devices()
        if devices:
            # Assuming the first device is the primary one
            return devices[0]
        return {}


async def get_gateway_settings(db: AsyncSession) -> SmsGatewaySettings | None:
    result = await db.execute(select(SmsGatewaySettings).where(SmsGatewaySettings.is_active == True))
    return result.scalar_one_or_none()


def normalize_phone(phone: str) -> str:
    """Normalize phone number to digits only for matching."""
    return "".join(filter(str.isdigit, phone))


async def find_customer_by_phone(db: AsyncSession, phone: str) -> Customer | None:
    normalized = normalize_phone(phone)
    result = await db.execute(
        select(Customer).where(
            or_(
                Customer.phone == phone,
                func.replace(func.replace(func.replace(func.replace(Customer.phone, " ", ""), "-", ""), "(", ""), ")", "").ilike(f"%{normalized}%")
            )
        )
    )
    return result.scalar_one_or_none()


async def find_active_repair(db: AsyncSession, customer_id: UUID) -> Repair | None:
    result = await db.execute(
        select(Repair)
        .where(Repair.customer_id == customer_id)
        .where(Repair.status != RepairStatus.COMPLETED)
        .where(Repair.status != RepairStatus.CANCELLED)
        .order_by(Repair.updated_at.desc())
    )
    return result.scalar_one_or_none()


async def get_sms_or_404(db: AsyncSession, sms_id: UUID) -> SmsMessage:
    result = await db.execute(select(SmsMessage).where(SmsMessage.id == sms_id))
    sms = result.scalar_one_or_none()
    if sms is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SMS message not found",
        )
    return sms


async def list_sms_messages(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    repair_id: UUID | None = None,
    customer_id: UUID | None = None,
    direction: str | None = None,
    unassigned: bool = False,
) -> tuple[list[SmsMessage], int]:
    query = select(SmsMessage)
    count_query = select(func.count(SmsMessage.id))

    filters = []
    if repair_id:
        filters.append(SmsMessage.repair_id == repair_id)
    if customer_id:
        filters.append(SmsMessage.customer_id == customer_id)
    if direction:
        filters.append(SmsMessage.direction == direction)
    if unassigned:
        filters.append(SmsMessage.customer_id == None)

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    query = query.order_by(SmsMessage.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    messages = list(result.scalars().all())

    return messages, total


async def send_sms(
    to_number: str,
    body: str,
    db: AsyncSession,
    customer_id: UUID | None = None,
    repair_id: UUID | None = None,
    user_id: UUID | None = None,
    sim_number: int | None = None,
) -> SmsMessage:
    sms = SmsMessage(
        direction=SmsDirection.OUTBOUND,
        status=SmsStatus.PENDING,
        from_number="GATEWAY",
        to_number=to_number,
        body=body,
        customer_id=customer_id,
        repair_id=repair_id,
        sim_number=sim_number,
    )
    db.add(sms)
    await db.flush()
    await db.refresh(sms)

    # Get stored gateway settings for device_id fallback (handle missing column gracefully)
    device_id_override = None
    try:
        gw_settings = await get_gateway_settings(db)
        device_id_override = gw_settings.device_id if gw_settings else None
    except Exception:
        pass  # Column may not exist yet, continue without override

    client = SmsGateClient()

    try:
        response_data = await client.send_message([to_number], body, sim_number=sim_number, device_id_override=device_id_override)
        sms.status = SmsStatus.SENT
        if isinstance(response_data, list) and len(response_data) > 0:
            sms.external_id = str(response_data[0].get("id"))
        elif isinstance(response_data, dict):
            sms.external_id = str(response_data.get("id"))
    except Exception as exc:
        sms.status = SmsStatus.FAILED
        sms.error_message = str(exc)

    await db.flush()
    await db.refresh(sms)
    return sms


async def process_webhook(event: str, payload: dict, db: AsyncSession) -> SmsMessage | None:
    """Process incoming SMS webhook from SMS Gate."""
    log = SmsWebhookLog(event_type=event, payload=payload)
    db.add(log)
    await db.flush()

    try:
        if event == "sms:received":
            from_number = payload.get("phoneNumber")
            body = payload.get("message")
            external_id = str(payload.get("id"))
            sim_number = payload.get("simNumber")

            customer = await find_customer_by_phone(db, from_number)
            customer_id = customer.id if customer else None
            repair_id = None
            if customer_id:
                repair = await find_active_repair(db, customer_id)
                repair_id = repair.id if repair else None

            inbound = SmsMessage(
                direction=SmsDirection.INBOUND,
                status=SmsStatus.DELIVERED,
                from_number=from_number,
                to_number="GATEWAY",
                body=body,
                external_id=external_id,
                customer_id=customer_id,
                repair_id=repair_id,
                sim_number=sim_number,
                raw_payload=payload
            )
            db.add(inbound)
            await db.flush()
            await db.refresh(inbound)
            
            # Broadcast real-time event for incoming SMS
            from services.repair_events import broadcast_repair_event
            await broadcast_repair_event(
                "sms_received",
                str(repair_id) if repair_id else "unassigned",
                sms_id=str(inbound.id),
                from_number=from_number,
                body=body,
                customer_id=str(customer_id) if customer_id else None
            )
            
            return inbound

        elif event == "message:status":
            external_id = str(payload.get("id"))
            status_str = payload.get("status")

            result = await db.execute(
                select(SmsMessage).where(SmsMessage.external_id == external_id)
            )
            sms = result.scalar_one_or_none()

            if sms:
                if status_str == "sent":
                    sms.status = SmsStatus.SENT
                elif status_str in ("delivered", "received"):
                    sms.status = SmsStatus.DELIVERED
                    sms.delivered_at = datetime.now(timezone.utc).replace(tzinfo=None)
                elif status_str in ("failed", "error"):
                    sms.status = SmsStatus.FAILED

                report = SmsDeliveryReport(
                    sms_message_id=sms.id,
                    external_id=external_id,
                    status=status_str,
                    raw_data=payload
                )
                db.add(report)
                await db.flush()
                
                # Broadcast status update
                from services.repair_events import broadcast_repair_event
                await broadcast_repair_event(
                    "sms_status",
                    str(sms.repair_id) if sms.repair_id else "unassigned",
                    sms_id=str(sms.id),
                    status=status_str
                )
                
                return sms

    except Exception as exc:
        log.error = str(exc)
        await db.flush()

    return None


async def get_gateway_status(db: AsyncSession) -> dict:
    """Check SMS gateway health and return status information."""
    import logging
    logger = logging.getLogger(__name__)
    
    client = SmsGateClient()
    
    try:
        device = await client.get_device_state()
        if not device:
            return {"connected": False, "message": "Device not found - check if device is registered in SMS Gate dashboard"}
            
        return {
            "connected": True,
            "status": device.get("status"),
            "battery_level": device.get("batteryLevel"),
            "is_charging": device.get("isCharging"),
            "last_seen": device.get("updatedAt"),
            "sim_cards": device.get("simCards", []),
        }
    except Exception as exc:
        error_msg = str(exc)
        if "404" in error_msg or "Not Found" in error_msg:
            return {"connected": False, "message": "SMS Gate API endpoint returned 404 - device may not be registered in SMS Gate dashboard"}
        return {"connected": False, "message": error_msg}


async def test_sms_gateway(db: AsyncSession) -> dict:
    """Verify gateway connectivity."""
    status_data = await get_gateway_status(db)
    if not status_data["connected"]:
        return {"success": False, "message": status_data["message"]}

    return {"success": True, "message": "Gateway reachable", "details": status_data}


async def get_sms_templates(db: AsyncSession) -> list[SmsTemplate]:
    """Return SMS templates from database."""
    result = await db.execute(select(SmsTemplate).order_by(SmsTemplate.name))
    return list(result.scalars().all())


def render_sms_template(template_body: str, data: dict) -> str:
    """Replace {{variable}} placeholders in template body."""
    rendered = template_body
    for key, value in data.items():
        placeholder = "{{" + key + "}}"
        rendered = rendered.replace(placeholder, str(value))
    return rendered
