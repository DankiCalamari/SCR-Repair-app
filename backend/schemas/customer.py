import re
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

if TYPE_CHECKING:
    from schemas.device import DeviceResponse
    from schemas.repair import RepairResponse


_PHONE_RE = re.compile(r"^\+?[0-9\s\-]{7,20}$")


def _validate_phone(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    cleaned = v.strip()
    if not _PHONE_RE.match(cleaned):
        raise ValueError("Invalid phone number format")
    return cleaned


# ---------------------------------------------------------------------------
# Customer schemas
# ---------------------------------------------------------------------------

class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    notes: Optional[str] = None

    _validate_phone = field_validator("phone", mode="before")(_validate_phone)


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    notes: Optional[str] = None

    _validate_phone = field_validator("phone", mode="before")(_validate_phone)


class CustomerResponse(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerWithRepairs(CustomerResponse):
    devices: list["DeviceResponse"] = Field(default_factory=list)
    repairs: list["RepairResponse"] = Field(default_factory=list)
