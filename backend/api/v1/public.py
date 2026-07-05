"""Public endpoints that do not require authentication."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db
from config import settings
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


def _get_env_fallbacks():
    """Get settings from environment variables as fallback."""
    return {
        "authentik_url": settings.AUTHENTIK_URL,
        "authentik_client_id": settings.AUTHENTIK_CLIENT_ID,
        "authentik_redirect_uri": f"{settings.APP_URL.rstrip('/')}/api/v1/auth/sso/callback",
        "business_name": settings.BUSINESS_NAME,
        "business_email": settings.BUSINESS_EMAIL,
        "business_phone": settings.BUSINESS_PHONE,
        "business_address": settings.BUSINESS_ADDRESS,
        "abn": settings.BUSINESS_ABN,
        "primary_color": settings.PRIMARY_COLOR,
        "accent_color": settings.ACCENT_COLOR,
        "logo_url": settings.LOGO_URL,
        "admin_logo_url": settings.ADMIN_LOGO_URL,
        "favicon_url": settings.FAVICON_URL,
    }


@router.get("/public/settings", response_model=dict)
async def get_public_settings(db=Depends(get_db)):
    """Return public-facing settings (no auth required). Falls back to .env values."""
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key.in_(_PUBLIC_SETTING_KEYS))
    )
    settings_list = list(result.scalars().all())
    db_settings = {s.key: s.value for s in settings_list}
    env_fallbacks = _get_env_fallbacks()
    
    # Merge: use database values if present, otherwise use .env fallbacks
    merged_settings = {}
    for key in _PUBLIC_SETTING_KEYS:
        if key in db_settings and db_settings[key]:
            merged_settings[key] = db_settings[key]
        elif key in env_fallbacks and env_fallbacks[key]:
            merged_settings[key] = env_fallbacks[key]
    
    return {
        "data": [
            {
                "id": str(hash(key)),  # Generate ID for env fallback items
                "key": key,
                "value": merged_settings.get(key),
                "description": None,
                "updated_at": None,
            }
            for key in merged_settings if merged_settings[key] is not None
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
    request: dict,
    db: AsyncSession = Depends(get_db),
):
    """Create the first admin user. Can only be called when no admin exists."""
    from services.auth_service import hash_password
    
    full_name = request.get("full_name", "")
    email = request.get("email", "")
    password = request.get("password", "")
    phone = request.get("phone")
    
    # Validate required fields
    if not full_name or not email or not password:
        raise HTTPException(
            status_code=422,
            detail="full_name, email, and password are required"
        )
    
    # Check if admin already exists
    result = await db.execute(select(User).where(User.role == UserRole.ADMIN).limit(1))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=403,
            detail="Setup already completed. Admin user already exists."
        )
    
    # Check if email is already registered
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="A user with this email already exists"
        )
    
    # Create admin user
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
