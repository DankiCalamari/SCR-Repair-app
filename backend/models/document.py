import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
import enum


class DocumentType(str, enum.Enum):
    INTAKE_RECEIPT = "intake_receipt"
    QUOTE = "quote"
    QUOTE_APPROVAL = "quote_approval"
    INVOICE = "invoice"
    COLLECTION_RECEIPT = "collection_receipt"
    WARRANTY_RECEIPT = "warranty_receipt"


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
