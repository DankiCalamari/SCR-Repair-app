import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# SMS direction / status enums (mirrors the SQLAlchemy enums)
# ---------------------------------------------------------------------------

_SMS_DIRECTION_VALUES = {"outbound", "inbound"}
_SMS_STATUS_VALUES = {"pending", "sent", "delivered", "failed"}


# ---------------------------------------------------------------------------
# SMS schemas
# ---------------------------------------------------------------------------

class SmsSendRequest(BaseModel):
    to_number: str = Field(..., min_length=7, max_length=20)
    body: str = Field(..., min_length=1, max_length=1600)
    repair_id: Optional[uuid.UUID] = None
    customer_id: Optional[uuid.UUID] = None
    sim_number: Optional[int] = Field(None, ge=1, le=2)


class SmsTemplateSendRequest(BaseModel):
    template_id: uuid.UUID
    repair_id: Optional[uuid.UUID] = None
    customer_id: Optional[uuid.UUID] = None
    sim_number: Optional[int] = Field(None, ge=1, le=2)


class SmsMessageResponse(BaseModel):
    id: uuid.UUID
    repair_id: Optional[uuid.UUID] = None
    customer_id: Optional[uuid.UUID] = None
    direction: str
    status: str
    from_number: str
    to_number: str
    body: str
    external_id: Optional[str] = None
    sim_number: Optional[int] = None
    device_info: Optional[dict] = None
    error_message: Optional[str] = None
    delivered_at: Optional[datetime] = None
    created_at: Optional[datetime] = None  # Make optional to avoid validation errors

    model_config = ConfigDict(from_attributes=True, extra="ignore")


class SmsWebhookPayload(BaseModel):
    event: str
    payload: dict


class SmsTemplateResponse(BaseModel):
    id: str
    name: str
    body: str
    variables: list[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SmsGatewaySettingsSchema(BaseModel):
    id: Optional[uuid.UUID] = None
    gateway_url: str
    username: str
    password: Optional[str] = None
    device_id: Optional[str] = None
    is_active: bool = True
    webhook_secret: Optional[str] = None
    webhook_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SmsGatewaySettingsUpdate(BaseModel):
    gateway_url: str
    username: str
    password: Optional[str] = None
    device_id: Optional[str] = None
    is_active: bool = True
    webhook_secret: Optional[str] = None


class SmsGatewayStatus(BaseModel):
    connected: bool
    status: Optional[str] = None
    battery_level: Optional[int] = None
    is_charging: Optional[bool] = None
    last_seen: Optional[datetime] = None
    sim_cards: list[dict] = Field(default_factory=list)
    message: Optional[str] = None
