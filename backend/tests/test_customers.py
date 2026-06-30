import pytest


@pytest.mark.asyncio
async def test_create_customer(client, staff_token):
    resp = await client.post("/api/v1/customers", json={
        "name": "Jane Doe",
        "phone": "0400987654",
        "email": "jane@example.com",
        "address": "456 Oak St, Mildura VIC 3500"
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Jane Doe"
    assert data["phone"] == "0400987654"


@pytest.mark.asyncio
async def test_create_customer_unauthorized(client, customer_token):
    resp = await client.post("/api/v1/customers", json={
        "name": "Should Fail",
        "phone": "0400000000",
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_customers(client, staff_token, test_customer):
    resp = await client.get("/api/v1/customers", headers={
        "Authorization": f"Bearer {staff_token}"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data


@pytest.mark.asyncio
async def test_list_customers_unauthorized(client, customer_token):
    resp = await client.get("/api/v1/customers", headers={
        "Authorization": f"Bearer {customer_token}"
    })
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_customer(client, staff_token, test_customer):
    resp = await client.get(f"/api/v1/customers/{test_customer.id}", headers={
        "Authorization": f"Bearer {staff_token}"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "John Smith"


@pytest.mark.asyncio
async def test_get_customer_not_found(client, staff_token):
    import uuid
    resp = await client.get(f"/api/v1/customers/{uuid.uuid4()}", headers={
        "Authorization": f"Bearer {staff_token}"
    })
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_customer(client, staff_token, test_customer):
    resp = await client.put(f"/api/v1/customers/{test_customer.id}", json={
        "name": "John Updated",
        "phone": "0400111222",
        "email": "john.updated@example.com",
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "John Updated"


@pytest.mark.asyncio
async def test_delete_customer(client, admin_token, db):
    from models.customer import Customer
    customer = Customer(id=__import__('uuid').uuid4(), name="Delete Me", phone="0400000000")
    db.add(customer)
    await db.flush()
    resp = await client.delete(f"/api/v1/customers/{customer.id}", headers={
        "Authorization": f"Bearer {admin_token}"
    })
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_customer_as_staff(client, staff_token, db):
    from models.customer import Customer
    customer = Customer(id=__import__('uuid').uuid4(), name="Keep Me", phone="0400000000")
    db.add(customer)
    await db.flush()
    resp = await client.delete(f"/api/v1/customers/{customer.id}", headers={
        "Authorization": f"Bearer {staff_token}"
    })
    assert resp.status_code == 403
