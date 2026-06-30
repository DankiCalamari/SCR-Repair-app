"""Public endpoints that do not require authentication."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db
from models.system_setting import SystemSetting

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
