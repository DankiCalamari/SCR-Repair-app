import pytest


@pytest.mark.asyncio
async def test_create_repair(client, staff_token, test_customer, test_device):
    resp = await client.post("/api/v1/repairs", json={
        "customer_id": str(test_customer.id),
        "device_id": str(test_device.id),
        "issue_description": "Battery draining rapidly"
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["ticket_number"].startswith("SCR-")
    assert data["status"] == "lead"


@pytest.mark.asyncio
async def test_create_repair_unauthorized(client, customer_token):
    resp = await client.post("/api/v1/repairs", json={
        "customer_id": "fake-id",
        "device_id": "fake-id",
        "issue_description": "Test"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_repairs(client, staff_token, test_repair):
    resp = await client.get("/api/v1/repairs", headers={
        "Authorization": f"Bearer {staff_token}"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data


@pytest.mark.asyncio
async def test_list_repairs_filter_status(client, staff_token, test_repair):
    resp = await client.get("/api/v1/repairs?status=diagnosing", headers={
        "Authorization": f"Bearer {staff_token}"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data


@pytest.mark.asyncio
async def test_get_repair_detail(client, staff_token, test_repair):
    resp = await client.get(f"/api/v1/repairs/{test_repair.id}", headers={
        "Authorization": f"Bearer {staff_token}"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["ticket_number"] == "SCR-00001"


@pytest.mark.asyncio
async def test_get_repair_not_found(client, staff_token):
    import uuid
    resp = await client.get(f"/api/v1/repairs/{uuid.uuid4()}", headers={
        "Authorization": f"Bearer {staff_token}"
    })
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_repair(client, staff_token, test_repair):
    resp = await client.put(f"/api/v1/repairs/{test_repair.id}", json={
        "issue_description": "Updated issue description"
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["issue_description"] == "Updated issue description"


@pytest.mark.asyncio
async def test_update_repair_status(client, staff_token, test_repair):
    resp = await client.patch(f"/api/v1/repairs/{test_repair.id}/status", json={
        "status": "waiting_for_customer",
        "notes": "Waiting for customer approval"
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "waiting_for_customer"


@pytest.mark.asyncio
async def test_delete_repair(client, admin_token, db, test_customer, test_device):
    from models.repair import Repair
    repair = Repair(
        id=__import__('uuid').uuid4(),
        ticket_number="SCR-DELETE",
        customer_id=test_customer.id,
        device_id=test_device.id,
        issue_description="To be deleted"
    )
    db.add(repair)
    await db.flush()
    resp = await client.delete(f"/api/v1/repairs/{repair.id}", headers={
        "Authorization": f"Bearer {admin_token}"
    })
    assert resp.status_code == 204
