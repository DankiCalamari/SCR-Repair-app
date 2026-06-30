import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Device schemas
# ---------------------------------------------------------------------------

class DeviceBase(BaseModel):
    device_type: str = Field(..., min_length=1, max_length=100)
    brand: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=200)
    imei: Optional[str] = Field(None, max_length=20)
    serial_number: Optional[str] = Field(None, max_length=100)
    colour: Optional[str] = Field(None, max_length=50)
    passcode: Optional[str] = Field(None, max_length=50)
    accessories: Optional[str] = None
    existing_damage: Optional[str] = None


class DeviceCreate(DeviceBase):
    customer_id: uuid.UUID


class DeviceUpdate(BaseModel):
    device_type: Optional[str] = Field(None, min_length=1, max_length=100)
    brand: Optional[str] = Field(None, min_length=1, max_length=100)
    model: Optional[str] = Field(None, min_length=1, max_length=200)
    imei: Optional[str] = Field(None, max_length=20)
    serial_number: Optional[str] = Field(None, max_length=100)
    colour: Optional[str] = Field(None, max_length=50)
    passcode: Optional[str] = Field(None, max_length=50)
    accessories: Optional[str] = None
    existing_damage: Optional[str] = None


class DeviceResponse(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    device_type: str
    brand: str
    model: str
    imei: Optional[str] = None
    serial_number: Optional[str] = None
    colour: Optional[str] = None
    passcode: Optional[str] = None
    accessories: Optional[str] = None
    existing_damage: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
