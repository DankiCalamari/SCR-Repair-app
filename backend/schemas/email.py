import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------------------------------------------------------------------------
# Email direction / status enums (mirrors the SQLAlchemy enums)
# ---------------------------------------------------------------------------

_EMAIL_DIRECTION_VALUES = {"outbound", "inbound"}
_EMAIL_STATUS_VALUES = {"pending", "sent", "received", "failed"}


# ---------------------------------------------------------------------------
# Email schemas
# ---------------------------------------------------------------------------

class EmailSendRequest(BaseModel):
    to_address: EmailStr
    subject: str = Field(..., min_length=1, max_length=500)
    body: str = Field(..., min_length=1)
    body_html: Optional[str] = None
    repair_id: Optional[uuid.UUID] = None
    customer_id: Optional[uuid.UUID] = None


class EmailMessageResponse(BaseModel):
    id: uuid.UUID
    repair_id: Optional[uuid.UUID] = None
    customer_id: Optional[uuid.UUID] = None
    direction: str
    status: str
    from_address: str
    to_address: str
    subject: str
    body: str
    body_html: Optional[str] = None
    external_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmailSyncResponse(BaseModel):
    synced: int = 0
    failed: int = 0
    messages: list[EmailMessageResponse] = Field(default_factory=list)


class EmailTemplateResponse(BaseModel):
    id: uuid.UUID
    name: str
    subject: str
    body: str
    body_html: Optional[str] = None
    variables: list[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EmailTemplateSendRequest(BaseModel):
    template_id: uuid.UUID
    repair_id: Optional[uuid.UUID] = None
    customer_id: Optional[uuid.UUID] = None


class EmailConnectionTest(BaseModel):
    smtp: bool
    imap: bool
