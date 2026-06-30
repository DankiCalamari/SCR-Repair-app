import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Document type enum (mirrors the SQLAlchemy enum)
# ---------------------------------------------------------------------------

_DOCUMENT_TYPE_VALUES = {
    "intake_receipt",
    "quote",
    "quote_approval",
    "invoice",
    "collection_receipt",
    "warranty_receipt",
}


# ---------------------------------------------------------------------------
# Document schemas
# ---------------------------------------------------------------------------

class DocumentResponse(BaseModel):
    id: uuid.UUID
    repair_id: Optional[uuid.UUID] = None
    document_type: str
    filename: str
    file_path: str
    file_size: Optional[str] = None
    generated_by: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentGenerateRequest(BaseModel):
    repair_id: uuid.UUID
    document_type: str

    @field_validator("document_type")
    @classmethod
    def validate_document_type(cls, v: str) -> str:
        if v not in _DOCUMENT_TYPE_VALUES:
            raise ValueError(f"Invalid document type: {v!r}")
        return v
