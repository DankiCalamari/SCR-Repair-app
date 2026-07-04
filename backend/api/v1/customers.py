from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_staff, get_current_active_user
from models.user import User, UserRole
from models.device import Device
from schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
    CustomerWithRepairs,
)
from schemas.device import DeviceResponse
from schemas.repair import RepairResponse
from services.customer_service import (
    create_customer as create_customer_service,
    delete_customer as delete_customer_service,
    get_customer_or_404,
    get_customer_repairs as get_customer_repairs_service,
    get_customer_timeline as get_customer_timeline_service,
    list_customers as list_customers_service,
    update_customer as update_customer_service,
)

router = APIRouter()


@router.get("", response_model=dict)
async def list_customers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = Query(None, max_length=255),
):
    customers, total = await list_customers_service(db, skip=skip, limit=limit, search=search)
    return {
        "data": [CustomerResponse.model_validate(c) for c in customers],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    customer = await create_customer_service(data, db)
    return CustomerResponse.model_validate(customer)


@router.get("/{customer_id}", response_model=CustomerWithRepairs)
async def get_customer(
    customer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    customer = await get_customer_or_404(db, customer_id)

    if current_user.role == UserRole.CUSTOMER:
        if customer.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own customer profile",
            )

    devices_result = await db.execute(
        select(Device).where(Device.customer_id == customer.id)
    )
    devices = list(devices_result.scalars().all())

    repairs = await get_customer_repairs_service(db, customer_id)

    return CustomerWithRepairs(
        id=customer.id,
        user_id=customer.user_id,
        name=customer.name,
        phone=customer.phone,
        email=customer.email,
        address=customer.address,
        notes=customer.notes,
        created_at=customer.created_at,
        updated_at=customer.updated_at,
        devices=[DeviceResponse.model_validate(d) for d in devices],
        repairs=[RepairResponse.model_validate(r) for r in repairs],
    )


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: UUID,
    data: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    customer = await update_customer_service(customer_id, data, db)
    return CustomerResponse.model_validate(customer)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    await delete_customer_service(customer_id, db)


@router.get("/{customer_id}/repairs", response_model=list[RepairResponse])
async def get_customer_repairs(
    customer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    customer = await get_customer_or_404(db, customer_id)

    if current_user.role == UserRole.CUSTOMER:
        if customer.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own repairs",
            )

    repairs = await get_customer_repairs_service(db, customer_id)
    return [RepairResponse.model_validate(r) for r in repairs]


@router.get("/{customer_id}/timeline")
async def get_customer_timeline(
    customer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    customer = await get_customer_or_404(db, customer_id)

    if current_user.role == UserRole.CUSTOMER:
        if customer.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own timeline",
            )

    timeline = await get_customer_timeline_service(db, customer_id)
    return {"data": timeline}


@router.get("/{customer_id}/devices")
async def get_customer_devices(
    customer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    customer = await get_customer_or_404(db, customer_id)

    if current_user.role == UserRole.CUSTOMER:
        if customer.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own devices",
            )

    result = await db.execute(
        select(Device).where(Device.customer_id == customer.id)
    )
    devices = list(result.scalars().all())
    return [DeviceResponse.model_validate(d) for d in devices]
