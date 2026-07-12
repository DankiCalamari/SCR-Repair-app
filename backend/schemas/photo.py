import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Photo category enum (mirrors the SQLAlchemy enum)
# ---------------------------------------------------------------------------

PHOTO_CATEGORY_VALUES = {
    "intake", "damage", "diagnostic", "repair_progress",
    "parts_replacement", "completed", "warranty", "general",
}


# ---------------------------------------------------------------------------
# Photo schemas
# ---------------------------------------------------------------------------

class PhotoResponse(BaseModel):
    id: uuid.UUID
    repair_id: Optional[uuid.UUID] = None
    device_id: Optional[uuid.UUID] = None
    customer_id: Optional[uuid.UUID] = None
    uploaded_by: Optional[uuid.UUID] = None
    category: str
    filename: str
    original_filename: str
    file_path: str
    thumbnail_path: Optional[str] = None
    medium_path: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    is_important: bool = False
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PhotoUploadResponse(BaseModel):
    id: uuid.UUID
    filename: str
    original_filename: str
    file_path: str
    thumbnail_path: Optional[str] = None
    medium_path: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: str
    category: str
    repair_id: Optional[uuid.UUID] = None
    device_id: Optional[uuid.UUID] = None
    customer_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime


class PhotoUpdate(BaseModel):
    category: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    is_important: Optional[bool] = None
    sort_order: Optional[int] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in PHOTO_CATEGORY_VALUES:
            raise ValueError(
                f"Invalid category '{v}'. Valid: {sorted(PHOTO_CATEGORY_VALUES)}"
            )
        return v


class PhotoCategoryCount(BaseModel):
    category: str
    count: int
