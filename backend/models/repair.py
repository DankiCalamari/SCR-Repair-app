import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
import enum


class RepairStatus(str, enum.Enum):
    LEAD = "lead"
    DEVICE_RECEIVED = "device_received"
    DIAGNOSING = "diagnosing"
    WAITING_FOR_CUSTOMER = "waiting_for_customer"
    WAITING_FOR_PARTS = "waiting_for_parts"
    IN_PROGRESS = "in_progress"
    REPAIRED = "repaired"
    READY_FOR_COLLECTION = "ready_for_collection"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Repair(Base):
    __tablename__ = "repairs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=True)
    status: Mapped[RepairStatus] = mapped_column(SAEnum(RepairStatus), default=RepairStatus.LEAD, nullable=False)
    issue_description: Mapped[str] = mapped_column(Text, nullable=False)
    diagnosis: Mapped[str] = mapped_column(Text, nullable=True)
    repair_notes: Mapped[str] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[str] = mapped_column(Text, nullable=True)  # Staff-only notes, not visible to customer
    labour_hours: Mapped[str] = mapped_column(String(10), nullable=True)
    labour_cost: Mapped[str] = mapped_column(String(20), nullable=True)
    parts_cost: Mapped[str] = mapped_column(String(20), nullable=True)
    estimated_completion: Mapped[str] = mapped_column(String(50), nullable=True)
    intake_date: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    completed_date: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    customer = relationship("Customer", back_populates="repairs")
    device = relationship("Device", back_populates="repairs")
    status_history = relationship("RepairStatusHistory", back_populates="repair", order_by="RepairStatusHistory.created_at", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="repair", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="repair", cascade="all, delete-orphan")
    quotes = relationship("Quote", back_populates="repair", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="repair", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="repair", cascade="all, delete-orphan")
    sms_messages = relationship("SmsMessage", back_populates="repair", cascade="all, delete-orphan")
    emails = relationship("EmailMessage", back_populates="repair", cascade="all, delete-orphan")
    warranty = relationship("WarrantyRecord", back_populates="repair", uselist=False, cascade="all, delete-orphan")


class RepairStatusHistory(Base):
    __tablename__ = "repair_status_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repair_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repairs.id"), nullable=False)
    from_status: Mapped[str] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    repair = relationship("Repair", back_populates="status_history")
