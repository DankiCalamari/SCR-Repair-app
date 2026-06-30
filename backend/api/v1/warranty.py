from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_staff, get_current_active_user
from models.user import User
from schemas.warranty import (
    WarrantyResponse,
    WarrantyClaimCreate,
    WarrantyClaimResponse,
    WarrantyValidateResponse,
)
from services.warranty_service import (
    create_warranty_for_repair,
    create_warranty_claim,
    get_warranty_or_404,
    list_warranties as list_warranties_service,
    resolve_warranty_claim,
    validate_warranty,
)

router = APIRouter()


@router.get("", response_model=dict)
async def list_warranties(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: str | None = Query(None),
):
    warranties, total = await list_warranties_service(db, skip=skip, limit=limit, status_filter=status)
    return {
        "data": [WarrantyResponse.model_validate(w) for w in warranties],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{warranty_id}", response_model=dict)
async def get_warranty(
    warranty_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    warranty = await get_warranty_or_404(db, warranty_id)
    claims = warranty.claims if warranty.claims else []
    return {
        "warranty": WarrantyResponse.model_validate(warranty),
        "claims": [WarrantyClaimResponse.model_validate(c) for c in claims],
    }


@router.post("/{warranty_id}/claim", response_model=WarrantyClaimResponse, status_code=status.HTTP_201_CREATED)
async def create_claim(
    warranty_id: UUID,
    data: WarrantyClaimCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    claim = await create_warranty_claim(warranty_id, data, db)
    return claim


@router.get("/validate/{warranty_number}", response_model=WarrantyValidateResponse)
async def validate_warranty_number(
    warranty_number: str,
    db: AsyncSession = Depends(get_db),
):
    result = await validate_warranty(warranty_number, db)
    return WarrantyValidateResponse(**result)


@router.put("/{warranty_id}/claims/{claim_id}", response_model=WarrantyClaimResponse)
async def resolve_claim(
    warranty_id: UUID,
    claim_id: UUID,
    resolution_notes: str = Query(..., min_length=1),
    resolution_status: str = Query(..., pattern="^(approved|rejected|resolved)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    claim = await resolve_warranty_claim(claim_id, resolution_notes, resolution_status, db)
    return claim
