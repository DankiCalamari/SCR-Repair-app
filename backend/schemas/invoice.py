import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Invoice status enum (mirrors the SQLAlchemy enum)
# ---------------------------------------------------------------------------

_INVOICE_STATUS_VALUES = {"draft", "sent", "paid", "overdue", "cancelled"}


# ---------------------------------------------------------------------------
# Invoice item schemas
# ---------------------------------------------------------------------------

class InvoiceItemCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)
    quantity: int = Field(default=1, ge=0)
    unit_price: float = Field(default=0, ge=0)
    total: float = Field(default=0, ge=0)
    item_type: str = Field(default="labour", max_length=50)
    sort_order: int = Field(default=0, ge=0)


class InvoiceItemResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    description: str
    quantity: int
    unit_price: float
    total: float
    item_type: str
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Invoice schemas
# ---------------------------------------------------------------------------

class InvoiceCreate(BaseModel):
    repair_id: uuid.UUID
    quote_id: Optional[uuid.UUID] = None
    subtotal: float = Field(default=0, ge=0)
    gst_amount: float = Field(default=0, ge=0)
    total_amount: float = Field(default=0, ge=0)
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    items: list[InvoiceItemCreate] = Field(default_factory=list)


class InvoiceUpdate(BaseModel):
    subtotal: Optional[float] = Field(None, ge=0)
    gst_amount: Optional[float] = Field(None, ge=0)
    total_amount: Optional[float] = Field(None, ge=0)
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    paid_date: Optional[datetime] = None
    paid_amount: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v not in _INVOICE_STATUS_VALUES:
            raise ValueError(f"Invalid invoice status: {v!r}")
        return v


class InvoiceResponse(BaseModel):
    id: uuid.UUID
    invoice_number: str
    repair_id: uuid.UUID
    quote_id: Optional[uuid.UUID] = None
    subtotal: float
    gst_amount: float
    total_amount: float
    status: str
    due_date: Optional[datetime] = None
    paid_date: Optional[datetime] = None
    paid_amount: Optional[float] = None
    notes: Optional[str] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvoiceDetailResponse(InvoiceResponse):
    items: list[InvoiceItemResponse] = Field(default_factory=list)


class MarkPaidRequest(BaseModel):
    paid_amount: float = Field(..., ge=0)
    paid_date: Optional[datetime] = None
    notes: Optional[str] = None
