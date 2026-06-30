import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

if TYPE_CHECKING:
    from schemas.customer import CustomerResponse
    from schemas.device import DeviceResponse
    from schemas.document import DocumentResponse
    from schemas.invoice import InvoiceResponse
    from schemas.photo import PhotoResponse
    from schemas.quote import QuoteResponse


# ---------------------------------------------------------------------------
# Repair status enum (mirrors the SQLAlchemy enum)
# ---------------------------------------------------------------------------

class RepairStatus(str):
    LEAD = "lead"
    DEVICE_RECEIVED = "device_received"
    DIAGNOSING = "diagnosing"
    WAITING_FOR_CUSTOMER = "waiting_for_customer"
    WAITING_FOR_PARTS = "waiting_for_parts"
    IN_PROGRESS = "in_progress"
    REPAIRED = "repaired"
    READY_FOR_COLLECTION = "ready_for_collection"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


_REPAIR_STATUS_VALUES = {
    "lead", "device_received", "diagnosing", "waiting_for_customer",
    "waiting_for_parts", "in_progress", "repaired", "ready_for_collection",
    "completed", "cancelled",
}


class RepairCreate(BaseModel):
    customer_id: uuid.UUID
    device_id: uuid.UUID
    issue_description: str = Field(..., min_length=1)
    status: str = Field(default="lead")
    diagnosis: Optional[str] = None
    repair_notes: Optional[str] = None
    labour_hours: Optional[str] = Field(None, max_length=10)
    labour_cost: Optional[str] = Field(None, max_length=20)
    parts_cost: Optional[str] = Field(None, max_length=20)
    estimated_completion: Optional[str] = Field(None, max_length=50)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _REPAIR_STATUS_VALUES:
            raise ValueError(f"Invalid repair status: {v!r}")
        return v


class RepairUpdate(BaseModel):
    status: Optional[str] = None
    issue_description: Optional[str] = Field(None, min_length=1)
    diagnosis: Optional[str] = None
    repair_notes: Optional[str] = None
    labour_hours: Optional[str] = Field(None, max_length=10)
    labour_cost: Optional[str] = Field(None, max_length=20)
    parts_cost: Optional[str] = Field(None, max_length=20)
    estimated_completion: Optional[str] = Field(None, max_length=50)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v not in _REPAIR_STATUS_VALUES:
            raise ValueError(f"Invalid repair status: {v!r}")
        return v


class RepairStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _REPAIR_STATUS_VALUES:
            raise ValueError(f"Invalid repair status: {v!r}")
        return v


class RepairStatusHistoryResponse(BaseModel):
    id: uuid.UUID
    repair_id: uuid.UUID
    from_status: Optional[str] = None
    to_status: str
    changed_by: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RepairTimelineEntry(BaseModel):
    timestamp: datetime
    status: str
    notes: Optional[str] = None
    changed_by: Optional[uuid.UUID] = None


class RepairResponse(BaseModel):
    id: uuid.UUID
    ticket_number: str
    customer_id: uuid.UUID
    device_id: Optional[uuid.UUID] = None
    status: str
    issue_description: str
    diagnosis: Optional[str] = None
    repair_notes: Optional[str] = None
    labour_hours: Optional[str] = None
    labour_cost: Optional[str] = None
    parts_cost: Optional[str] = None
    estimated_completion: Optional[str] = None
    intake_date: datetime
    completed_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RepairDetailResponse(RepairResponse):
    customer: Optional["CustomerResponse"] = None
    device: Optional["DeviceResponse"] = None
    status_history: list["RepairStatusHistoryResponse"] = Field(default_factory=list)
    photos: list["PhotoResponse"] = Field(default_factory=list)
    documents: list["DocumentResponse"] = Field(default_factory=list)
    quotes: list["QuoteResponse"] = Field(default_factory=list)
    invoices: list["InvoiceResponse"] = Field(default_factory=list)
    timeline: list["RepairTimelineEntry"] = Field(default_factory=list)
