"""Document template configuration for fully customizable document generation."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, Boolean, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


# ─── Document Type Enum ──────────────────────────────────────────────────────────

class DocumentTypeEnum(str):
    INTAKE_RECEIPT = "intake_receipt"
    REPAIR_JOB_SHEET = "repair_job_sheet"
    DEVICE_INTAKE_FORM = "device_intake_form"
    DEVICE_CONDITION_REPORT = "device_condition_report"
    EXISTING_DAMAGE_REPORT = "existing_damage_report"
    DIAGNOSTIC_REPORT = "diagnostic_report"
    QUOTE = "quote"
    QUOTE_APPROVAL_FORM = "quote_approval_form"
    QUOTE_ACCEPTANCE_CERTIFICATE = "quote_acceptance_certificate"
    INVOICE = "invoice"
    TAX_INVOICE = "tax_invoice"
    COLLECTION_RECEIPT = "collection_receipt"
    WARRANTY_CERTIFICATE = "warranty_certificate"
    WARRANTY_CLAIM_FORM = "warranty_claim_form"
    REPAIR_COMPLETION_REPORT = "repair_completion_report"
    REPAIR_SUMMARY = "repair_summary"
    PARTS_ORDER = "parts_order"
    PURCHASE_ORDER = "purchase_order"
    CUSTOMER_RECEIPT = "customer_receipt"
    PAYMENT_RECEIPT = "payment_receipt"
    CREDIT_NOTE = "credit_note"
    REFUND_RECEIPT = "refund_receipt"
    SERVICE_AGREEMENT = "service_agreement"
    REPAIR_AUTHORISATION = "repair_authorisation"
    PRIVACY_CONSENT = "privacy_consent"
    DATA_LOSS_DISCLAIMER = "data_loss_disclaimer"
    EXISTING_DAMAGE_ACKNOWLEDGEMENT = "existing_damage_acknowledgement"
    TERMS_CONDITIONS = "terms_conditions"
    ABANDONED_GOODS_NOTICE = "abandoned_goods_notice"
    DEVICE_COLLECTION_AUTHORITY = "device_collection_authority"


# ─── Template Version Model ────────────────────────────────────────────────────

class TemplateVersion(Base):
    """Stores version history of templates."""
    __tablename__ = "template_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("document_templates.id"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    template_data: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string of template structure
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    change_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    template: relationship = relationship("DocumentTemplate", back_populates="versions")


# ─── Business Info Model ───────────────────────────────────────────────────────

class BusinessInfo(Base):
    """Global business information for document branding."""
    __tablename__ = "business_info"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    abn: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    gst_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # "registered", "unregistered"
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    postal_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bank_bsb: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    bank_account: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bank_account_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    payid: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    business_registration: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    slogan: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    social_facebook: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    social_instagram: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    social_twitter: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    social_linkedin: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)


# ─── Branding Model ────────────────────────────────────────────────────────────

class Branding(Base):
    """Branding configuration for documents."""
    __tablename__ = "branding"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_info_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("business_info.id"), nullable=True)
    
    # Logos
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    light_logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    dark_logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    watermark_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Colors
    primary_color: Mapped[str] = mapped_column(String(7), default="#1a1a2e")
    secondary_color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    accent_color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    text_color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    
    # Fonts
    font_family: Mapped[str] = mapped_column(String(100), default="Helvetica")
    font_heading: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    font_body: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Font sizes
    font_size_small: Mapped[int] = mapped_column(Integer, default=8)
    font_size_body: Mapped[int] = mapped_column(Integer, default=9)
    font_size_heading: Mapped[int] = mapped_column(Integer, default=12)
    font_size_title: Mapped[int] = mapped_column(Integer, default=16)
    
    # Theme
    theme: Mapped[str] = mapped_column(String(50), default="professional")
    
    # Icons
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)


# ─── Document Template Model ───────────────────────────────────────────────────

class DocumentTemplate(Base):
    """Main template model with full customization support."""
    __tablename__ = "document_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)  # intake_receipt, quote, invoice, etc.
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Template configuration
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)  # System templates cannot be deleted
    
    # Page settings
    page_size: Mapped[str] = mapped_column(String(20), default="A4")  # A4, Letter, Legal, A5, thermal
    page_orientation: Mapped[str] = mapped_column(String(10), default="portrait")  # portrait, landscape
    margin_top: Mapped[int] = mapped_column(Integer, default=15)
    margin_bottom: Mapped[int] = mapped_column(Integer, default=15)
    margin_left: Mapped[int] = mapped_column(Integer, default=15)
    margin_right: Mapped[int] = mapped_column(Integer, default=15)
    bleed_mm: Mapped[int] = mapped_column(Integer, default=0)
    header_height_mm: Mapped[int] = mapped_column(Integer, default=20)
    footer_height_mm: Mapped[int] = mapped_column(Integer, default=15)
    
    # Branding association
    branding_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("branding.id"), nullable=True)
    business_info_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("business_info.id"), nullable=True)
    
    # Template structure - JSON representation of layout components
    template_structure: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    
    # Header/Footer configuration
    header_config: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    footer_config: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    
    # Conditional rules
    conditional_rules: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    
    # Version tracking
    version: Mapped[int] = mapped_column(Integer, default=1)
    last_generated: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    
    # Relationships
    versions: relationship = relationship("TemplateVersion", back_populates="template")
    branding: relationship = relationship("Branding")
    business_info: relationship = relationship("BusinessInfo")

    def __repr__(self) -> str:
        return f"<DocumentTemplate {self.document_type}: {self.display_name}>"


# ─── Generated Document Model ──────────────────────────────────────────────────

class GeneratedDocument(Base):
    """Tracks generated documents for audit and management."""
    __tablename__ = "generated_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repair_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("repairs.id"), nullable=True)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("document_templates.id"), nullable=False)
    
    document_number: Mapped[str] = mapped_column(String(100), nullable=False)
    document_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Generation details
    generated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    
    # Version tracking
    template_version: Mapped[int] = mapped_column(Integer, default=1)
    
    # Customer interactions
    customer_viewed: Mapped[bool] = mapped_column(Boolean, default=False)
    customer_viewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    customer_downloaded: Mapped[bool] = mapped_column(Boolean, default=False)
    customer_downloaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    customer_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    customer_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    customer_signature_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Metadata
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Additional document metadata
    
    # Relationships
    repair: relationship = relationship("Repair")
    template: relationship = relationship("DocumentTemplate")
    generator: relationship = relationship("User")

    def __repr__(self) -> str:
        return f"<GeneratedDocument {self.document_name}: {self.document_number}>"


# ─── Document Settings Model ───────────────────────────────────────────────────

class DocumentSettings(Base):
    """Global document generation settings."""
    __tablename__ = "document_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Page defaults
    default_page_size: Mapped[str] = mapped_column(String(20), default="A4")
    default_orientation: Mapped[str] = mapped_column(String(10), default="portrait")
    
    # QR Code settings
    qr_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    qr_size: Mapped[int] = mapped_column(Integer, default=100)
    
    # Barcode settings
    barcode_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    barcode_type: Mapped[str] = mapped_column(String(20), default="code128")
    
    # Signature settings
    signature_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    signature_width_mm: Mapped[int] = mapped_column(Integer, default=60)
    signature_height_mm: Mapped[int] = mapped_column(Integer, default=30)
    
    # Watermark settings
    watermark_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    watermark_opacity: Mapped[float] = mapped_column(Integer, default=10)  # percentage
    
    # Email templates for document delivery
    email_template_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("email_templates.id"), nullable=True)
    
    # SMS templates for document delivery
    sms_template_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("sms_templates.id"), nullable=True)
    
    # PDF options
    pdf_password_protection: Mapped[bool] = mapped_column(Boolean, default=False)
    pdf_high_res: Mapped[bool] = mapped_column(Boolean, default=True)
    
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)


# ─── Custom Field Model ───────────────────────────────────────────────────────

class CustomField(Base):
    """Custom fields for document templates."""
    __tablename__ = "custom_fields"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("document_templates.id"), nullable=False)
    
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    field_label: Mapped[str] = mapped_column(String(255), nullable=False)
    field_type: Mapped[str] = mapped_column(String(50), nullable=False)  # text, number, date, boolean, image
    field_options: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON for select/radio options
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    def __repr__(self) -> str:
        return f"<CustomField {self.field_name}>"


# ─── Translation Model ─────────────────────────────────────────────────────────

class DocumentTranslation(Base):
    """Multilingual support for document templates."""
    __tablename__ = "document_translations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("document_templates.id"), nullable=False)
    
    language_code: Mapped[str] = mapped_column(String(10), nullable=False)  # en, es, fr, etc.
    translated_content: Mapped[str] = mapped_column(Text, nullable=False)  # JSON translated template
    translated_ui: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON translated UI strings
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    def __repr__(self) -> str:
        return f"<DocumentTranslation {self.template_id}: {self.language_code}>"