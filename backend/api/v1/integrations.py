"""
Integration API endpoints for accounting platform integrations.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_admin
from models.user import User
from models.customer import Customer
from models.integration import IntegrationProvider, SyncStatus, IntegrationSetting, SyncLog
from services.integration_service import (
    get_integration_settings,
    update_customer_integration,
    execute_sync,
    ZapierHnryProvider
)

router = APIRouter(prefix="/integrations", tags=["integrations"])


class IntegrationSettingsUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    webhook_url: Optional[str] = Field(None, max_length=2000)
    secret_token: Optional[str] = Field(None, max_length=2000)


class IntegrationStatusResponse(BaseModel):
    provider: str
    is_enabled: bool
    webhook_url: Optional[str]
    last_sync_success: Optional[datetime]
    last_sync_error: Optional[datetime]
    error_message: Optional[str]


class SyncLogResponse(BaseModel):
    id: uuid.UUID
    provider: str
    entity_type: str
    action: str
    status: str
    response_status: Optional[int]
    duration_ms: Optional[int]
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]


@router.get("/settings/{provider}", response_model=IntegrationStatusResponse)
async def get_integration(
    provider: IntegrationProvider,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get integration settings for a provider."""
    integration = await get_integration_settings(db, provider)
    if not integration:
        return IntegrationStatusResponse(
            provider=provider.value,
            is_enabled=False,
            webhook_url=None,
            last_sync_success=None,
            last_sync_error=None,
            error_message=None
        )
    return IntegrationStatusResponse(
        provider=integration.provider.value,
        is_enabled=integration.is_enabled,
        webhook_url=integration.webhook_url,
        last_sync_success=integration.last_sync_success,
        last_sync_error=integration.last_sync_error,
        error_message=integration.error_message
    )


@router.put("/settings/{provider}")
async def update_integration(
    provider: IntegrationProvider,
    update: IntegrationSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update integration settings."""
    integration = await get_integration_settings(db, provider)
    if not integration:
        integration = IntegrationSetting(
            id=uuid.uuid4(),
            provider=provider,
            is_enabled=False,
            settings={}
        )
        db.add(integration)
    
    if update.is_enabled is not None:
        integration.is_enabled = update.is_enabled
    if update.webhook_url is not None:
        integration.webhook_url = update.webhook_url
    if update.secret_token is not None:
        integration.secret_token = update.secret_token
    
    await db.commit()
    return {"status": "success"}


@router.post("/settings/{provider}/test")
async def test_integration_connection(
    provider: IntegrationProvider,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Test the webhook connection by sending a ping."""
    integration = await get_integration_settings(db, provider)
    if not integration or not integration.webhook_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook URL not configured"
        )
    
    try:
        provider_instance = ZapierHnryProvider(integration.webhook_url, integration.secret_token)
        result = await provider_instance._send_webhook("test_connection", {"ping": True})
        
        if result["success"]:
            integration.last_sync_success = datetime.now(timezone.utc).replace(tzinfo=None)
            integration.error_message = None
            await db.commit()
            return {"status": "success", "message": "Connection successful"}
        else:
            integration.last_sync_error = datetime.now(timezone.utc).replace(tzinfo=None)
            integration.error_message = f"HTTP {result['status']}"
            await db.commit()
            return {"status": "error", "message": f"HTTP {result['status']}"}
    except Exception as e:
        integration.last_sync_error = datetime.now(timezone.utc).replace(tzinfo=None)
        integration.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection failed: {str(e)}"
        )


@router.post("/customers/{customer_id}/sync-client")
async def sync_customer(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Sync a customer to Hnry via Zapier webhook."""
    integration = await get_integration_settings(db, IntegrationProvider.HNTRY)
    if not integration or not integration.is_enabled:
        raise HTTPException(status_code=400, detail="Hnry integration not enabled")
    
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    payload = {
        "customerId": str(customer.id),
        "firstName": customer.first_name,
        "lastName": customer.last_name,
        "businessName": customer.business_name,
        "email": customer.email,
        "phone": customer.phone,
        "address": customer.address,
        "suburb": customer.suburb,
        "state": customer.state,
        "postcode": customer.postcode,
        "country": customer.country
    }
    
    success = await execute_sync(
        db, IntegrationProvider.HNTRY, "customer", customer_id,
        "create_client", payload, str(customer_id)
    )
    
    if success:
        await update_customer_integration(db, IntegrationProvider.HNTRY, customer_id, SyncStatus.SYNCED)
        await db.commit()
        return {"status": "synced"}
    else:
        await update_customer_integration(db, IntegrationProvider.HNTRY, customer_id, SyncStatus.FAILED)
        await db.commit()
        return {"status": "failed"}


@router.get("/sync-logs", response_model=List[SyncLogResponse])
async def get_sync_logs(
    provider: Optional[IntegrationProvider] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get sync logs."""
    query = select(SyncLog).order_by(SyncLog.created_at.desc()).limit(limit)
    if provider:
        query = query.where(SyncLog.provider == provider)
    
    result = await db.execute(query)
    logs = list(result.scalars().all())
    
    return [SyncLogResponse(
        id=log.id,
        provider=log.provider.value,
        entity_type=log.entity_type,
        action=log.action,
        status=log.status.value,
        response_status=log.response_status,
        duration_ms=log.duration_ms,
        error_message=log.error_message,
        created_at=log.created_at,
        completed_at=log.completed_at
    ) for log in logs]


@router.post("/sync-logs/{log_id}/retry")
async def retry_sync(
    log_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Retry a failed sync."""
    result = await db.execute(select(SyncLog).where(SyncLog.id == log_id))
    sync_log = result.scalar_one_or_none()
    
    if not sync_log:
        raise HTTPException(status_code=404, detail="Sync log not found")
    
    success = await execute_sync(
        db, sync_log.provider, sync_log.entity_type, sync_log.entity_id,
        sync_log.action, sync_log.payload, sync_log.idempotency_key
    )
    
    if success:
        return {"status": "retried", "result": "success"}
    else:
        sync_log.retry_count = (sync_log.retry_count or 0) + 1
        await db.commit()
        return {"status": "retried", "result": "failed"}


@router.post("/invoices/{invoice_id}/sync-invoice")
async def sync_invoice_to_hnry(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Sync an invoice to Hnry via Zapier webhook."""
    integration = await get_integration_settings(db, IntegrationProvider.HNTRY)
    if not integration or not integration.is_enabled:
        raise HTTPException(status_code=400, detail="Hnry integration not enabled")
    
    # Get invoice with items and customer
    from models.invoice import Invoice
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Build comprehensive payload
    payload = {
        "invoiceNumber": invoice.invoice_number,
        "invoiceDate": invoice.created_at.isoformat() if invoice.created_at else None,
        "dueDate": invoice.due_date.isoformat() if invoice.due_date else None,
        "customer": {
            "id": str(invoice.repair.customer.id) if invoice.repair and invoice.repair.customer else None,
            "name": f"{invoice.repair.customer.first_name} {invoice.repair.customer.last_name}" if invoice.repair and invoice.repair.customer else None,
        },
        "referenceNumber": f"R{invoice.repair.id}" if invoice.repair else None,
        "repairNumber": f"R{invoice.repair.id}" if invoice.repair else None,
        "repairDescription": invoice.repair.device.device_type if invoice.repair and invoice.repair.device else None,
        "subtotal": float(invoice.subtotal),
        "gst": float(invoice.gst_amount),
        "total": float(invoice.total_amount),
        "currency": "AUD",
        "labour": 0,
        "parts": 0,
        "discount": 0,
        "lineItems": [
            {
                "description": item.description,
                "quantity": float(item.quantity),
                "unitPrice": float(item.unit_price),
                "tax": "GST",
                "total": float(item.total),
                "type": item.item_type
            }
            for item in invoice.items
        ]
    }
    
    success = await execute_sync(
        db, IntegrationProvider.HNTRY, "invoice", invoice_id,
        "create_invoice", payload, f"invoice-{invoice_id}"
    )
    
    if success:
        return {"status": "synced"}
    else:
        return {"status": "failed"}


@router.post("/expenses/raise")
async def raise_expense_to_hnry(
    expense_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Raise an expense in Hnry via Zapier webhook."""
    integration = await get_integration_settings(db, IntegrationProvider.HNTRY)
    if not integration or not integration.is_enabled:
        raise HTTPException(status_code=400, detail="Hnry integration not enabled")
    
    payload = {
        "supplier": expense_data.get("supplier"),
        "date": expense_data.get("date"),
        "amount": expense_data.get("amount"),
        "category": expense_data.get("category"),
        "notes": expense_data.get("notes"),
        "receipt_url": expense_data.get("receipt_url"),
    }
    
    expense_id = uuid.uuid4()
    success = await execute_sync(
        db, IntegrationProvider.HNTRY, "expense", expense_id,
        "raise_expense", payload, f"expense-{expense_id}"
    )
    
    if success:
        return {"status": "synced"}
    else:
        return {"status": "failed"}