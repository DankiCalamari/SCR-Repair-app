import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
import enum


class WarrantyStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CLAIMED = "claimed"
    VOID = "void"


class WarrantyClaimStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    RESOLVED = "resolved"


class WarrantyRecord(Base):
    __tablename__ = "warranty_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repair_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repairs.id"), nullable=False, unique=True)
    warranty_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    issue_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expiry_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[WarrantyStatus] = mapped_column(SAEnum(WarrantyStatus), default=WarrantyStatus.ACTIVE, nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    repair = relationship("Repair", back_populates="warranty")
    claims = relationship("WarrantyClaim", back_populates="warranty", cascade="all, delete-orphan")


class WarrantyClaim(Base):
    __tablename__ = "warranty_claims"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    warranty_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("warranty_records.id"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[WarrantyClaimStatus] = mapped_column(SAEnum(WarrantyClaimStatus), default=WarrantyClaimStatus.PENDING, nullable=False)
    resolution_notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    resolved_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    warranty = relationship("WarrantyRecord", back_populates="claims")
