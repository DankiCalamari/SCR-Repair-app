from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_staff, require_admin, get_current_active_user
from models.user import User, UserRole
from models.device import Device
from models.customer import Customer
from schemas.device import DeviceCreate, DeviceResponse, DeviceUpdate
from schemas.photo import PhotoResponse

router = APIRouter()


@router.get("", response_model=dict)
async def list_devices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    count_result = await db.execute(select(func.count(Device.id)))
    total = count_result.scalar()

    result = await db.execute(
        select(Device)
        .order_by(Device.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    devices = list(result.scalars().all())

    return {
        "data": [DeviceResponse.model_validate(d) for d in devices],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_device(
    data: DeviceCreate,
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

    device = Device(
        customer_id=data.customer_id,
        device_type=data.device_type,
        brand=data.brand,
        model=data.model,
        imei=data.imei,
        serial_number=data.serial_number,
        colour=data.colour,
        passcode=data.passcode,
        accessories=data.accessories,
        existing_damage=data.existing_damage,
    )
    db.add(device)
    await db.flush()
    await db.refresh(device)
    return device


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    if current_user.role == UserRole.CUSTOMER:
        customer_result = await db.execute(
            select(Customer).where(
                Customer.id == device.customer_id,
                Customer.user_id == current_user.id,
            )
        )
        if customer_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own devices",
            )

    return device


@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: UUID,
    data: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)

    await db.flush()
    await db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(
    device_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    await db.delete(device)
    await db.flush()
