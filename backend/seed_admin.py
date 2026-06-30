"""Seed an admin user into the database."""
import asyncio
from sqlalchemy import select

from database import async_session_factory
from models.user import User, UserRole
from services.auth_service import hash_password


async def seed_admin():
    db = async_session_factory()
    try:
        result = await db.execute(
            select(User).where(User.email == "admin@sunsetrepairs.com")
        )
        if result.scalar_one_or_none() is not None:
            print("Admin user already exists.")
            return

        user = User(
            email="admin@sunsetrepairs.com",
            hashed_password=hash_password("admin123"),
            full_name="Admin",
            phone="",
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True,
        )
        db.add(user)
        await db.commit()
        print("Admin user created: admin@sunsetrepairs.com / admin123")
    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(seed_admin())
