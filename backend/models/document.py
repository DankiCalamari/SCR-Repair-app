import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
import enum


class DocumentType(str, enum.Enum):
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


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repair_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repairs.id"), nullable=True)
    document_type: Mapped[DocumentType] = mapped_column(SAEnum(DocumentType), nullable=False)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size: Mapped[str] = mapped_column(String(20), nullable=True)
    generated_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    repair = relationship("Repair", back_populates="documents")
