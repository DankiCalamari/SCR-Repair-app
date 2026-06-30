import pytest


@pytest_asyncio.fixture
async def test_quote(client, staff_token, test_repair):
    resp = await client.post("/api/v1/quotes", json={
        "repair_id": str(test_repair.id),
        "labour_cost": 80.00,
        "parts_cost": 45.00,
        "description": "Screen replacement"
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.asyncio
async def test_create_quote(client, staff_token, test_repair):
    resp = await client.post("/api/v1/quotes", json={
        "repair_id": str(test_repair.id),
        "labour_cost": 100.00,
        "parts_cost": 50.00,
        "description": "Battery replacement"
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["quote_number"].startswith("QUO-")
    assert float(data["total_amount"]) > 0
    assert float(data["gst_amount"]) > 0


@pytest.mark.asyncio
async def test_create_quote_unauthorized(client, customer_token, test_repair):
    resp = await client.post("/api/v1/quotes", json={
        "repair_id": str(test_repair.id),
        "labour_cost": 50.00,
        "parts_cost": 20.00,
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_quotes(client, staff_token, test_quote):
    resp = await client.get("/api/v1/quotes", headers={
        "Authorization": f"Bearer {staff_token}"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data


@pytest.mark.asyncio
async def test_get_quote(client, staff_token, test_quote):
    resp = await client.get(f"/api/v1/quotes/{test_quote['id']}", headers={
        "Authorization": f"Bearer {staff_token}"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == test_quote["id"]


@pytest.mark.asyncio
async def test_update_quote(client, staff_token, test_quote):
    resp = await client.put(f"/api/v1/quotes/{test_quote['id']}", json={
        "labour_cost": 120.00,
        "parts_cost": 60.00,
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert float(data["labour_cost"]) == 120.00


@pytest.mark.asyncio
async def test_approve_quote(client, staff_token, test_quote):
    resp = await client.post(f"/api/v1/quotes/{test_quote['id']}/approve", json={
        "digital_signature": "John Smith"
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "approved"


@pytest.mark.asyncio
async def test_decline_quote(client, staff_token, test_repair):
    quote_resp = await client.post("/api/v1/quotes", json={
        "repair_id": str(test_repair.id),
        "labour_cost": 50.00,
        "parts_cost": 20.00,
    }, headers={"Authorization": f"Bearer {staff_token}"})
    quote_id = quote_resp.json()["id"]
    resp = await client.post(f"/api/v1/quotes/{quote_id}/decline", json={
        "notes": "Too expensive"
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "declined"


@pytest.mark.asyncio
async def test_send_quote(client, staff_token, test_quote):
    resp = await client.post(f"/api/v1/quotes/{test_quote['id']}/send", headers={
        "Authorization": f"Bearer {staff_token}"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "sent"
