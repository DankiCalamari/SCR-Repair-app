import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Quote status enum (mirrors the SQLAlchemy enum)
# ---------------------------------------------------------------------------

_QUOTE_STATUS_VALUES = {"draft", "sent", "approved", "declined", "expired"}


# ---------------------------------------------------------------------------
# Quote schemas
# ---------------------------------------------------------------------------

class QuoteItemCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)
    quantity: int = Field(default=1, ge=0)
    unit_price: float = Field(default=0, ge=0)
    total: float = Field(default=0, ge=0)
    item_type: str = Field(default="labour", max_length=50)
    sort_order: int = Field(default=0, ge=0)


class QuoteItemResponse(BaseModel):
    id: uuid.UUID
    quote_id: uuid.UUID
    description: str
    quantity: int
    unit_price: float
    total: float
    item_type: str
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class QuoteCreate(BaseModel):
    repair_id: uuid.UUID
    labour_cost: float = Field(default=0, ge=0)
    parts_cost: float = Field(default=0, ge=0)
    description: Optional[str] = None
    valid_until: Optional[datetime] = None
    items: list[QuoteItemCreate] = Field(default_factory=list)


class QuoteUpdate(BaseModel):
    labour_cost: Optional[float] = Field(None, ge=0)
    parts_cost: Optional[float] = Field(None, ge=0)
    gst_amount: Optional[float] = Field(None, ge=0)
    total_amount: Optional[float] = Field(None, ge=0)
    description: Optional[str] = None
    status: Optional[str] = None
    valid_until: Optional[datetime] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v not in _QUOTE_STATUS_VALUES:
            raise ValueError(f"Invalid quote status: {v!r}")
        return v


class QuoteResponse(BaseModel):
    id: uuid.UUID
    quote_number: str
    repair_id: uuid.UUID
    labour_cost: float
    parts_cost: float
    gst_amount: float
    total_amount: float
    description: Optional[str] = None
    status: str
    created_by: Optional[uuid.UUID] = None
    valid_until: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    items: list[QuoteItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class QuoteApprovalRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|decline)$")
    digital_signature: Optional[str] = None
    notes: Optional[str] = None


class QuoteApprovalResponse(BaseModel):
    id: uuid.UUID
    quote_id: uuid.UUID
    action: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    digital_signature: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
