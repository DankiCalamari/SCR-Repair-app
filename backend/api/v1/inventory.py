from datetime import datetime
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_admin
from models.user import User
from models.inventory import InventoryItem

router = APIRouter()


class InventoryItemCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    quantity: int = 0
    unit_price: float = 0.0
    min_stock: int = 0
    location: Optional[str] = None
    notes: Optional[str] = None


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    unit_price: Optional[float] = None
    min_stock: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class InventoryItemResponse(BaseModel):
    id: str
    name: str
    sku: Optional[str]
    category: Optional[str]
    quantity: int
    unit_price: float
    min_stock: int
    location: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=dict)
async def list_inventory(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    category: Optional[str] = None,
):
    query = select(InventoryItem)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                InventoryItem.name.ilike(search_term),
                InventoryItem.sku.ilike(search_term),
            )
        )

    if category:
        query = query.where(InventoryItem.category == category)

    count_result = await db.execute(
        select(func.count()).select_from(InventoryItem).where(
            *([query.whereclause] if query.whereclause else [])
        )
    )
    total = count_result.scalar() or 0

    result = await db.execute(query.order_by(InventoryItem.name).offset(skip).limit(limit))
    items = list(result.scalars().all())

    return {
        "data": [InventoryItemResponse.model_validate(i).model_dump() for i in items],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory_item_endpoint(
    data: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    import uuid as _uuid

    item = InventoryItem(
        id=_uuid.uuid4(),
        name=data.name,
        sku=data.sku,
        category=data.category,
        quantity=data.quantity,
        unit_price=data.unit_price,
        min_stock=data.min_stock,
        location=data.location,
        notes=data.notes,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)

    return InventoryItemResponse.model_validate(item)


@router.put("/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item_endpoint(
    item_id: UUID,
    data: InventoryItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(InventoryItem).where(InventoryItem.id == item_id))
    item = result.scalar_one_or_none()

    if item is None:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    if data.name is not None:
        item.name = data.name
    if data.sku is not None:
        item.sku = data.sku
    if data.category is not None:
        item.category = data.category
    if data.quantity is not None:
        item.quantity = data.quantity
    if data.unit_price is not None:
        item.unit_price = data.unit_price
    if data.min_stock is not None:
        item.min_stock = data.min_stock
    if data.location is not None:
        item.location = data.location
    if data.notes is not None:
        item.notes = data.notes

    await db.flush()
    await db.refresh(item)

    return InventoryItemResponse.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_item_endpoint(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(InventoryItem).where(InventoryItem.id == item_id))
    item = result.scalar_one_or_none()

    if item is None:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    await db.delete(item)
    await db.flush()