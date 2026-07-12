"""PDF template configuration for customizable document generation."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, Boolean, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class PdfTemplate(Base):
    __tablename__ = "pdf_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True)  # quote, invoice, warranty_receipt, intake_receipt, collection_receipt
    display_name: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Brand customization
    primary_color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # hex color like #e94560
    accent_color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    text_color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    
    # Header customization
    header_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    footer_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    show_logo: Mapped[bool] = mapped_column(Boolean, default=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Layout options
    page_margin_mm: Mapped[int] = mapped_column(Integer, default=15)
    font_family: Mapped[str] = mapped_column(String(50), default="Helvetica")
    
    # Custom fields - JSON schema for template variables
    custom_fields: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string for extra template variables
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    def __repr__(self) -> str:
        return f"<PdfTemplate {self.name}: {self.display_name}>"