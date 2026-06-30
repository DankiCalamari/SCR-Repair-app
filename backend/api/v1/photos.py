from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_staff, get_current_active_user
from models.user import User
from schemas.photo import (
    PhotoResponse,
    PhotoUploadResponse,
    PhotoUpdate,
    PhotoCategoryCount,
)
from services.photo_service import (
    delete_photo,
    get_photo_data,
    get_photo_or_404,
    list_photos,
    save_photo,
    update_photo,
    get_category_counts,
)

PHOTO_CATEGORIES = [
    "intake", "damage", "diagnostic", "repair_progress",
    "parts_replacement", "completed", "warranty", "general",
]

router = APIRouter()


@router.post("/upload", response_model=PhotoUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    file: UploadFile = File(...),
    repair_id: UUID | None = Form(None),
    device_id: UUID | None = Form(None),
    customer_id: UUID | None = Form(None),
    category: str = Form("general"),
    notes: str | None = Form(None),
    tags: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    photo = await save_photo(
        file=file,
        repair_id=repair_id,
        device_id=device_id,
        customer_id=customer_id,
        category=category,
        uploaded_by=current_user.id,
        db=db,
        notes=notes,
        tags=tags,
    )
    return photo


@router.get("/{photo_id}", response_model=PhotoResponse)
async def get_photo(
    photo_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    photo = await get_photo_or_404(db, photo_id)
    return photo


@router.put("/{photo_id}", response_model=PhotoResponse)
async def update_existing_photo(
    photo_id: UUID,
    data: PhotoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    photo = await update_photo(photo_id, data, db)
    return photo


@router.get("/{photo_id}/download")
async def download_photo(
    photo_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    data, mime_type, original_filename = await get_photo_data(photo_id, db)
    return Response(
        content=data,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{original_filename}"'
        },
    )


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_photo(
    photo_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    await delete_photo(photo_id, db)


@router.get("", response_model=list[PhotoResponse])
async def list_all_photos(
    repair_id: UUID | None = Query(None),
    device_id: UUID | None = Query(None),
    customer_id: UUID | None = Query(None),
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    photos = await list_photos(
        db,
        repair_id=repair_id,
        device_id=device_id,
        customer_id=customer_id,
        category=category,
    )
    return photos


@router.get("/meta/categories", response_model=list[str])
async def list_photo_categories(
    current_user: User = Depends(get_current_active_user),
):
    return PHOTO_CATEGORIES


@router.get("/meta/counts", response_model=list[PhotoCategoryCount])
async def get_photo_category_counts(
    repair_id: UUID | None = Query(None),
    device_id: UUID | None = Query(None),
    customer_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    rows = await get_category_counts(
        db,
        repair_id=repair_id,
        device_id=device_id,
        customer_id=customer_id,
    )
    return rows
