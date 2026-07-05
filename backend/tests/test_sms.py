import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from services.sms_service import SmsGateClient, get_gateway_status, test_sms_gateway

@pytest.mark.asyncio
async def test_sms_gateway_client_initialization():
    client = SmsGateClient()
    assert client.url == "https://api.sms-gate.app"
    # Basic auth should be set
    assert "Authorization" in {"Authorization": client.auth_header}

@pytest.mark.asyncio
async def test_get_gateway_status_no_device(db: AsyncSession, monkeypatch):
    # Mock get_devices to return empty list
    async def mock_get_devices():
        return []
    
    monkeypatch.setattr("services.sms_service.SmsGateClient.get_devices", mock_get_devices)
    
    status = await get_gateway_status(db)
    assert status["connected"] is False
    assert "device" in status["message"].lower()
