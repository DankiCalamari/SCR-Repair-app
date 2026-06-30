import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
import enum


class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    CONVERTED = "converted"
    CLOSED = "closed"


class PreferredContactMethod(str, enum.Enum):
    PHONE = "phone"
    EMAIL = "email"
    SMS = "sms"


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    device_type: Mapped[str] = mapped_column(String(100), nullable=True)
    device_model: Mapped[str] = mapped_column(String(200), nullable=True)
    issue_description: Mapped[str] = mapped_column(Text, nullable=True)
    preferred_contact_method: Mapped[PreferredContactMethod] = mapped_column(
        SAEnum(PreferredContactMethod), default=PreferredContactMethod.PHONE, nullable=False
    )
    status: Mapped[LeadStatus] = mapped_column(SAEnum(LeadStatus), default=LeadStatus.NEW, nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    converted_repair_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repairs.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    customer = relationship("Customer", back_populates="leads")
