import random
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.repair import Repair, RepairStatus, RepairStatusHistory
from models.sms import SmsMessage
from models.email import EmailMessage
from models.photo import Photo
from schemas.repair import RepairCreate, RepairUpdate, RepairStatusUpdate


async def generate_ticket_number(db: AsyncSession) -> str:
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


async def get_repair_or_404(db: AsyncSession, repair_id: UUID) -> Repair:
    result = await db.execute(select(Repair).where(Repair.id == repair_id))
    repair = result.scalar_one_or_none()
    if repair is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repair not found",
        )
    return repair


async def list_repairs(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    status: str | None = None,
    search: str | None = None,
) -> tuple[list[Repair], int]:
    query = select(Repair)
    count_query = select(func.count(Repair.id))

    filters = []
    if status:
        filters.append(Repair.status == status)
    if search:
        search_term = f"%{search}%"
        filters.append(
            Repair.ticket_number.ilike(search_term)
        )

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    query = query.order_by(Repair.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    repairs = list(result.scalars().all())

    return repairs, total


async def create_repair(
    data: RepairCreate, db: AsyncSession, user_id: UUID
) -> Repair:
    ticket_number = await generate_ticket_number(db)

    repair = Repair(
        ticket_number=ticket_number,
        customer_id=data.customer_id,
        device_id=data.device_id,
        status=RepairStatus(data.status),
        issue_description=data.issue_description,
        diagnosis=data.diagnosis,
        repair_notes=data.repair_notes,
        labour_hours=data.labour_hours,
        labour_cost=data.labour_cost,
        parts_cost=data.parts_cost,
        estimated_completion=data.estimated_completion,
    )
    db.add(repair)
    await db.flush()
    await db.refresh(repair)

    history = RepairStatusHistory(
        repair_id=repair.id,
        from_status=None,
        to_status=data.status,
        changed_by=user_id,
        notes="Repair ticket created",
    )
    db.add(history)
    await db.flush()

    return repair


async def update_repair(
    repair_id: UUID, data: RepairUpdate, db: AsyncSession, user_id: UUID
) -> Repair:
    repair = await get_repair_or_404(db, repair_id)

    old_status = repair.status.value
    update_data = data.model_dump(exclude_unset=True)

    new_status = update_data.pop("status", None)

    for field, value in update_data.items():
        setattr(repair, field, value)

    if new_status is not None and new_status != old_status:
        repair.status = RepairStatus(new_status)
        history = RepairStatusHistory(
            repair_id=repair.id,
            from_status=old_status,
            to_status=new_status,
            changed_by=user_id,
        )
        db.add(history)

    await db.flush()
    await db.refresh(repair)
    return repair


async def update_repair_status(
    repair_id: UUID,
    data: RepairStatusUpdate,
    db: AsyncSession,
    user_id: UUID,
) -> Repair:
    repair = await get_repair_or_404(db, repair_id)

    old_status = repair.status.value
    new_status = data.status

    if new_status == old_status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Repair is already in '{new_status}' status",
        )

    repair.status = RepairStatus(new_status)

    history = RepairStatusHistory(
        repair_id=repair.id,
        from_status=old_status,
        to_status=new_status,
        changed_by=user_id,
        notes=data.notes,
    )
    db.add(history)

    await db.flush()
    await db.refresh(repair)

    from services.notification_service import notify_repair_status_change
    await notify_repair_status_change(db, repair, old_status, new_status)

    return repair


async def get_repair_timeline(
    db: AsyncSession, repair_id: UUID
) -> list[dict]:
    repair = await get_repair_or_404(db, repair_id)

    history_result = await db.execute(
        select(RepairStatusHistory)
        .where(RepairStatusHistory.repair_id == repair.id)
        .order_by(RepairStatusHistory.created_at.asc())
    )
    history_entries = history_result.scalars().all()

    sms_result = await db.execute(
        select(SmsMessage)
        .where(SmsMessage.repair_id == repair.id)
        .order_by(SmsMessage.created_at.desc())
    )
    sms_messages = sms_result.scalars().all()

    email_result = await db.execute(
        select(EmailMessage)
        .where(EmailMessage.repair_id == repair.id)
        .order_by(EmailMessage.created_at.desc())
    )
    email_messages = email_result.scalars().all()

    photo_result = await db.execute(
        select(Photo)
        .where(Photo.repair_id == repair.id)
        .order_by(Photo.created_at.desc())
    )
    photos = photo_result.scalars().all()

    timeline = []
    for entry in history_entries:
        timeline.append({
            "type": "status_change",
            "from_status": entry.from_status,
            "to_status": entry.to_status,
            "notes": entry.notes,
            "changed_by": str(entry.changed_by) if entry.changed_by else None,
            "created_at": entry.created_at,
            "id": str(entry.id),
        })
    for sms in sms_messages:
        timeline.append({
            "type": "sms",
            "direction": sms.direction.value,
            "status": sms.status.value,
            "body": sms.body,
            "created_at": sms.created_at,
            "id": str(sms.id),
        })
    for email in email_messages:
        timeline.append({
            "type": "email",
            "direction": email.direction.value,
            "status": email.status.value,
            "subject": email.subject,
            "body": email.body,
            "created_at": email.created_at,
            "id": str(email.id),
        })
    for photo in photos:
        timeline.append({
            "type": "photo",
            "category": photo.category.value if photo.category else None,
            "original_filename": photo.original_filename,
            "thumbnail_path": photo.thumbnail_path,
            "notes": photo.notes,
            "is_important": photo.is_important,
            "created_at": photo.created_at,
            "id": str(photo.id),
        })

    timeline.sort(key=lambda x: x["created_at"])
    return timeline


async def get_repair_communications(
    db: AsyncSession, repair_id: UUID
) -> list[dict]:
    repair = await get_repair_or_404(db, repair_id)

    sms_result = await db.execute(
        select(SmsMessage)
        .where(SmsMessage.repair_id == repair.id)
        .order_by(SmsMessage.created_at.desc())
    )
    sms_messages = sms_result.scalars().all()

    email_result = await db.execute(
        select(EmailMessage)
        .where(EmailMessage.repair_id == repair.id)
        .order_by(EmailMessage.created_at.desc())
    )
    email_messages = email_result.scalars().all()

    communications = []
    for sms in sms_messages:
        communications.append({
            "type": "sms",
            "direction": sms.direction.value,
            "status": sms.status.value,
            "from_number": sms.from_number,
            "to_number": sms.to_number,
            "body": sms.body,
            "created_at": sms.created_at,
            "id": str(sms.id),
        })
    for email in email_messages:
        communications.append({
            "type": "email",
            "direction": email.direction.value,
            "status": email.status.value,
            "from_address": email.from_address,
            "to_address": email.to_address,
            "subject": email.subject,
            "body": email.body,
            "created_at": email.created_at,
            "id": str(email.id),
        })

    communications.sort(key=lambda x: x["created_at"], reverse=True)
    return communications


async def delete_repair(repair_id: UUID, db: AsyncSession) -> None:
    repair = await get_repair_or_404(db, repair_id)

    # Delete status history
    from models.repair import RepairStatusHistory
    history_result = await db.execute(
        select(RepairStatusHistory).where(RepairStatusHistory.repair_id == repair_id)
    )
    for entry in history_result.scalars().all():
        await db.delete(entry)

    # Delete photos
    from models.photo import Photo
    photos_result = await db.execute(
        select(Photo).where(Photo.repair_id == repair_id)
    )
    for photo in photos_result.scalars().all():
        await db.delete(photo)

    # Delete documents
    from models.document import Document
    docs_result = await db.execute(
        select(Document).where(Document.repair_id == repair_id)
    )
    for doc in docs_result.scalars().all():
        await db.delete(doc)

    # Delete quotes (cascade to approvals)
    from models.quote import Quote
    quotes_result = await db.execute(
        select(Quote).where(Quote.repair_id == repair_id)
    )
    for quote in quotes_result.scalars().all():
        await db.delete(quote)

    # Delete invoices (cascade to items)
    from models.invoice import Invoice
    invoices_result = await db.execute(
        select(Invoice).where(Invoice.repair_id == repair_id)
    )
    for invoice in invoices_result.scalars().all():
        await db.delete(invoice)

    # Delete SMS messages
    from models.sms import SmsMessage
    sms_result = await db.execute(
        select(SmsMessage).where(SmsMessage.repair_id == repair_id)
    )
    for sms in sms_result.scalars().all():
        await db.delete(sms)

    # Delete emails
    from models.email import EmailMessage
    email_result = await db.execute(
        select(EmailMessage).where(EmailMessage.repair_id == repair_id)
    )
    for email in email_result.scalars().all():
        await db.delete(email)

    # Delete warranty (cascade to claims)
    from models.warranty import WarrantyRecord
    warranty_result = await db.execute(
        select(WarrantyRecord).where(WarrantyRecord.repair_id == repair_id)
    )
    for warranty in warranty_result.scalars().all():
        await db.delete(warranty)

    await db.delete(repair)
    await db.flush()
