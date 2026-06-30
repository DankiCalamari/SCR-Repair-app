from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_staff
from models.user import User
from schemas.document import DocumentResponse, DocumentGenerateRequest
from services.document_service import (
    generate_intake_receipt,
    generate_quote_pdf,
    generate_invoice_pdf,
    generate_collection_receipt,
    generate_warranty_receipt,
    get_document_or_404,
)
from services.storage_service import get_file

router = APIRouter()


@router.post("/generate/{document_type}", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def generate_document(
    document_type: str,
    repair_id: UUID = Query(...),
    quote_id: UUID | None = Query(None),
    invoice_id: UUID | None = Query(None),
    warranty_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    if document_type == "intake_receipt":
        document = await generate_intake_receipt(repair_id, db)
    elif document_type == "quote":
        if quote_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="quote_id is required for quote document generation",
            )
        document = await generate_quote_pdf(quote_id, db)
    elif document_type == "invoice":
        if invoice_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invoice_id is required for invoice document generation",
            )
        document = await generate_invoice_pdf(invoice_id, db)
    elif document_type == "collection_receipt":
        document = await generate_collection_receipt(repair_id, db)
    elif document_type == "warranty_receipt":
        if warranty_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="warranty_id is required for warranty receipt generation",
            )
        document = await generate_warranty_receipt(warranty_id, db)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type: {document_type}",
        )

    return document


@router.get("/{document_id}/download")
async def download_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    document = await get_document_or_404(db, document_id)
    file_data = await get_file(document.file_path)
    return Response(
        content=file_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{document.filename}"'
        },
    )


@router.get("/{document_id}/preview")
async def preview_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    document = await get_document_or_404(db, document_id)
    file_data = await get_file(document.file_path)
    return Response(
        content=file_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{document.filename}"'
        },
    )
