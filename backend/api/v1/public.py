"""Public endpoints that do not require authentication."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db
from models.system_setting import SystemSetting
from models.user import User, UserRole

router = APIRouter()

# Keys that are safe to expose publicly
_PUBLIC_SETTING_KEYS = {
    "business_name",
    "business_email",
    "business_phone",
    "business_address",
    "abn",
    "primary_color",
    "accent_color",
    "logo_url",
    "admin_logo_url",
    "favicon_url",
    "authentik_url",
    "authentik_client_id",
    "authentik_redirect_uri",
}


@router.get("/public/settings", response_model=dict)
async def get_public_settings(db=Depends(get_db)):
    """Return public-facing settings (no auth required)."""
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key.in_(_PUBLIC_SETTING_KEYS))
    )
    settings_list = list(result.scalars().all())
    return {
        "data": [
            {
                "id": str(s.id),
                "key": s.key,
                "value": s.value,
                "description": s.description,
                "updated_at": s.updated_at,
            }
            for s in settings_list
        ]
    }


@router.get("/public/setup-status", response_model=dict)
async def get_setup_status(db=Depends(get_db)):
    """Check if initial setup is required (no admin users exist)."""
    result = await db.execute(select(User).where(User.role == UserRole.ADMIN).limit(1))
    admin_exists = result.scalar_one_or_none() is not None
    return {"needs_setup": not admin_exists, "admin_exists": admin_exists}


@router.post("/public/setup", status_code=201)
async def initial_setup(
    full_name: str,
    email: str,
    password: str,
    phone: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Create the first admin user. Can only be called when no admin exists."""
    # Check if admin already exists
    result = await db.execute(select(User).where(User.role == UserRole.ADMIN).limit(1))
    if result.scalar_one_or_none() is not None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail="Setup already completed. Admin user already exists."
        )
    
    # Check if email is already registered
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none() is not None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=409,
            detail="A user with this email already exists"
        )
    
    # Create admin user
    from schemas.user import UserCreate
    from services.auth_service import hash_password
    
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        phone=phone,
        role=UserRole.ADMIN,
        is_active=True,
        email_verified=True,
    )
    db.add(user)
    await db.flush()
    
    return {"message": "Admin user created successfully", "email": email}
