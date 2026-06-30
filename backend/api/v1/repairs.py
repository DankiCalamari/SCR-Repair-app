from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_staff, get_current_active_user
from models.user import User, UserRole
from models.repair import Repair, RepairStatusHistory
from models.photo import Photo
from models.document import Document
from models.customer import Customer
from models.device import Device
from models.quote import Quote
from models.invoice import Invoice
from schemas.repair import (
    RepairCreate,
    RepairUpdate,
    RepairResponse,
    RepairDetailResponse,
    RepairStatusUpdate,
    RepairStatusHistoryResponse,
    RepairTimelineEntry,
)
from schemas.photo import PhotoResponse
from schemas.document import DocumentResponse
from schemas.quote import QuoteResponse
from schemas.invoice import InvoiceResponse
from schemas.customer import CustomerResponse
from schemas.device import DeviceResponse
from services.repair_service import (
    create_repair as create_repair_service,
    delete_repair as delete_repair_service,
    get_repair_or_404,
    get_repair_communications as get_repair_communications_service,
    get_repair_timeline as get_repair_timeline_service,
    list_repairs as list_repairs_service,
    update_repair as update_repair_service,
    update_repair_status as update_repair_status_service,
)

router = APIRouter()


@router.get("", response_model=dict)
async def list_repairs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: str | None = Query(None),
    search: str | None = Query(None, max_length=255),
):
    repairs, total = await list_repairs_service(
        db, skip=skip, limit=limit, status=status, search=search
    )
    return {
        "data": [RepairResponse.model_validate(r) for r in repairs],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=RepairResponse, status_code=status.HTTP_201_CREATED)
async def create_repair(
    data: RepairCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    customer_result = await db.execute(
        select(Customer).where(Customer.id == data.customer_id)
    )
    if customer_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    device_result = await db.execute(
        select(Device).where(Device.id == data.device_id)
    )
    if device_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    repair = await create_repair_service(data, db, current_user.id)
    return repair


@router.get("/{repair_id}", response_model=RepairDetailResponse)
async def get_repair(
    repair_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    repair = await get_repair_or_404(db, repair_id)

    if current_user.role == UserRole.CUSTOMER:
        customer_result = await db.execute(
            select(Customer).where(
                Customer.id == repair.customer_id,
                Customer.user_id == current_user.id,
            )
        )
        if customer_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own repairs",
            )

    customer_result = await db.execute(
        select(Customer).where(Customer.id == repair.customer_id)
    )
    customer = customer_result.scalar_one_or_none()

    device_result = await db.execute(
        select(Device).where(Device.id == repair.device_id)
    )
    device = device_result.scalar_one_or_none()

    history_result = await db.execute(
        select(RepairStatusHistory)
        .where(RepairStatusHistory.repair_id == repair.id)
        .order_by(RepairStatusHistory.created_at.asc())
    )
    history_entries = list(history_result.scalars().all())

    photos_result = await db.execute(
        select(Photo).where(Photo.repair_id == repair.id)
    )
    photos = list(photos_result.scalars().all())

    documents_result = await db.execute(
        select(Document).where(Document.repair_id == repair.id)
    )
    documents = list(documents_result.scalars().all())

    from sqlalchemy.orm import selectinload
    quotes_result = await db.execute(
        select(Quote).options(selectinload(Quote.items)).where(Quote.repair_id == repair.id)
    )
    quotes = list(quotes_result.scalars().all())

    invoices_result = await db.execute(
        select(Invoice).where(Invoice.repair_id == repair.id)
    )
    invoices = list(invoices_result.scalars().all())

    status_history = [RepairStatusHistoryResponse.model_validate(h) for h in history_entries]

    timeline = [
        RepairTimelineEntry(
            timestamp=entry.created_at,
            status=entry.to_status,
            notes=entry.notes,
            changed_by=entry.changed_by,
        )
        for entry in history_entries
    ]

    return RepairDetailResponse(
        **RepairResponse.model_validate(repair).model_dump(),
        customer=CustomerResponse.model_validate(customer) if customer else None,
        device=DeviceResponse.model_validate(device) if device else None,
        status_history=status_history,
        photos=[PhotoResponse.model_validate(p) for p in photos],
        documents=[DocumentResponse.model_validate(d) for d in documents],
        quotes=[QuoteResponse.model_validate(q) for q in quotes],
        invoices=[InvoiceResponse.model_validate(i) for i in invoices],
        timeline=timeline,
    )


@router.put("/{repair_id}", response_model=RepairResponse)
async def update_repair(
    repair_id: UUID,
    data: RepairUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    repair = await update_repair_service(repair_id, data, db, current_user.id)
    return repair


@router.patch("/{repair_id}/status", response_model=RepairResponse)
async def update_repair_status(
    repair_id: UUID,
    data: RepairStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    repair = await update_repair_status_service(repair_id, data, db, current_user.id)
    return repair


@router.get("/{repair_id}/timeline")
async def get_repair_timeline(
    repair_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    repair = await get_repair_or_404(db, repair_id)

    if current_user.role == UserRole.CUSTOMER:
        customer_result = await db.execute(
            select(Customer).where(
                Customer.id == repair.customer_id,
                Customer.user_id == current_user.id,
            )
        )
        if customer_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own repair timeline",
            )

    timeline = await get_repair_timeline_service(db, repair_id)
    return {"data": timeline}


@router.get("/{repair_id}/photos", response_model=list[PhotoResponse])
async def get_repair_photos(
    repair_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    repair = await get_repair_or_404(db, repair_id)

    if current_user.role == UserRole.CUSTOMER:
        customer_result = await db.execute(
            select(Customer).where(
                Customer.id == repair.customer_id,
                Customer.user_id == current_user.id,
            )
        )
        if customer_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own repair photos",
            )

    result = await db.execute(
        select(Photo).where(Photo.repair_id == repair.id)
    )
    return list(result.scalars().all())


@router.post("/{repair_id}/photos", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED)
async def upload_repair_photo(
    repair_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    repair = await get_repair_or_404(db, repair_id)

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Photo upload requires file storage integration. Use the storage service to upload files.",
    )


@router.get("/{repair_id}/documents", response_model=list[DocumentResponse])
async def get_repair_documents(
    repair_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    repair = await get_repair_or_404(db, repair_id)

    if current_user.role == UserRole.CUSTOMER:
        customer_result = await db.execute(
            select(Customer).where(
                Customer.id == repair.customer_id,
                Customer.user_id == current_user.id,
            )
        )
        if customer_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own repair documents",
            )

    result = await db.execute(
        select(Document).where(Document.repair_id == repair.id)
    )
    return list(result.scalars().all())


@router.get("/{repair_id}/communications")
async def get_repair_communications(
    repair_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    repair = await get_repair_or_404(db, repair_id)

    if current_user.role == UserRole.CUSTOMER:
        customer_result = await db.execute(
            select(Customer).where(
                Customer.id == repair.customer_id,
                Customer.user_id == current_user.id,
            )
        )
        if customer_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own repair communications",
            )

    communications = await get_repair_communications_service(db, repair_id)
    return {"data": communications}


@router.delete("/{repair_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_repair(
    repair_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    await delete_repair_service(repair_id, db)
