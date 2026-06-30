import pytest


@pytest.mark.asyncio
async def test_register_success(client):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "newuser@test.com",
        "password": "securepass123",
        "full_name": "New User",
        "phone": "0400000000"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client, admin_user):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "admin@test.com",
        "password": "securepass123",
        "full_name": "Duplicate User",
        "phone": "0400000000"
    })
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_invalid_email(client):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "not-an-email",
        "password": "securepass123",
        "full_name": "Bad Email",
        "phone": "0400000000"
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client, admin_user):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "admin123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client, admin_user):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "wrongpassword"
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "nobody@test.com",
        "password": "password123"
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client, admin_user):
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "admin123"
    })
    refresh_token = login_resp.json()["refresh_token"]
    resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_refresh_invalid_token(client):
    resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": "invalid-token"
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client, admin_token):
    resp = await client.get("/api/v1/auth/me", headers={
        "Authorization": f"Bearer {admin_token}"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "admin@test.com"
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_get_me_no_token(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_invalid_token(client):
    resp = await client.get("/api/v1/auth/me", headers={
        "Authorization": "Bearer invalid-token"
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_logout(client, admin_token):
    resp = await client.post("/api/v1/auth/logout", headers={
        "Authorization": f"Bearer {admin_token}"
    })
    assert resp.status_code == 200
