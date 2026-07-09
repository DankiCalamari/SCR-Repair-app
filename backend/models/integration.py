import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean, Text, Numeric, Enum as SAEnum, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from database import Base
import enum


class IntegrationProvider(str, enum.Enum):
    HNTRY = "hnry"
    XERO = "xero"
    MYOB = "myob"
    QUICKBOOKS = "quickbooks"


class SyncStatus(str, enum.Enum):
    PENDING = "pending"
    QUEUED = "queued"
    SYNCING = "syncing"
    SYNCED = "synced"
    FAILED = "failed"


class IntegrationSetting(Base):
    __tablename__ = "integration_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[IntegrationProvider] = mapped_column(SAEnum(IntegrationProvider), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    webhook_url: Mapped[str] = mapped_column(String(2000), nullable=True)  # Encrypted at rest
    secret_token: Mapped[str] = mapped_column(String(2000), nullable=True)  # Encrypted at rest
    last_sync_success: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    last_sync_error: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)


class SyncLog(Base):
    __tablename__ = "integration_sync_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[IntegrationProvider] = mapped_column(SAEnum(IntegrationProvider), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # customer, invoice, expense
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # create_client, create_invoice, etc.
    webhook_url: Mapped[str] = mapped_column(String(2000), nullable=False)  # Encrypted at rest
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    response_status: Mapped[int] = mapped_column(Numeric, nullable=True)
    response_body: Mapped[str] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Numeric, nullable=True)
    retry_count: Mapped[int] = mapped_column(Numeric, default=0, nullable=False)
    status: Mapped[SyncStatus] = mapped_column(SAEnum(SyncStatus), default=SyncStatus.PENDING, nullable=False)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(100), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)


class CustomerIntegration(Base):
    __tablename__ = "customer_integration_sync"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[IntegrationProvider] = mapped_column(SAEnum(IntegrationProvider), nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    external_id: Mapped[str] = mapped_column(String(200), nullable=True)  # Hnry/Zapier client ID
    sync_status: Mapped[SyncStatus] = mapped_column(SAEnum(SyncStatus), default=SyncStatus.PENDING, nullable=False)
    last_sync_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)