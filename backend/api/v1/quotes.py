from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.deps import get_db, require_staff, get_current_active_user
from models.invoice import Invoice
from models.user import User
from schemas.invoice import InvoiceDetailResponse
from schemas.quote import (
    QuoteCreate,
    QuoteUpdate,
    QuoteResponse,
    QuoteApprovalRequest,
    QuoteApprovalResponse,
)
from services.quote_service import (
    approve_quote,
    convert_quote_to_invoice,
    create_quote,
    decline_quote,
    generate_quote_pdf,
    get_quote_or_404,
    list_quotes as list_quotes_service,
    send_quote,
    update_quote,
)

router = APIRouter()


@router.get("", response_model=dict)
async def list_quotes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: str | None = Query(None),
):
    quotes, total = await list_quotes_service(db, skip=skip, limit=limit, status=status)
    return {
        "data": [QuoteResponse.model_validate(q) for q in quotes],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def create_new_quote(
    data: QuoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    quote = await create_quote(data, db, current_user.id)
    return quote


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    quote = await get_quote_or_404(db, quote_id)
    return quote


@router.put("/{quote_id}", response_model=QuoteResponse)
async def update_existing_quote(
    quote_id: UUID,
    data: QuoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    quote = await update_quote(quote_id, data, db, current_user.id)
    return quote


@router.post("/{quote_id}/approve", response_model=QuoteApprovalResponse)
async def approve_quote_endpoint(
    quote_id: UUID,
    data: QuoteApprovalRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    approval = await approve_quote(
        quote_id, data, db, ip_address=ip_address, user_agent=user_agent
    )
    return approval


@router.post("/{quote_id}/decline", response_model=QuoteApprovalResponse)
async def decline_quote_endpoint(
    quote_id: UUID,
    data: QuoteApprovalRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    approval = await decline_quote(
        quote_id, data, db, ip_address=ip_address, user_agent=user_agent
    )
    return approval


@router.post("/{quote_id}/send", response_model=QuoteResponse)
async def send_quote_to_customer(
    quote_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    quote = await send_quote(quote_id, db, current_user.id)
    return quote


@router.post("/{quote_id}/convert-to-invoice", response_model=InvoiceDetailResponse)
async def convert_quote_to_invoice_endpoint(
    quote_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    invoice = await convert_quote_to_invoice(quote_id, db, current_user.id)
    # Eagerly load items for the response model
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.items))
        .where(Invoice.id == invoice.id)
    )
    return result.scalar_one()


@router.get("/{quote_id}/pdf")
async def download_quote_pdf(
    quote_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    quote = await get_quote_or_404(db, quote_id)
    pdf_content = await generate_quote_pdf(quote_id, db)
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="quote_{quote.quote_number}.pdf"'
        },
    )
