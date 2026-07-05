from uuid import UUID

import os
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_admin, require_staff
from config import settings
from models.user import User, UserRole
from models.system_setting import SystemSetting
from models.audit_log import AuditLog
from schemas.audit_log import AuditLogResponse
from services.audit_service import list_audit_logs

router = APIRouter()


__USER_EXCLUDED_FIELDS = {"hashed_password"}


def _user_to_dict(user: User) -> dict:
    data = {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role.value,
        "is_active": user.is_active,
        "email_verified": user.email_verified,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "last_login": user.last_login,
        "sso_provider": getattr(user, 'sso_provider', None),
    }
    return data


# ---------------------------------------------------------------------------
# System settings (defined BEFORE {user_id} to avoid route shadowing)
# ---------------------------------------------------------------------------


@router.get("/settings", response_model=dict)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(SystemSetting).order_by(SystemSetting.key))
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


@router.put("/settings")
async def update_setting(
    key: str = Query(...),
    value: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = result.scalar_one_or_none()
    if setting is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{key}' not found",
        )
    setting.value = value
    await db.flush()
    await db.refresh(setting)
    return {
        "id": str(setting.id),
        "key": setting.key,
        "value": setting.value,
        "description": setting.description,
        "updated_at": setting.updated_at,
    }


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


@router.get("/users", response_model=dict)
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    count_result = await db.execute(select(func.count(User.id)))
    total = count_result.scalar()

    result = await db.execute(
        select(User)
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    users = list(result.scalars().all())

    return {
        "data": [_user_to_dict(u) for u in users],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    email: str = Query(...),
    full_name: str = Query(...),
    password: str = Query(...),
    phone: str | None = Query(None),
    role: str = Query("customer"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    from passlib.hash import bcrypt

    hashed = bcrypt.hash(password)
    user = User(
        email=email,
        hashed_password=hashed,
        full_name=full_name,
        phone=phone,
        role=UserRole(role),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return _user_to_dict(user)


@router.put("/{user_id}")
async def update_user(
    user_id: UUID,
    email: str | None = Query(None),
    full_name: str | None = Query(None),
    phone: str | None = Query(None),
    role: str | None = Query(None),
    is_active: bool | None = Query(None),
    password: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if email is not None:
        user.email = email
    if full_name is not None:
        user.full_name = full_name
    if phone is not None:
        user.phone = phone
    if role is not None:
        user.role = UserRole(role)
    if is_active is not None:
        user.is_active = is_active
    if password is not None:
        from passlib.hash import bcrypt
        user.hashed_password = bcrypt.hash(password)

    await db.flush()
    await db.refresh(user)
    return _user_to_dict(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    await db.delete(user)
    await db.flush()


# ---------------------------------------------------------------------------
# Audit logs
# ---------------------------------------------------------------------------


@router.get("/audit-logs", response_model=dict)
async def get_audit_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    entity_type: str | None = Query(None),
    entity_id: str | None = Query(None),
    user_id: UUID | None = Query(None),
):
    logs, total = await list_audit_logs(
        db,
        skip=skip,
        limit=limit,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
    )
    return {
        "data": [AuditLogResponse.model_validate(log) for log in logs],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


# ---------------------------------------------------------------------------
# Branding uploads (logo / favicon)
# ---------------------------------------------------------------------------

ALLOWED_BRAND_TYPES = {"image/png", "image/jpeg", "image/svg+xml", "image/x-icon", "image/webp"}
ALLOWED_BRAND_EXT = {".png", ".jpg", ".jpeg", ".svg", ".ico", ".webp"}


@router.post("/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from pathlib import Path
    from services.storage_service import _generate_unique_filename, _get_date_subfolder

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_BRAND_EXT:
        raise HTTPException(status_code=400, detail=f"Invalid file type: {ext}. Allowed: {ALLOWED_BRAND_EXT}")
    if file.content_type and file.content_type not in ALLOWED_BRAND_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid content type: {file.content_type}")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    unique_name = _generate_unique_filename(file.filename or "logo.png")
    date_folder = _get_date_subfolder()
    rel_dir = os.path.join("branding", date_folder)
    abs_dir = os.path.join(settings.STORAGE_LOCAL_PATH, rel_dir)
    Path(abs_dir).mkdir(parents=True, exist_ok=True)

    abs_path = os.path.join(abs_dir, unique_name)
    rel_path = os.path.join(rel_dir, unique_name)

    import aiofiles
    async with aiofiles.open(abs_path, "wb") as f:
        await f.write(content)

    # Update logo_url setting
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == "logo_url"))
    setting = result.scalar_one_or_none()
    if setting is None:
        setting = SystemSetting(id=uuid.uuid4(), key="logo_url", value="", description="Business logo URL")
        db.add(setting)
    setting.value = f"/uploads/{rel_path}"
    await db.flush()

    return {"url": setting.value, "filename": unique_name}


@router.post("/upload-admin-logo")
async def upload_admin_logo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from pathlib import Path
    from services.storage_service import _generate_unique_filename, _get_date_subfolder

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_BRAND_EXT:
        raise HTTPException(status_code=400, detail=f"Invalid file type: {ext}. Allowed: {ALLOWED_BRAND_EXT}")
    if file.content_type and file.content_type not in ALLOWED_BRAND_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid content type: {file.content_type}")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    unique_name = _generate_unique_filename(file.filename or "admin-logo.png")
    date_folder = _get_date_subfolder()
    rel_dir = os.path.join("branding", date_folder)
    abs_dir = os.path.join(settings.STORAGE_LOCAL_PATH, rel_dir)
    Path(abs_dir).mkdir(parents=True, exist_ok=True)

    abs_path = os.path.join(abs_dir, unique_name)
    rel_path = os.path.join(rel_dir, unique_name)

    import aiofiles
    async with aiofiles.open(abs_path, "wb") as f:
        await f.write(content)

    result = await db.execute(select(SystemSetting).where(SystemSetting.key == "admin_logo_url"))
    setting = result.scalar_one_or_none()
    if setting is None:
        setting = SystemSetting(id=uuid.uuid4(), key="admin_logo_url", value="", description="Admin panel logo URL")
        db.add(setting)
    setting.value = f"/uploads/{rel_path}"
    await db.flush()

    return {"url": setting.value, "filename": unique_name}


@router.post("/upload-favicon")
async def upload_favicon(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from pathlib import Path
    from services.storage_service import _generate_unique_filename, _get_date_subfolder

    ext = Path(file.filename or "").suffix.lower()
    if ext not in {".png", ".ico", ".svg", ".jpg", ".jpeg"}:
        raise HTTPException(status_code=400, detail=f"Invalid file type: {ext}. Allowed: .png, .ico, .svg, .jpg")
    if file.content_type and file.content_type not in ALLOWED_BRAND_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid content type: {file.content_type}")

    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 2MB.")

    unique_name = _generate_unique_filename(file.filename or "favicon.ico")
    date_folder = _get_date_subfolder()
    rel_dir = os.path.join("branding", date_folder)
    abs_dir = os.path.join(settings.STORAGE_LOCAL_PATH, rel_dir)
    Path(abs_dir).mkdir(parents=True, exist_ok=True)

    abs_path = os.path.join(abs_dir, unique_name)
    rel_path = os.path.join(rel_dir, unique_name)

    import aiofiles
    async with aiofiles.open(abs_path, "wb") as f:
        await f.write(content)

    result = await db.execute(select(SystemSetting).where(SystemSetting.key == "favicon_url"))
    setting = result.scalar_one_or_none()
    if setting is None:
        setting = SystemSetting(id=uuid.uuid4(), key="favicon_url", value="", description="Site favicon URL")
        db.add(setting)
    setting.value = f"/uploads/{rel_path}"
    await db.flush()

    return {"url": setting.value, "filename": unique_name}


@router.post("/upload-email-signature")
async def upload_email_signature(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from pathlib import Path
    from services.storage_service import _generate_unique_filename, _get_date_subfolder

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_BRAND_EXT:
        raise HTTPException(status_code=400, detail=f"Invalid file type: {ext}. Allowed: {ALLOWED_BRAND_EXT}")
    if file.content_type and file.content_type not in ALLOWED_BRAND_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid content type: {file.content_type}")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    unique_name = _generate_unique_filename(file.filename or "email-signature.png")
    date_folder = _get_date_subfolder()
    rel_dir = os.path.join("branding", date_folder)
    abs_dir = os.path.join(settings.STORAGE_LOCAL_PATH, rel_dir)
    Path(abs_dir).mkdir(parents=True, exist_ok=True)

    abs_path = os.path.join(abs_dir, unique_name)
    rel_path = os.path.join(rel_dir, unique_name)

    import aiofiles
    async with aiofiles.open(abs_path, "wb") as f:
        await f.write(content)

    result = await db.execute(select(SystemSetting).where(SystemSetting.key == "email_signature"))
    setting = result.scalar_one_or_none()
    if setting is None:
        setting = SystemSetting(id=uuid.uuid4(), key="email_signature", value="", description="Email signature image URL")
        db.add(setting)
    setting.value = f"/uploads/{rel_path}"
    await db.flush()

    return {"url": setting.value, "filename": unique_name}


