from uuid import UUID
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.booking import Booking, BookingStatus, BookingType
from models.customer import Customer
from models.repair import Repair
from schemas.booking import BookingCreate, BookingUpdate


async def list_bookings(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    booking_type: str | None = None,
    status: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> tuple[list[Booking], int]:
    from sqlalchemy.orm import selectinload
    
    query = select(Booking).options(
        selectinload(Booking.customer),
        selectinload(Booking.repair),
    )
    count_query = select(func.count(Booking.id))

    filters = []
    if booking_type:
        filters.append(Booking.booking_type == booking_type)
    if status:
        filters.append(Booking.status == status)
    if start_date:
        filters.append(Booking.scheduled_at >= start_date)
    if end_date:
        filters.append(Booking.scheduled_at <= end_date)

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    query = query.order_by(Booking.scheduled_at.asc()).offset(skip).limit(limit)
    result = await db.execute(query)
    bookings = list(result.scalars().all())

    # Attach additional fields manually
    for booking in bookings:
        if booking.customer:
            booking.customer_name = booking.customer.name
            booking.customer_phone = booking.customer.phone
        if booking.repair:
            booking.ticket_number = booking.repair.ticket_number

    return bookings, total


async def get_booking_or_404(db: AsyncSession, booking_id: UUID) -> Booking:
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )
    return booking


async def create_booking(
    data: BookingCreate, db: AsyncSession, user_id: UUID | None = None
) -> Booking:
    # Validate customer exists
    customer_result = await db.execute(
        select(Customer).where(Customer.id == data.customer_id)
    )
    if customer_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    # Validate repair if provided
    if data.repair_id:
        repair_result = await db.execute(
            select(Repair).where(Repair.id == data.repair_id)
        )
        if repair_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Repair not found",
            )

    # Validate booking type
    booking_type = data.booking_type
    if booking_type not in [t.value for t in BookingType]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid booking type: {booking_type}",
        )

    booking = Booking(
        repair_id=data.repair_id,
        customer_id=data.customer_id,
        booking_type=BookingType(booking_type),
        scheduled_at=data.scheduled_at,
        duration_minutes=data.duration_minutes or 30,
        address=data.address,
        notes=data.notes,
        created_by=user_id,
    )
    db.add(booking)
    await db.flush()
    await db.refresh(booking)

    return booking


async def update_booking(
    booking_id: UUID, data: BookingUpdate, db: AsyncSession, user_id: UUID | None = None
) -> Booking:
    booking = await get_booking_or_404(db, booking_id)

    update_data = data.model_dump(exclude_unset=True)

    if "booking_type" in update_data:
        if update_data["booking_type"] not in [t.value for t in BookingType]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid booking type",
            )

    if "status" in update_data:
        if update_data["status"] not in [s.value for s in BookingStatus]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid booking status",
            )

    for field, value in update_data.items():
        setattr(booking, field, value)

    await db.flush()
    await db.refresh(booking)
    return booking


async def delete_booking(booking_id: UUID, db: AsyncSession) -> None:
    booking = await get_booking_or_404(db, booking_id)
    await db.delete(booking)
    await db.flush()


async def get_available_slots(
    db: AsyncSession,
    date: datetime,
    booking_type: str | None = None,
) -> list[dict]:
    """Get available time slots for a given date.
    
    Returns a list of available time slots, excluding already booked slots.
    Default business hours: 9am - 5pm, 30-minute slots.
    """
    from datetime import time as time_type
    
    # Define business hours
    start_hour = 9
    end_hour = 17
    slot_duration = 30  # minutes
    
    # Get bookings for the date
    start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = date.replace(hour=23, minute=59, second=59, microsecond=0)
    
    query = select(Booking).where(
        Booking.scheduled_at >= start_of_day,
        Booking.scheduled_at <= end_of_day,
        Booking.status == BookingStatus.SCHEDULED,
    )
    if booking_type:
        query = query.where(Booking.booking_type == booking_type)
    
    result = await db.execute(query)
    existing_bookings = list(result.scalars().all())
    
    # Generate all possible slots
    all_slots = []
    current_hour = start_hour
    while current_hour < end_hour:
        for minute in [0, 30]:
            slot_time = time_type(current_hour, minute)
            slot_datetime = start_of_day.replace(hour=current_hour, minute=minute)
            all_slots.append({
                "time": slot_time.strftime("%H:%M"),
                "datetime": slot_datetime,
                "available": True,
            })
        current_hour += 1
    
    # Mark slots as unavailable if they're already booked
    for slot in all_slots:
        slot_dt = slot["datetime"]
        slot_end = slot_dt.replace(hour=slot_dt.hour + 1, minute=slot_dt.minute - 30 if slot_dt.minute == 30 else 0)
        
        for booking in existing_bookings:
            booking_start = booking.scheduled_at
            booking_end = booking.scheduled_at.replace(
                hour=booking_start.hour + (booking.duration_minutes // 60),
                minute=booking_start.minute + (booking.duration_minutes % 60),
            )
            
            # Check for overlap
            if slot_dt < booking_end and slot_end > booking_start:
                slot["available"] = False
                break
    
    return all_slots