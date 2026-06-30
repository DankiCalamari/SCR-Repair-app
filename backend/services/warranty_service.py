import random
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.warranty import WarrantyRecord, WarrantyClaim, WarrantyStatus, WarrantyClaimStatus
from models.repair import Repair, RepairStatus


async def generate_warranty_number(db: AsyncSession) -> str:
    for _ in range(10):
        number = random.randint(10000, 99999)
        warranty_number = f"WAR-{number}"
        result = await db.execute(
            select(WarrantyRecord).where(WarrantyRecord.warranty_number == warranty_number)
        )
        if result.scalar_one_or_none() is None:
            return warranty_number
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to generate a unique warranty number",
    )


async def create_warranty_for_repair(repair_id: UUID, db: AsyncSession) -> WarrantyRecord:
    repair_result = await db.execute(select(Repair).where(Repair.id == repair_id))
    repair = repair_result.scalar_one_or_none()
    if repair is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repair not found",
        )

    existing = await db.execute(
        select(WarrantyRecord).where(WarrantyRecord.repair_id == repair_id)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Warranty already exists for this repair",
        )

    warranty_number = await generate_warranty_number(db)

    if repair.completed_date is not None:
        issue_date = repair.completed_date
    else:
        issue_date = datetime.utcnow()

    expiry_date = issue_date + timedelta(days=90)

    warranty = WarrantyRecord(
        repair_id=repair_id,
        warranty_number=warranty_number,
        issue_date=issue_date,
        expiry_date=expiry_date,
        status=WarrantyStatus.ACTIVE,
    )
    db.add(warranty)
    await db.flush()
    await db.refresh(warranty)
    return warranty


async def get_warranty_or_404(db: AsyncSession, warranty_id: UUID) -> WarrantyRecord:
    result = await db.execute(
        select(WarrantyRecord).where(WarrantyRecord.id == warranty_id)
    )
    warranty = result.scalar_one_or_none()
    if warranty is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warranty not found",
        )
    return warranty


async def list_warranties(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    status_filter: str | None = None,
) -> tuple[list[WarrantyRecord], int]:
    query = select(WarrantyRecord)
    count_query = select(func.count(WarrantyRecord.id))

    if status_filter:
        query = query.where(WarrantyRecord.status == status_filter)
        count_query = count_query.where(WarrantyRecord.status == status_filter)

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    query = query.order_by(WarrantyRecord.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    warranties = list(result.scalars().all())

    return warranties, total


async def validate_warranty(warranty_number: str, db: AsyncSession) -> dict:
    result = await db.execute(
        select(WarrantyRecord).where(WarrantyRecord.warranty_number == warranty_number)
    )
    warranty = result.scalar_one_or_none()

    if warranty is None:
        return {
            "valid": False,
            "warranty_number": None,
            "status": None,
            "expiry_date": None,
            "message": "Warranty number not found",
        }

    if warranty.status == WarrantyStatus.VOID:
        return {
            "valid": False,
            "warranty_number": warranty.warranty_number,
            "status": warranty.status.value,
            "expiry_date": warranty.expiry_date,
            "message": "This warranty has been voided",
        }

    now = datetime.utcnow()
    if warranty.expiry_date < now:
        return {
            "valid": False,
            "warranty_number": warranty.warranty_number,
            "status": warranty.status.value,
            "expiry_date": warranty.expiry_date,
            "message": "This warranty has expired",
        }

    return {
        "valid": True,
        "warranty_number": warranty.warranty_number,
        "status": warranty.status.value,
        "expiry_date": warranty.expiry_date,
        "message": "Warranty is valid",
    }


async def create_warranty_claim(
    warranty_id: UUID, data, db: AsyncSession
) -> WarrantyClaim:
    warranty = await get_warranty_or_404(db, warranty_id)

    if warranty.status == WarrantyStatus.VOID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot claim on a voided warranty",
        )

    now = datetime.utcnow()
    if warranty.expiry_date < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot claim on an expired warranty",
        )

    claim = WarrantyClaim(
        warranty_id=warranty_id,
        description=data.description,
        status=WarrantyClaimStatus.PENDING,
    )
    db.add(claim)

    warranty.status = WarrantyStatus.CLAIMED
    await db.flush()
    await db.refresh(claim)

    from services.notification_service import notify_warranty_claim
    from models.repair import Repair
    repair_result = await db.execute(
        select(Repair).where(Repair.id == warranty.repair_id)
    )
    repair = repair_result.scalar_one_or_none()
    await notify_warranty_claim(db, claim, warranty, repair)

    return claim


async def resolve_warranty_claim(
    claim_id: UUID,
    resolution_notes: str,
    resolution_status: str,
    db: AsyncSession,
) -> WarrantyClaim:
    result = await db.execute(
        select(WarrantyClaim).where(WarrantyClaim.id == claim_id)
    )
    claim = result.scalar_one_or_none()
    if claim is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warranty claim not found",
        )

    claim.status = WarrantyClaimStatus(resolution_status)
    claim.resolution_notes = resolution_notes
    claim.resolved_at = datetime.utcnow()

    all_claims_result = await db.execute(
        select(WarrantyClaim).where(
            WarrantyClaim.warranty_id == claim.warranty_id,
            WarrantyClaim.status.in_([WarrantyClaimStatus.PENDING]),
        )
    )
    remaining_pending = all_claims_result.scalars().all()

    if len(remaining_pending) == 0:
        warranty_result = await db.execute(
            select(WarrantyRecord).where(WarrantyRecord.id == claim.warranty_id)
        )
        warranty = warranty_result.scalar_one()
        now = datetime.utcnow()
        if warranty.expiry_date > now:
            warranty.status = WarrantyStatus.ACTIVE
        else:
            warranty.status = WarrantyStatus.EXPIRED

    await db.flush()
    await db.refresh(claim)

    from services.notification_service import notify_warranty_claim_resolved
    from models.repair import Repair
    warranty_result = await db.execute(
        select(WarrantyRecord).where(WarrantyRecord.id == claim.warranty_id)
    )
    warranty = warranty_result.scalar_one()
    repair_result = await db.execute(
        select(Repair).where(Repair.id == warranty.repair_id)
    )
    repair = repair_result.scalar_one_or_none()
    await notify_warranty_claim_resolved(db, claim, warranty, repair)

    return claim
