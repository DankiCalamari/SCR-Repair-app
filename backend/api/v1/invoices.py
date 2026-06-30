from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_staff, get_current_active_user
from models.user import User
from schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceDetailResponse,
    MarkPaidRequest,
)
from services.invoice_service import (
    create_invoice,
    generate_invoice_pdf,
    get_invoice_or_404,
    list_invoices as list_invoices_service,
    mark_invoice_paid,
    send_invoice,
    update_invoice,
)

router = APIRouter()


@router.get("", response_model=dict)
async def list_invoices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: str | None = Query(None),
):
    invoices, total = await list_invoices_service(db, skip=skip, limit=limit, status=status)
    return {
        "data": [InvoiceDetailResponse.model_validate(i) for i in invoices],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=InvoiceDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_new_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    invoice = await create_invoice(data, db, current_user.id)
    return invoice


@router.get("/{invoice_id}", response_model=InvoiceDetailResponse)
async def get_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    invoice = await get_invoice_or_404(db, invoice_id)
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceDetailResponse)
async def update_existing_invoice(
    invoice_id: UUID,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    invoice = await update_invoice(invoice_id, data, db, current_user.id)
    return invoice


@router.post("/{invoice_id}/send", response_model=InvoiceDetailResponse)
async def send_invoice_to_customer(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    invoice = await send_invoice(invoice_id, db, current_user.id)
    return invoice


@router.post("/{invoice_id}/mark-paid", response_model=InvoiceDetailResponse)
async def mark_invoice_as_paid(
    invoice_id: UUID,
    data: MarkPaidRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    invoice = await mark_invoice_paid(
        invoice_id, data.paid_amount, db
    )
    if data.notes:
        invoice.notes = (
            f"{invoice.notes}\nPayment note: {data.notes}"
            if invoice.notes
            else f"Payment note: {data.notes}"
        )
    if data.paid_date:
        invoice.paid_date = data.paid_date
    await db.flush()

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Invoice).options(selectinload(Invoice.items)).where(Invoice.id == invoice.id)
    )
    return result.scalar_one()


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    invoice = await get_invoice_or_404(db, invoice_id)
    pdf_content = await generate_invoice_pdf(invoice_id, db)
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="invoice_{invoice.invoice_number}.pdf"'
        },
    )
