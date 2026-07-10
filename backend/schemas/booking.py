import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class BookingCreate(BaseModel):
    repair_id: Optional[uuid.UUID] = None
    customer_id: uuid.UUID
    booking_type: str = Field(..., min_length=1)
    scheduled_at: datetime
    duration_minutes: Optional[int] = Field(default=30, ge=15, le=240)
    address: Optional[str] = None
    notes: Optional[str] = None

    @staticmethod
    def validate_booking_type(v: str) -> str:
        valid_types = {"pickup", "dropoff"}
        if v not in valid_types:
            raise ValueError(f"Invalid booking type: {v!r}. Must be one of {valid_types}")
        return v


class BookingUpdate(BaseModel):
    repair_id: Optional[uuid.UUID] = None
    booking_type: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(default=None, ge=15, le=240)
    address: Optional[str] = None
    notes: Optional[str] = None


class BookingResponse(BaseModel):
    id: uuid.UUID
    repair_id: Optional[uuid.UUID] = None
    customer_id: uuid.UUID
    booking_type: str
    status: str
    scheduled_at: datetime
    duration_minutes: int
    address: Optional[str] = None
    notes: Optional[str] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    # Extra fields from joins
    ticket_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BookingDetailResponse(BookingResponse):
    pass