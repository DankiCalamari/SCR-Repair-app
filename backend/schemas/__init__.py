from schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserInDB,
    Token,
    TokenPayload,
    LoginRequest,
    RegisterRequest,
)
from schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerWithRepairs,
)
from schemas.device import (
    DeviceCreate,
    DeviceUpdate,
    DeviceResponse,
)
from schemas.repair import (
    RepairCreate,
    RepairUpdate,
    RepairResponse,
    RepairStatusUpdate,
    RepairStatusHistoryResponse,
    RepairTimelineEntry,
    RepairDetailResponse,
)
from schemas.photo import (
    PhotoResponse,
    PhotoUploadResponse,
)
from schemas.document import (
    DocumentResponse,
    DocumentGenerateRequest,
)
from schemas.quote import (
    QuoteCreate,
    QuoteUpdate,
    QuoteResponse,
    QuoteItemCreate,
    QuoteItemResponse,
    QuoteApprovalRequest,
    QuoteApprovalResponse,
)
from schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceItemCreate,
    InvoiceItemResponse,
    InvoiceDetailResponse,
    MarkPaidRequest,
)
from schemas.sms import (
    SmsSendRequest,
    SmsMessageResponse,
    SmsWebhookPayload,
    SmsTemplateResponse,
    SmsGatewayStatus,
    SmsTemplateSendRequest,
    SmsGatewaySettingsSchema,
    SmsGatewaySettingsUpdate,
)
from schemas.email import (
    EmailSendRequest,
    EmailMessageResponse,
    EmailSyncResponse,
    EmailConnectionTest,
)
from schemas.warranty import (
    WarrantyResponse,
    WarrantyClaimCreate,
    WarrantyClaimResponse,
    WarrantyValidateResponse,
)
from schemas.lead import (
    LeadCreate,
    LeadUpdate,
    LeadResponse,
    LeadConvertRequest,
)
from schemas.booking import (
    BookingCreate,
    BookingUpdate,
    BookingResponse,
    BookingDetailResponse,
)
from schemas.audit_log import AuditLogResponse
from schemas.dashboard import (
    DashboardWidgets,
    DashboardStats,
    RecentActivity,
)
from schemas.system_health import (
    SystemHealthResponse,
    ComponentHealth,
)

__all__ = [
    # User
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserInDB",
    "Token",
    "TokenPayload",
    "LoginRequest",
    "RegisterRequest",
    # Customer
    "CustomerCreate",
    "CustomerUpdate",
    "CustomerResponse",
    "CustomerWithRepairs",
    # Device
    "DeviceCreate",
    "DeviceUpdate",
    "DeviceResponse",
    # Repair
    "RepairCreate",
    "RepairUpdate",
    "RepairResponse",
    "RepairStatusUpdate",
    "RepairStatusHistoryResponse",
    "RepairTimelineEntry",
    "RepairDetailResponse",
    # Photo
    "PhotoResponse",
    "PhotoUploadResponse",
    # Document
    "DocumentResponse",
    "DocumentGenerateRequest",
    # Quote
    "QuoteCreate",
    "QuoteUpdate",
    "QuoteResponse",
    "QuoteItemCreate",
    "QuoteItemResponse",
    "QuoteApprovalRequest",
    "QuoteApprovalResponse",
    # Invoice
    "InvoiceCreate",
    "InvoiceUpdate",
    "InvoiceResponse",
    "InvoiceItemCreate",
    "InvoiceItemResponse",
    "InvoiceDetailResponse",
    "MarkPaidRequest",
    # SMS
    "SmsSendRequest",
    "SmsMessageResponse",
    "SmsWebhookPayload",
    "SmsTemplateResponse",
    "SmsGatewayStatus",
    "SmsTemplateSendRequest",
    "SmsGatewaySettingsSchema",
    "SmsGatewaySettingsUpdate",
    # Email
    "EmailSendRequest",
    "EmailMessageResponse",
    "EmailSyncResponse",
    "EmailConnectionTest",
    # Warranty
    "WarrantyResponse",
    "WarrantyClaimCreate",
    "WarrantyClaimResponse",
    "WarrantyValidateResponse",
    # Lead
    "LeadCreate",
    "LeadUpdate",
    "LeadResponse",
    "LeadConvertRequest",
    # Booking
    "BookingCreate",
    "BookingUpdate",
    "BookingResponse",
    "BookingDetailResponse",
    # Audit Log
    "AuditLogResponse",
    # Dashboard
    "DashboardWidgets",
    "DashboardStats",
    "RecentActivity",
    # System Health
    "SystemHealthResponse",
    "ComponentHealth",
]


# ── Rebuild models with forward references ────────────────────────────────
from schemas.repair import RepairDetailResponse
from schemas.customer import CustomerWithRepairs

RepairDetailResponse.model_rebuild()
CustomerWithRepairs.model_rebuild()
