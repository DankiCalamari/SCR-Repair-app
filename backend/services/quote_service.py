import random
from uuid import UUID
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.quote import Quote, QuoteApproval, QuoteItem, QuoteStatus


GST_RATE = 0.10


async def generate_quote_number(db: AsyncSession) -> str:
    for _ in range(10):
        number = random.randint(10000, 99999)
        quote_num = f"QUO-{number}"
        result = await db.execute(
            select(Quote).where(Quote.quote_number == quote_num)
        )
        if result.scalar_one_or_none() is None:
            return quote_num
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to generate a unique quote number",
    )


async def get_quote_or_404(db: AsyncSession, quote_id: UUID) -> Quote:
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Quote).options(selectinload(Quote.items)).where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found",
        )
    return quote


async def list_quotes(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    status: str | None = None,
) -> tuple[list[Quote], int]:
    from sqlalchemy.orm import selectinload
    query = select(Quote).options(selectinload(Quote.items))
    count_query = select(func.count(Quote.id))

    filters = []
    if status:
        filters.append(Quote.status == status)

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    query = query.order_by(Quote.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    quotes = list(result.scalars().all())

    return quotes, total


def _calculate_quote_totals(labour_cost: float, parts_cost: float) -> tuple[float, float, float]:
    subtotal = labour_cost + parts_cost
    gst_amount = round(subtotal * GST_RATE, 2)
    total_amount = round(subtotal + gst_amount, 2)
    return subtotal, gst_amount, total_amount


async def create_quote(
    data: "QuoteCreate", db: AsyncSession, user_id: UUID
) -> Quote:
    quote_number = await generate_quote_number(db)

    # Build items and calculate subtotal from them
    items = []
    items_subtotal = 0.0
    if data.items:
        for idx, item_data in enumerate(data.items):
            item_total = round(item_data.quantity * item_data.unit_price, 2)
            item = QuoteItem(
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                total=item_total,
                item_type=item_data.item_type,
                sort_order=item_data.sort_order if item_data.sort_order else idx,
            )
            items.append(item)
            items_subtotal += item_total

    # Use explicit labour_cost/parts_cost as fallback when no items provided
    if not items:
        labour_cost = data.labour_cost
        parts_cost = data.parts_cost
    else:
        labour_cost = sum(i.total for i in items if i.item_type == "labour")
        parts_cost = sum(i.total for i in items if i.item_type != "labour")

    _, gst_amount, total_amount = _calculate_quote_totals(labour_cost, parts_cost)

    quote = Quote(
        quote_number=quote_number,
        repair_id=data.repair_id,
        labour_cost=labour_cost,
        parts_cost=parts_cost,
        gst_amount=gst_amount,
        total_amount=total_amount,
        description=data.description,
        status=QuoteStatus.DRAFT,
        created_by=user_id,
        valid_until=data.valid_until,
    )
    db.add(quote)
    await db.flush()
    await db.refresh(quote)

    for item in items:
        item.quote_id = quote.id
        db.add(item)

    await db.flush()

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Quote).options(selectinload(Quote.items)).where(Quote.id == quote.id)
    )
    return result.scalar_one()


async def update_quote(
    quote_id: UUID, data: "QuoteUpdate", db: AsyncSession, user_id: UUID
) -> Quote:
    quote = await get_quote_or_404(db, quote_id)

    if quote.status not in (QuoteStatus.DRAFT, QuoteStatus.SENT):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot update quote in '{quote.status.value}' status",
        )

    update_data = data.model_dump(exclude_unset=True)

    # Track whether cost fields are being updated
    labour_cost = update_data.get("labour_cost", quote.labour_cost)
    parts_cost = update_data.get("parts_cost", quote.parts_cost)
    _, gst_amount, total_amount = _calculate_quote_totals(labour_cost, parts_cost)

    update_data["gst_amount"] = gst_amount
    update_data["total_amount"] = total_amount

    for field, value in update_data.items():
        if field == "status":
            setattr(quote, field, QuoteStatus(value))
        else:
            setattr(quote, field, value)

    quote.created_by = user_id

    await db.flush()

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Quote).options(selectinload(Quote.items)).where(Quote.id == quote.id)
    )
    return result.scalar_one()


async def approve_quote(
    quote_id: UUID,
    data: "QuoteApprovalRequest",
    db: AsyncSession,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> QuoteApproval:
    quote = await get_quote_or_404(db, quote_id)

    if quote.status == QuoteStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quote has already been approved",
        )

    if quote.status == QuoteStatus.DECLINED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quote has already been declined",
        )

    if quote.status not in (QuoteStatus.SENT, QuoteStatus.DRAFT):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot approve/decline quote in '{quote.status.value}' status",
        )

    quote.status = QuoteStatus.APPROVED

    approval = QuoteApproval(
        quote_id=quote.id,
        action="approve",
        ip_address=ip_address,
        user_agent=user_agent,
        digital_signature=data.digital_signature,
        notes=data.notes,
    )
    db.add(approval)
    await db.flush()
    await db.refresh(approval)

    from services.notification_service import notify_quote_approved
    from models.repair import Repair
    repair_result = await db.execute(
        select(Repair).where(Repair.id == quote.repair_id)
    )
    repair = repair_result.scalar_one_or_none()
    await notify_quote_approved(db, quote, repair)

    return approval


async def decline_quote(
    quote_id: UUID,
    data: "QuoteApprovalRequest",
    db: AsyncSession,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> QuoteApproval:
    quote = await get_quote_or_404(db, quote_id)

    if quote.status == QuoteStatus.DECLINED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quote has already been declined",
        )

    if quote.status == QuoteStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quote has already been approved",
        )

    if quote.status not in (QuoteStatus.SENT, QuoteStatus.DRAFT):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot approve/decline quote in '{quote.status.value}' status",
        )

    quote.status = QuoteStatus.DECLINED

    approval = QuoteApproval(
        quote_id=quote.id,
        action="decline",
        ip_address=ip_address,
        user_agent=user_agent,
        notes=data.notes,
    )
    db.add(approval)
    await db.flush()
    await db.refresh(approval)

    from services.notification_service import notify_quote_declined
    from models.repair import Repair
    repair_result = await db.execute(
        select(Repair).where(Repair.id == quote.repair_id)
    )
    repair = repair_result.scalar_one_or_none()
    await notify_quote_declined(db, quote, repair)

    return approval


async def send_quote(quote_id: UUID, db: AsyncSession, user_id: UUID) -> Quote:
    quote = await get_quote_or_404(db, quote_id)

    if quote.status not in (QuoteStatus.DRAFT, QuoteStatus.SENT):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot send quote in '{quote.status.value}' status",
        )

    quote.status = QuoteStatus.SENT
    quote.created_by = user_id

    await db.flush()

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Quote).options(selectinload(Quote.items)).where(Quote.id == quote.id)
    )
    quote = result.scalar_one()

    from services.notification_service import notify_quote_sent
    from models.repair import Repair
    repair_result = await db.execute(
        select(Repair).where(Repair.id == quote.repair_id)
    )
    repair = repair_result.scalar_one_or_none()
    await notify_quote_sent(db, quote, repair)

    return quote


async def convert_quote_to_invoice(
    quote_id: UUID, db: AsyncSession, user_id: UUID
) -> "Invoice":
    from services.invoice_service import create_invoice, generate_invoice_number
    from schemas.invoice import InvoiceCreate, InvoiceItemCreate

    quote = await get_quote_or_404(db, quote_id)

    if quote.status == QuoteStatus.DECLINED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot convert a declined quote to an invoice",
        )

    # Build invoice items from quote items, or fall back to labour/parts cost
    if quote.items:
        items = [
            InvoiceItemCreate(
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total=item.total,
                item_type=item.item_type,
                sort_order=item.sort_order,
            )
            for item in quote.items
        ]
    else:
        items = []
        if quote.labour_cost > 0:
            items.append(InvoiceItemCreate(
                description="Labour",
                quantity=1,
                unit_price=quote.labour_cost,
                total=quote.labour_cost,
                item_type="labour",
                sort_order=0,
            ))
        if quote.parts_cost > 0:
            items.append(InvoiceItemCreate(
                description="Parts",
                quantity=1,
                unit_price=quote.parts_cost,
                total=quote.parts_cost,
                item_type="parts",
                sort_order=1,
            ))

    invoice_data = InvoiceCreate(
        repair_id=quote.repair_id,
        quote_id=quote.id,
        subtotal=quote.labour_cost + quote.parts_cost,
        gst_amount=quote.gst_amount,
        total_amount=quote.total_amount,
        items=items,
    )

    invoice = await create_invoice(invoice_data, db, user_id)
    return invoice


async def generate_quote_pdf(quote_id: UUID, db: AsyncSession) -> bytes:
    from services.pdf_service import generate_quote_pdf_content

    quote = await get_quote_or_404(db, quote_id)

    # Load related data
    from sqlalchemy import select
    from models.repair import Repair
    from models.customer import Customer
    from models.device import Device

    repair_result = await db.execute(
        select(Repair).where(Repair.id == quote.repair_id)
    )
    repair = repair_result.scalar_one_or_none()

    customer_result = await db.execute(
        select(Customer).where(Customer.id == repair.customer_id if repair else None)
    )
    customer = customer_result.scalar_one_or_none()

    device_result = await db.execute(
        select(Device).where(Device.id == repair.device_id if repair else None)
    )
    device = device_result.scalar_one_or_none()

    # Build items list
    items = []
    for item in sorted(quote.items, key=lambda i: i.sort_order):
        items.append({
            "description": item.description,
            "quantity": float(item.quantity),
            "unit_price": float(item.unit_price),
            "total": float(item.total),
            "item_type": item.item_type,
        })

    subtotal = float(quote.labour_cost) + float(quote.parts_cost)

    return generate_quote_pdf_content(
        quote_number=quote.quote_number,
        quote_date=quote.created_at.isoformat() if quote.created_at else "",
        valid_until=quote.valid_until.isoformat() if quote.valid_until else None,
        status=quote.status.value,
        customer_name=customer.name if customer else "Unknown",
        customer_phone=customer.phone if customer else "",
        customer_email=customer.email if customer else "",
        customer_address=customer.address if customer else None,
        device_type=device.device_type if device else "",
        device_brand=device.brand if device else "",
        device_model=device.model if device else "",
        repair_ticket=repair.ticket_number if repair else "",
        items=items,
        subtotal=subtotal,
        gst_amount=float(quote.gst_amount),
        total_amount=float(quote.total_amount),
        description=quote.description,
    )
