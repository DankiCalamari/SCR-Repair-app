import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


_PHONE_RE = re.compile(r"^\+?[0-9\s\-]{7,20}$")


def _validate_phone(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    cleaned = v.strip()
    if not _PHONE_RE.match(cleaned):
        raise ValueError("Invalid phone number format")
    return cleaned


# ---------------------------------------------------------------------------
# Lead status / preferred contact enums (mirrors the SQLAlchemy enums)
# ---------------------------------------------------------------------------

_LEAD_STATUS_VALUES = {"new", "contacted", "converted", "closed"}
_CONTACT_METHOD_VALUES = {"phone", "email", "sms"}


# ---------------------------------------------------------------------------
# Lead schemas
# ---------------------------------------------------------------------------

class LeadCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., max_length=20)
    email: Optional[EmailStr] = None
    device_type: Optional[str] = Field(None, max_length=100)
    device_model: Optional[str] = Field(None, max_length=200)
    issue_description: Optional[str] = None
    preferred_contact_method: str = Field(default="phone")
    source: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    customer_id: Optional[uuid.UUID] = None

    _validate_phone = field_validator("phone", mode="before")(_validate_phone)

    @field_validator("preferred_contact_method")
    @classmethod
    def validate_contact_method(cls, v: str) -> str:
        if v not in _CONTACT_METHOD_VALUES:
            raise ValueError(f"Invalid contact method: {v!r}")
        return v


class LeadUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    device_type: Optional[str] = Field(None, max_length=100)
    device_model: Optional[str] = Field(None, max_length=200)
    issue_description: Optional[str] = None
    preferred_contact_method: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    customer_id: Optional[uuid.UUID] = None

    _validate_phone = field_validator("phone", mode="before")(_validate_phone)

    @field_validator("preferred_contact_method")
    @classmethod
    def validate_contact_method(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v not in _CONTACT_METHOD_VALUES:
            raise ValueError(f"Invalid contact method: {v!r}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v not in _LEAD_STATUS_VALUES:
            raise ValueError(f"Invalid lead status: {v!r}")
        return v


class LeadResponse(BaseModel):
    id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None
    name: str
    phone: str
    email: Optional[str] = None
    device_type: Optional[str] = None
    device_model: Optional[str] = None
    issue_description: Optional[str] = None
    preferred_contact_method: str
    status: str
    source: Optional[str] = None
    notes: Optional[str] = None
    converted_repair_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeadConvertRequest(BaseModel):
    device_id: Optional[uuid.UUID] = None
    issue_description: Optional[str] = None
