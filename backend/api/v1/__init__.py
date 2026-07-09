from fastapi import APIRouter

from api.v1.auth import router as auth_router
from api.v1.customers import router as customers_router
from api.v1.devices import router as devices_router
from api.v1.repairs import router as repairs_router
from api.v1.leads import router as leads_router
from api.v1.quotes import router as quotes_router
from api.v1.invoices import router as invoices_router
from api.v1.sms import router as sms_router
from api.v1.email import router as email_router
from api.v1.warranty import router as warranty_router
from api.v1.documents import router as documents_router
from api.v1.photos import router as photos_router
from api.v1.dashboard import router as dashboard_router
from api.v1.system_health import router as system_health_router
from api.v1.admin import router as admin_router
from api.v1.public import router as public_router
from api.v1.push_subscriptions import router as push_subscriptions_router
from api.v1.integrations import router as integrations_router

api_router = APIRouter(prefix="/v1")
api_router.include_router(public_router, prefix="", tags=["public"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(customers_router, prefix="/customers", tags=["customers"])
api_router.include_router(devices_router, prefix="/devices", tags=["devices"])
api_router.include_router(repairs_router, prefix="/repairs", tags=["repairs"])
api_router.include_router(leads_router, prefix="/leads", tags=["leads"])
api_router.include_router(quotes_router, prefix="/quotes", tags=["quotes"])
api_router.include_router(invoices_router, prefix="/invoices", tags=["invoices"])
api_router.include_router(sms_router, prefix="/sms", tags=["sms"])
api_router.include_router(email_router, prefix="/email", tags=["email"])
api_router.include_router(warranty_router, prefix="/warranties", tags=["warranties"])
api_router.include_router(documents_router, prefix="/documents", tags=["documents"])
api_router.include_router(photos_router, prefix="/photos", tags=["photos"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(system_health_router, prefix="/system-health", tags=["system-health"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(push_subscriptions_router, prefix="/push", tags=["push-notifications"])
api_router.include_router(integrations_router, prefix="", tags=["integrations"])
