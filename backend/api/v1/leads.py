from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_staff
from models.customer import Customer
from schemas.lead import (
    LeadCreate,
    LeadResponse,
    LeadUpdate,
    LeadConvertRequest,
)
from schemas.repair import RepairResponse
from services.lead_service import (
    convert_lead as convert_lead_service,
    create_lead as create_lead_service,
    delete_lead as delete_lead_service,
    get_lead_or_404,
    list_leads as list_leads_service,
    update_lead as update_lead_service,
)

router = APIRouter()


@router.get("", response_model=dict)
async def list_leads(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_staff),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: str | None = Query(None),
):
    leads, total = await list_leads_service(db, skip=skip, limit=limit, status=status)
    return {
        "data": [LeadResponse.model_validate(l) for l in leads],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    data: LeadCreate,
    db: AsyncSession = Depends(get_db),
):
    if data.customer_id is not None:
        customer_result = await db.execute(
            select(Customer).where(Customer.id == data.customer_id)
        )
        if customer_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found",
            )

    lead = await create_lead_service(data, db)
    return lead


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_staff),
):
    lead = await get_lead_or_404(db, lead_id)
    return lead


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: UUID,
    data: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_staff),
):
    lead = await update_lead_service(lead_id, data, db)
    return lead


@router.post("/{lead_id}/convert", response_model=RepairResponse, status_code=status.HTTP_201_CREATED)
async def convert_lead(
    lead_id: UUID,
    data: LeadConvertRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_staff),
):
    repair = await convert_lead_service(lead_id, db, current_user.id)
    return repair


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_staff),
):
    await delete_lead_service(lead_id, db)
