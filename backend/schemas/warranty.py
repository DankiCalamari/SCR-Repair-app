import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Warranty status enums (mirrors the SQLAlchemy enums)
# ---------------------------------------------------------------------------

_WARRANTY_STATUS_VALUES = {"active", "expired", "claimed", "void"}
_WARRANTY_CLAIM_STATUS_VALUES = {"pending", "approved", "rejected", "resolved"}


# ---------------------------------------------------------------------------
# Warranty schemas
# ---------------------------------------------------------------------------

class WarrantyResponse(BaseModel):
    id: uuid.UUID
    repair_id: uuid.UUID
    warranty_number: str
    issue_date: datetime
    expiry_date: datetime
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WarrantyClaimCreate(BaseModel):
    warranty_id: uuid.UUID
    description: str = Field(..., min_length=1)


class WarrantyClaimResponse(BaseModel):
    id: uuid.UUID
    warranty_id: uuid.UUID
    description: str
    status: str
    resolution_notes: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class WarrantyValidateResponse(BaseModel):
    valid: bool
    warranty_number: Optional[str] = None
    status: Optional[str] = None
    expiry_date: Optional[datetime] = None
    message: str
