"""
Integration service for accounting platform integrations (Hnry via Zapier, Xero, MYOB, QuickBooks).

This module provides a provider-based architecture for syncing data to external accounting platforms
via webhooks (Zapier integration).
"""
from __future__ import annotations

import uuid
import json
import time
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Protocol
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.integration import IntegrationProvider, SyncStatus, IntegrationSetting, SyncLog, CustomerIntegration


# Provider interface for accounting integrations
class AccountingProvider(Protocol):
    """Protocol defining the interface for accounting platform providers."""
    
    provider: IntegrationProvider
    
    async def create_client(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a client in the accounting platform."""
        ...
    
    async def create_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create an invoice in the accounting platform."""
        ...
    
    async def add_invoice_item(self, invoice_id: str, item_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add an item to an existing invoice."""
        ...
    
    async def raise_expense(self, expense_data: Dict[str, Any]) -> Dict[str, Any]:
        """Raise an expense in the accounting platform."""
        ...


class ZapierHnryProvider:
    """Hnry integration via Zapier webhooks."""
    
    provider = IntegrationProvider.HNTRY
    
    def __init__(self, webhook_url: str, secret_token: Optional[str] = None):
        self.webhook_url = webhook_url
        self.secret_token = secret_token
    
    def _build_payload(self, event: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Build a webhook payload with metadata."""
        return {
            "event": event,
            "version": "1.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "Sunset Country Repairs",
            "payload": payload
        }
    
    def _get_headers(self) -> Dict[str, str]:
        """Get webhook headers including optional secret token."""
        headers = {"Content-Type": "application/json"}
        if self.secret_token:
            headers["X-Secret-Token"] = self.secret_token
        return headers
    
    async def _send_webhook(self, action: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Send a webhook to Zapier with retry logic."""
        payload = self._build_payload(action, data)
        headers = self._get_headers()
        
        # Exponential backoff retry
        max_retries = 3
        base_delay = 1  # seconds
        timeout_seconds = 30
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                    response = await client.post(
                        self.webhook_url,
                        json=payload,
                        headers=headers
                    )
                    return {
                        "status": response.status_code,
                        "body": response.text[:1000] if response.text else None,  # Limit log size
                        "success": response.status_code < 400
                    }
            except httpx.TimeoutException:
                if attempt == max_retries - 1:
                    raise
                delay = base_delay * (2 ** attempt)
                await self._sleep(delay)
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                delay = base_delay * (2 ** attempt)
                await self._sleep(delay)
        
        raise Exception("Max retries exceeded")
    
    async def _sleep(self, seconds: float) -> None:
        """Async sleep helper."""
        import asyncio
        await asyncio.sleep(seconds)
    
    async def create_client(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._send_webhook("create_client", customer_data)
    
    async def create_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._send_webhook("create_invoice", invoice_data)
    
    async def add_invoice_item(self, invoice_id: str, item_data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._send_webhook("add_invoice_item", {"invoice_id": invoice_id, "item": item_data})
    
    async def raise_expense(self, expense_data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._send_webhook("raise_expense", expense_data)


async def log_sync(
    db: AsyncSession,
    provider: IntegrationProvider,
    entity_type: str,
    entity_id: uuid.UUID,
    action: str,
    webhook_url: str,
    payload: Dict[str, Any],
    idempotency_key: Optional[str] = None
) -> SyncLog:
    """Create a sync log entry."""
    sync_log = SyncLog(
        id=uuid.uuid4(),
        provider=provider,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        webhook_url=webhook_url,  # Note: encrypt in production
        payload=payload,
        status=SyncStatus.QUEUED,
        idempotency_key=idempotency_key,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None)
    )
    db.add(sync_log)
    await db.flush()
    return sync_log


async def update_sync_log(
    db: AsyncSession,
    sync_log_id: uuid.UUID,
    status: SyncStatus,
    response_status: Optional[int] = None,
    response_body: Optional[str] = None,
    duration_ms: Optional[int] = None,
    error_message: Optional[str] = None,
    retry_count: Optional[int] = None
) -> None:
    """Update a sync log entry."""
    result = await db.execute(select(SyncLog).where(SyncLog.id == sync_log_id))
    sync_log = result.scalar_one_or_none()
    if sync_log:
        sync_log.status = status
        sync_log.response_status = response_status
        sync_log.response_body = response_body
        sync_log.duration_ms = duration_ms
        sync_log.error_message = error_message
        if retry_count is not None:
            sync_log.retry_count = retry_count
        if status in (SyncStatus.SYNCED, SyncStatus.FAILED):
            sync_log.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.flush()


async def get_integration_settings(
    db: AsyncSession,
    provider: IntegrationProvider
) -> Optional[IntegrationSetting]:
    """Get integration settings for a provider."""
    result = await db.execute(select(IntegrationSetting).where(IntegrationSetting.provider == provider))
    return result.scalar_one_or_none()


async def update_customer_integration(
    db: AsyncSession,
    provider: IntegrationProvider,
    customer_id: uuid.UUID,
    sync_status: SyncStatus,
    external_id: Optional[str] = None,
    error_message: Optional[str] = None
) -> None:
    """Update or create customer integration sync record."""
    result = await db.execute(
        select(CustomerIntegration)
        .where(CustomerIntegration.provider == provider)
        .where(CustomerIntegration.customer_id == customer_id)
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        integration = CustomerIntegration(
            id=uuid.uuid4(),
            provider=provider,
            customer_id=customer_id,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        db.add(integration)
    
    integration.sync_status = sync_status
    integration.external_id = external_id
    integration.error_message = error_message
    integration.last_sync_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()


async def execute_sync(
    db: AsyncSession,
    provider: IntegrationProvider,
    entity_type: str,
    entity_id: uuid.UUID,
    action: str,
    payload: Dict[str, Any],
    idempotency_key: Optional[str] = None
) -> bool:
    """
    Execute a sync operation with retry logic.
    Returns True if successful, False otherwise.
    """
    settings = await get_integration_settings(db, provider)
    if not settings or not settings.is_enabled or not settings.webhook_url:
        return False
    
    sync_log = await log_sync(db, provider, entity_type, entity_id, action, settings.webhook_url, payload, idempotency_key)
    
    try:
        start_time = time.time()
        provider_instance = ZapierHnryProvider(settings.webhook_url, settings.secret_token)
        
        method = getattr(provider_instance, action, None)
        if not method:
            raise ValueError(f"Unknown action: {action}")
        
        result = await method(payload)
        duration_ms = int((time.time() - start_time) * 1000)
        
        if result["success"]:
            await update_sync_log(
                db, sync_log.id, SyncStatus.SYNCED,
                response_status=result["status"],
                response_body=result["body"],
                duration_ms=duration_ms
            )
            return True
        else:
            await update_sync_log(
                db, sync_log.id, SyncStatus.FAILED,
                response_status=result["status"],
                response_body=result["body"],
                duration_ms=duration_ms,
                error_message=f"HTTP {result['status']}"
            )
            return False
    except Exception as e:
        await update_sync_log(db, sync_log.id, SyncStatus.FAILED, error_message=str(e))
        return False