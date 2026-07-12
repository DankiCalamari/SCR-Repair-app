"""PDF template schemas."""

from __future__ import annotations

import uuid
from typing import Optional
from pydantic import BaseModel, Field


class PdfTemplateBase(BaseModel):
    display_name: str | None = None
    is_active: bool = True
    primary_color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    accent_color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    text_color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    header_text: Optional[str] = None
    footer_text: Optional[str] = None
    show_logo: bool = True
    logo_url: Optional[str] = None
    page_margin_mm: int = Field(default=15, ge=5, le=50)
    font_family: str = Field(default="Helvetica", max_length=50)
    custom_fields: Optional[str] = None


class PdfTemplateCreate(PdfTemplateBase):
    name: str = Field(min_length=1, max_length=50)


class PdfTemplateUpdate(PdfTemplateBase):
    display_name: str | None = None
    is_active: bool | None = None


class PdfTemplateResponse(PdfTemplateBase):
    id: uuid.UUID
    name: str
    
    class Config:
        from_attributes = True