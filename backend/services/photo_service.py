import logging
from uuid import UUID

from fastapi import HTTPException, status, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.photo import Photo, PhotoCategory
from schemas.photo import PhotoUpdate
from services.storage_service import delete_photo_files, save_photo as save_photo_to_storage

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def _validate_photo_file(file: UploadFile, content: bytes) -> None:
    """Validate file type and size."""
    # Check content type
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type: {file.content_type}. Allowed: JPG, PNG, WEBP",
        )

    # Check extension as fallback
    from pathlib import Path
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension: {ext}. Allowed: .jpg, .jpeg, .png, .webp",
        )

    # Check file size
    if len(content) > settings.PHOTO_MAX_FILE_SIZE:
        max_mb = settings.PHOTO_MAX_FILE_SIZE / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large ({len(content)} bytes). Max: {max_mb:.0f}MB",
        )


async def save_photo(
    file: UploadFile,
    repair_id: UUID | None,
    device_id: UUID | None,
    customer_id: UUID | None,
    category: str,
    uploaded_by: UUID | None,
    db: AsyncSession,
    notes: str | None = None,
    tags: str | None = None,
) -> Photo:
    # Validate category
    try:
        photo_category = PhotoCategory(category)
    except ValueError:
        valid = [c.value for c in PhotoCategory]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category '{category}'. Valid: {valid}",
        )

    # Read and validate file
    content = await file.read()
    _validate_photo_file(file, content)

    # Wrap bytes for storage service
    class _FileWrapper:
        def __init__(self, data: bytes):
            self._data = data
        def read(self) -> bytes:
            return self._data

    file_wrapper = _FileWrapper(content)

    # Save to storage (generates thumb + medium)
    original_filename = file.filename or "unnamed"
    try:
        file_path, thumb_path, med_path, width, height = await save_photo_to_storage(
            file=file_wrapper,
            filename=original_filename,
            category=category,
        )
    except Exception as exc:
        logger.exception("Failed to save photo to storage")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save photo: {exc}",
        )

    photo = Photo(
        repair_id=repair_id,
        device_id=device_id,
        customer_id=customer_id,
        uploaded_by=uploaded_by,
        category=photo_category,
        filename=file_path.split("/")[-1],
        original_filename=original_filename,
        file_path=file_path,
        thumbnail_path=thumb_path,
        medium_path=med_path,
        file_size=len(content),
        mime_type=file.content_type or "image/jpeg",
        width=width,
        height=height,
        notes=notes,
        tags=tags,
    )
    db.add(photo)
    await db.flush()
    await db.refresh(photo)
    return photo


async def get_photo_or_404(db: AsyncSession, photo_id: UUID) -> Photo:
    result = await db.execute(select(Photo).where(Photo.id == photo_id))
    photo = result.scalar_one_or_none()
    if photo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found",
        )
    return photo


async def list_photos(
    db: AsyncSession,
    repair_id: UUID | None = None,
    device_id: UUID | None = None,
    customer_id: UUID | None = None,
    category: str | None = None,
) -> list[Photo]:
    query = select(Photo)

    if repair_id is not None:
        query = query.where(Photo.repair_id == repair_id)
    if device_id is not None:
        query = query.where(Photo.device_id == device_id)
    if customer_id is not None:
        query = query.where(Photo.customer_id == customer_id)
    if category is not None:
        query = query.where(Photo.category == category)

    query = query.order_by(Photo.sort_order.asc(), Photo.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_photo(
    photo_id: UUID,
    data: PhotoUpdate,
    db: AsyncSession,
) -> Photo:
    photo = await get_photo_or_404(db, photo_id)

    if data.category is not None:
        try:
            photo.category = PhotoCategory(data.category)
        except ValueError:
            valid = [c.value for c in PhotoCategory]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category '{data.category}'. Valid: {valid}",
            )

    if data.notes is not None:
        photo.notes = data.notes
    if data.tags is not None:
        photo.tags = data.tags
    if data.is_important is not None:
        photo.is_important = data.is_important
    if data.sort_order is not None:
        photo.sort_order = data.sort_order

    await db.flush()
    await db.refresh(photo)
    return photo


async def delete_photo(photo_id: UUID, db: AsyncSession) -> None:
    photo = await get_photo_or_404(db, photo_id)
    await delete_photo_files(
        photo.file_path,
        photo.thumbnail_path,
        photo.medium_path,
    )
    await db.delete(photo)
    await db.flush()


async def get_photo_data(photo_id: UUID, db: AsyncSession) -> tuple[bytes, str, str]:
    """Returns (file_data, mime_type, original_filename) for a photo."""
    from services.storage_service import get_file

    photo = await get_photo_or_404(db, photo_id)
    data = await get_file(photo.file_path)
    return data, photo.mime_type, photo.original_filename


async def get_category_counts(
    db: AsyncSession,
    repair_id: UUID | None = None,
    device_id: UUID | None = None,
    customer_id: UUID | None = None,
) -> list[dict]:
    """Return count of photos per category, optionally filtered."""
    query = select(Photo.category, func.count(Photo.id)).group_by(Photo.category)

    if repair_id is not None:
        query = query.where(Photo.repair_id == repair_id)
    if device_id is not None:
        query = query.where(Photo.device_id == device_id)
    if customer_id is not None:
        query = query.where(Photo.customer_id == customer_id)

    result = await db.execute(query)
    rows = result.all()
    return [{"category": str(row[0]), "count": row[1]} for row in rows]
