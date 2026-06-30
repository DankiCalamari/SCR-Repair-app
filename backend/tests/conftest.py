import asyncio
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from database import Base
from main import app
from config import settings
from models.user import User, UserRole
from services.auth_service import hash_password
from api.deps import get_db

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with test_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db():
    async with test_session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def admin_user(db):
    user = User(
        id=uuid.uuid4(),
        email="admin@test.com",
        hashed_password=hash_password("admin123"),
        full_name="Admin User",
        phone="0400000001",
        role=UserRole.ADMIN,
        is_active=True,
        email_verified=True,
    )
    db.add(user)
    await db.flush()
    return user


@pytest_asyncio.fixture
async def staff_user(db):
    user = User(
        id=uuid.uuid4(),
        email="staff@test.com",
        hashed_password=hash_password("staff123"),
        full_name="Staff User",
        phone="0400000002",
        role=UserRole.STAFF,
        is_active=True,
        email_verified=True,
    )
    db.add(user)
    await db.flush()
    return user


@pytest_asyncio.fixture
async def customer_user(db):
    user = User(
        id=uuid.uuid4(),
        email="customer@test.com",
        hashed_password=hash_password("customer123"),
        full_name="Test Customer",
        phone="0400000003",
        role=UserRole.CUSTOMER,
        is_active=True,
        email_verified=True,
    )
    db.add(user)
    await db.flush()
    return user


@pytest_asyncio.fixture
async def admin_token(client, admin_user):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "admin123"
    })
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def staff_token(client, staff_user):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "staff@test.com",
        "password": "staff123"
    })
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def customer_token(client, customer_user):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "customer@test.com",
        "password": "customer123"
    })
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def test_customer(db):
    from models.customer import Customer
    customer = Customer(
        id=uuid.uuid4(),
        name="John Smith",
        phone="0400123456",
        email="john@example.com",
        address="123 Main St, Mildura VIC 3500",
    )
    db.add(customer)
    await db.flush()
    return customer


@pytest_asyncio.fixture
async def test_device(db, test_customer):
    from models.device import Device
    device = Device(
        id=uuid.uuid4(),
        customer_id=test_customer.id,
        device_type="Smartphone",
        brand="Apple",
        model="iPhone 14 Pro",
        imei="123456789012345",
        serial_number="ABC123XYZ",
        colour="Space Black",
        passcode="1234",
        accessories="Charging cable, case",
        existing_damage="Minor scratch on back",
    )
    db.add(device)
    await db.flush()
    return device


@pytest_asyncio.fixture
async def test_repair(db, test_customer, test_device):
    from models.repair import Repair, RepairStatus
    repair = Repair(
        id=uuid.uuid4(),
        ticket_number="SCR-00001",
        customer_id=test_customer.id,
        device_id=test_device.id,
        status=RepairStatus.DIAGNOSING,
        issue_description="Screen not responding to touch",
    )
    db.add(repair)
    await db.flush()
    return repair
