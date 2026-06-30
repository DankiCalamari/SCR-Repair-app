from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.customer import Customer
from models.repair import Repair
from models.sms import SmsMessage
from models.email import EmailMessage
from schemas.customer import CustomerCreate, CustomerUpdate


async def get_customer_or_404(db: AsyncSession, customer_id: UUID) -> Customer:
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    return customer


async def list_customers(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    search: str | None = None,
) -> tuple[list[Customer], int]:
    query = select(Customer)
    count_query = select(func.count(Customer.id))

    if search:
        search_term = f"%{search}%"
        filter_clause = or_(
            Customer.name.ilike(search_term),
            Customer.phone.ilike(search_term),
            Customer.email.ilike(search_term),
        )
        query = query.where(filter_clause)
        count_query = count_query.where(filter_clause)

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    query = query.order_by(Customer.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    customers = list(result.scalars().all())

    return customers, total


async def create_customer(data: CustomerCreate, db: AsyncSession) -> Customer:
    customer = Customer(
        name=data.name,
        phone=data.phone,
        email=data.email,
        address=data.address,
        notes=data.notes,
    )
    db.add(customer)
    await db.flush()
    await db.refresh(customer)
    return customer


async def update_customer(
    customer_id: UUID, data: CustomerUpdate, db: AsyncSession
) -> Customer:
    customer = await get_customer_or_404(db, customer_id)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)

    await db.flush()
    await db.refresh(customer)
    return customer


async def delete_customer(customer_id: UUID, db: AsyncSession) -> None:
    customer = await get_customer_or_404(db, customer_id)

    # Delete child repairs (cascade to their children)
    repairs_result = await db.execute(
        select(Repair).where(Repair.customer_id == customer_id)
    )
    for repair in repairs_result.scalars().all():
        await db.delete(repair)

    # Delete child devices
    from models.device import Device
    devices_result = await db.execute(
        select(Device).where(Device.customer_id == customer_id)
    )
    for device in devices_result.scalars().all():
        await db.delete(device)

    # Delete child SMS messages
    sms_result = await db.execute(
        select(SmsMessage).where(SmsMessage.customer_id == customer_id)
    )
    for sms in sms_result.scalars().all():
        await db.delete(sms)

    # Delete child emails
    email_result = await db.execute(
        select(EmailMessage).where(EmailMessage.customer_id == customer_id)
    )
    for email in email_result.scalars().all():
        await db.delete(email)

    # Delete child leads
    from models.lead import Lead
    leads_result = await db.execute(
        select(Lead).where(Lead.customer_id == customer_id)
    )
    for lead in leads_result.scalars().all():
        await db.delete(lead)

    await db.delete(customer)
    await db.flush()


async def get_customer_repairs(
    db: AsyncSession, customer_id: UUID
) -> list[Repair]:
    customer = await get_customer_or_404(db, customer_id)
    result = await db.execute(
        select(Repair)
        .where(Repair.customer_id == customer.id)
        .order_by(Repair.created_at.desc())
    )
    return list(result.scalars().all())


async def get_customer_timeline(
    db: AsyncSession, customer_id: UUID
) -> list[dict]:
    customer = await get_customer_or_404(db, customer_id)

    sms_result = await db.execute(
        select(SmsMessage)
        .where(SmsMessage.customer_id == customer.id)
        .order_by(SmsMessage.created_at.desc())
    )
    sms_messages = sms_result.scalars().all()

    email_result = await db.execute(
        select(EmailMessage)
        .where(EmailMessage.customer_id == customer.id)
        .order_by(EmailMessage.created_at.desc())
    )
    email_messages = email_result.scalars().all()

    repair_result = await db.execute(
        select(Repair)
        .where(Repair.customer_id == customer.id)
        .order_by(Repair.created_at.desc())
    )
    repairs = repair_result.scalars().all()

    timeline = []
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
    for repair in repairs:
        timeline.append({
            "type": "repair",
            "ticket_number": repair.ticket_number,
            "status": repair.status.value,
            "issue_description": repair.issue_description,
            "created_at": repair.created_at,
            "id": str(repair.id),
        })

    timeline.sort(key=lambda x: x["created_at"], reverse=True)
    return timeline
