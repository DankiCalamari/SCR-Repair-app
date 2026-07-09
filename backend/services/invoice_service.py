import random
from uuid import UUID
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from models.invoice import Invoice, InvoiceItem, InvoiceStatus


GST_RATE = 0.10


async def generate_invoice_number(db: AsyncSession) -> str:
    for _ in range(10):
        number = random.randint(10000, 99999)
        invoice_num = f"INV-{number}"
        result = await db.execute(
            select(Invoice).where(Invoice.invoice_number == invoice_num)
        )
        if result.scalar_one_or_none() is None:
            return invoice_num
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to generate a unique invoice number",
    )


async def get_invoice_or_404(db: AsyncSession, invoice_id: UUID) -> Invoice:
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.items))
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    return invoice


async def list_invoices(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    status: str | None = None,
) -> tuple[list[Invoice], int]:
    query = select(Invoice).options(selectinload(Invoice.items))
    count_query = select(func.count(Invoice.id))

    filters = []
    if status:
        filters.append(Invoice.status == status)

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    query = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    invoices = list(result.scalars().all())

    return invoices, total


def _calculate_invoice_totals(subtotal: float) -> tuple[float, float]:
    gst_amount = round(subtotal * GST_RATE, 2)
    total_amount = round(subtotal + gst_amount, 2)
    return gst_amount, total_amount


async def create_invoice(
    data: "InvoiceCreate", db: AsyncSession, user_id: UUID
) -> Invoice:
    invoice_number = await generate_invoice_number(db)

    # Calculate subtotal from items if provided, otherwise use data.subtotal
    items = []
    if data.items:
        subtotal = 0
        for idx, item_data in enumerate(data.items):
            item_total = round(item_data.quantity * item_data.unit_price, 2)
            item = InvoiceItem(
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                total=item_total,
                item_type=item_data.item_type,
                sort_order=item_data.sort_order if item_data.sort_order else idx,
            )
            items.append(item)
            subtotal += item_total
    else:
        subtotal = data.subtotal

    gst_amount, total_amount = _calculate_invoice_totals(subtotal)

    invoice = Invoice(
        invoice_number=invoice_number,
        repair_id=data.repair_id,
        quote_id=data.quote_id,
        subtotal=subtotal,
        gst_amount=gst_amount,
        total_amount=total_amount,
        status=InvoiceStatus.DRAFT,
        due_date=data.due_date,
        notes=data.notes,
        created_by=user_id,
    )
    db.add(invoice)
    await db.flush()
    await db.refresh(invoice)

    for item in items:
        item.invoice_id = invoice.id
        db.add(item)

    await db.flush()

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Invoice).options(selectinload(Invoice.items)).where(Invoice.id == invoice.id)
    )
    return result.scalar_one()


async def update_invoice(
    invoice_id: UUID, data: "InvoiceUpdate", db: AsyncSession, user_id: UUID
) -> Invoice:
    invoice = await get_invoice_or_404(db, invoice_id)

    if invoice.status not in (InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.FINALISED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot update invoice in '{invoice.status.value}' status",
        )

    update_data = data.model_dump(exclude_unset=True)

    new_status = update_data.pop("status", None)

    for field, value in update_data.items():
        setattr(invoice, field, value)

    # Recalculate GST and total if subtotal was changed
    if "subtotal" in update_data:
        gst_amount, total_amount = _calculate_invoice_totals(invoice.subtotal)
        invoice.gst_amount = gst_amount
        invoice.total_amount = total_amount

    if new_status is not None:
        invoice.status = InvoiceStatus(new_status)

    invoice.created_by = user_id

    # Auto-sync to Hnry when invoice is finalised
    if new_status == InvoiceStatus.FINALISED.value:
        from services.integration_service import execute_sync, IntegrationProvider, get_integration_settings
        integration = await get_integration_settings(db, IntegrationProvider.HNTRY)
        if integration and integration.is_enabled and integration.webhook_url:
            # Build payload for Hnry
            payload = {
                "invoiceNumber": invoice.invoice_number,
                "invoiceDate": invoice.created_at.isoformat() if invoice.created_at else None,
                "dueDate": invoice.due_date.isoformat() if invoice.due_date else None,
                "customer": {
                    "id": str(invoice.repair.customer_id) if invoice.repair else None,
                },
                "subtotal": float(invoice.subtotal),
                "gst": float(invoice.gst_amount),
                "total": float(invoice.total_amount),
                "currency": "AUD",
                "lineItems": [
                    {
                        "description": item.description,
                        "quantity": float(item.quantity),
                        "unitPrice": float(item.unit_price),
                        "total": float(item.total),
                        "type": item.item_type
                    }
                    for item in invoice.items
                ]
            }
            # Execute sync in background (don't wait for result)
            import asyncio
            asyncio.create_task(
                execute_sync(
                    db, IntegrationProvider.HNTRY, "invoice", invoice_id,
                    "create_invoice", payload, f"invoice-{invoice_id}"
                )
            )

    await db.flush()

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.items), selectinload(Invoice.repair))
        .where(Invoice.id == invoice.id)
    )
    return result.scalar_one()


async def mark_invoice_paid(
    invoice_id: UUID, paid_amount: float, db: AsyncSession
) -> Invoice:
    invoice = await get_invoice_or_404(db, invoice_id)

    if invoice.status == InvoiceStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invoice is already marked as paid",
        )

    if invoice.status == InvoiceStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot mark a cancelled invoice as paid",
        )

    invoice.status = InvoiceStatus.PAID
    invoice.paid_date = datetime.utcnow()
    invoice.paid_amount = paid_amount

    await db.flush()

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Invoice).options(selectinload(Invoice.items)).where(Invoice.id == invoice.id)
    )
    invoice = result.scalar_one()

    from services.notification_service import notify_invoice_paid
    from models.repair import Repair
    repair_result = await db.execute(
        select(Repair).where(Repair.id == invoice.repair_id)
    )
    repair = repair_result.scalar_one_or_none()
    await notify_invoice_paid(db, invoice, repair)

    return invoice


async def send_invoice(invoice_id: UUID, db: AsyncSession, user_id: UUID) -> Invoice:
    invoice = await get_invoice_or_404(db, invoice_id)

    if invoice.status not in (InvoiceStatus.DRAFT, InvoiceStatus.SENT):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot send invoice in '{invoice.status.value}' status",
        )

    invoice.status = InvoiceStatus.SENT
    invoice.created_by = user_id

    await db.flush()

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Invoice).options(selectinload(Invoice.items)).where(Invoice.id == invoice.id)
    )
    return result.scalar_one()


async def generate_invoice_pdf(invoice_id: UUID, db: AsyncSession) -> bytes:
    from services.pdf_service import generate_invoice_pdf_content

    invoice = await get_invoice_or_404(db, invoice_id)

    # Load related data
    from sqlalchemy import select
    from models.repair import Repair
    from models.customer import Customer

    repair_result = await db.execute(
        select(Repair).where(Repair.id == invoice.repair_id)
    )
    repair = repair_result.scalar_one_or_none()

    customer_result = await db.execute(
        select(Customer).where(Customer.id == repair.customer_id if repair else None)
    )
    customer = customer_result.scalar_one_or_none()

    # Build items list
    items = []
    for item in sorted(invoice.items, key=lambda i: i.sort_order):
        items.append({
            "description": item.description,
            "quantity": float(item.quantity),
            "unit_price": float(item.unit_price),
            "total": float(item.total),
            "item_type": item.item_type,
        })

    return generate_invoice_pdf_content(
        invoice_number=invoice.invoice_number,
        invoice_date=invoice.created_at.isoformat() if invoice.created_at else "",
        due_date=invoice.due_date.isoformat() if invoice.due_date else None,
        status=invoice.status.value,
        customer_name=customer.name if customer else "Unknown",
        customer_phone=customer.phone if customer else "",
        customer_email=customer.email if customer else "",
        customer_address=customer.address if customer else None,
        repair_ticket=repair.ticket_number if repair else "",
        items=items,
        subtotal=float(invoice.subtotal),
        gst_amount=float(invoice.gst_amount),
        total_amount=float(invoice.total_amount),
        paid_amount=float(invoice.paid_amount) if invoice.paid_amount else None,
        notes=invoice.notes,
    )
