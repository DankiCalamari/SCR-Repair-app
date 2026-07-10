from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_staff
from models.booking import BookingStatus
from schemas.booking import BookingCreate, BookingUpdate, BookingResponse
from services.booking_service import (
    list_bookings as list_bookings_service,
    create_booking,
    get_booking_or_404,
    update_booking,
    delete_booking,
    get_available_slots,
)

router = APIRouter()


@router.get("", response_model=dict)
async def list_bookings_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_staff),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    booking_type: str | None = Query(None),
    status: str | None = Query(None),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
):
    from sqlalchemy.orm import selectinload
    
    bookings, total = await list_bookings_service(
        db, skip=skip, limit=limit, booking_type=booking_type, status=status,
        start_date=start_date, end_date=end_date
    )
    
    # Manually construct response with related data
    response_data = []
    for booking in bookings:
        data = BookingResponse.model_validate(booking).model_dump()
        if booking.customer:
            data["customer_name"] = booking.customer.name
            data["customer_phone"] = booking.customer.phone
        if booking.repair:
            data["ticket_number"] = booking.repair.ticket_number
        response_data.append(data)
    
    return {
        "data": response_data,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=BookingResponse, status_code=201)
async def create_booking_endpoint(
    data: BookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_staff),
):
    booking = await create_booking(data, db, current_user.id)
    return booking


@router.get("/available-slots", response_model=list[dict])
async def get_available_slots_endpoint(
    date: datetime = Query(...),
    booking_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_staff),
):
    """Get available time slots for a specific date."""
    slots = await get_available_slots(db, date, booking_type)
    return slots


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_staff),
):
    booking = await get_booking_or_404(db, booking_id)
    return booking


@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking_endpoint(
    booking_id: UUID,
    data: BookingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_staff),
):
    booking = await update_booking(booking_id, data, db, current_user.id)
    return booking


@router.delete("/{booking_id}", status_code=204)
async def delete_booking_endpoint(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_staff),
):
    await delete_booking(booking_id, db)
    return None