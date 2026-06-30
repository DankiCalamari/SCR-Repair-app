from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.lead import Lead, LeadStatus, PreferredContactMethod
from models.customer import Customer
from models.repair import Repair, RepairStatus
from schemas.lead import LeadCreate, LeadUpdate


async def get_lead_or_404(db: AsyncSession, lead_id: UUID) -> Lead:
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found",
        )
    return lead


async def list_leads(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    status: str | None = None,
) -> tuple[list[Lead], int]:
    query = select(Lead)
    count_query = select(func.count(Lead.id))

    if status:
        query = query.where(Lead.status == status)
        count_query = count_query.where(Lead.status == status)

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    query = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    leads = list(result.scalars().all())

    return leads, total


async def create_lead(data: LeadCreate, db: AsyncSession) -> Lead:
    customer_id = data.customer_id

    if customer_id is None:
        customer = Customer(
            name=data.name,
            phone=data.phone,
            email=data.email,
        )
        db.add(customer)
        await db.flush()
        await db.refresh(customer)
        customer_id = customer.id

    lead = Lead(
        customer_id=customer_id,
        name=data.name,
        phone=data.phone,
        email=data.email,
        device_type=data.device_type,
        device_model=data.device_model,
        issue_description=data.issue_description,
        preferred_contact_method=PreferredContactMethod(data.preferred_contact_method),
        status=LeadStatus.NEW,
        source=data.source,
        notes=data.notes,
    )
    db.add(lead)
    await db.flush()
    await db.refresh(lead)

    from services.notification_service import notify_new_lead, send_lead_acknowledgement
    await notify_new_lead(db, lead)
    await send_lead_acknowledgement(db, lead)

    return lead


async def update_lead(
    lead_id: UUID, data: LeadUpdate, db: AsyncSession
) -> Lead:
    lead = await get_lead_or_404(db, lead_id)

    update_data = data.model_dump(exclude_unset=True)

    preferred_contact = update_data.pop("preferred_contact_method", None)
    status = update_data.pop("status", None)

    for field, value in update_data.items():
        setattr(lead, field, value)

    if preferred_contact is not None:
        lead.preferred_contact_method = PreferredContactMethod(preferred_contact)
    if status is not None:
        lead.status = LeadStatus(status)

    await db.flush()
    await db.refresh(lead)
    return lead


async def convert_lead(
    lead_id: UUID, db: AsyncSession, user_id: UUID
) -> Repair:
    lead = await get_lead_or_404(db, lead_id)

    if lead.status == LeadStatus.CONVERTED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Lead has already been converted",
        )

    if lead.status == LeadStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot convert a closed lead",
        )

    if lead.customer_id is None:
        customer = Customer(
            name=lead.name,
            phone=lead.phone,
            email=lead.email,
        )
        db.add(customer)
        await db.flush()
        await db.refresh(customer)
        lead.customer_id = customer.id

    repair = Repair(
        ticket_number=await _generate_ticket_number(db),
        customer_id=lead.customer_id,
        device_id=None,
        status=RepairStatus.LEAD,
        issue_description=lead.issue_description or f"Converted from lead: {lead.name}",
    )
    db.add(repair)
    await db.flush()
    await db.refresh(repair)

    lead.converted_repair_id = repair.id
    lead.status = LeadStatus.CONVERTED

    from models.repair import RepairStatusHistory
    history = RepairStatusHistory(
        repair_id=repair.id,
        from_status=None,
        to_status=RepairStatus.LEAD.value,
        changed_by=user_id,
        notes=f"Created from lead conversion (lead ID: {lead.id})",
    )
    db.add(history)

    await db.flush()
    await db.refresh(repair)
    return repair


async def _generate_ticket_number(db: AsyncSession) -> str:
    import random
    for _ in range(10):
        number = random.randint(10000, 99999)
        ticket = f"SCR-{number}"
        result = await db.execute(
            select(Repair).where(Repair.ticket_number == ticket)
        )
        if result.scalar_one_or_none() is None:
            return ticket
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to generate a unique ticket number",
    )


async def delete_lead(lead_id: UUID, db: AsyncSession) -> None:
    lead = await get_lead_or_404(db, lead_id)
    await db.delete(lead)
    await db.flush()
