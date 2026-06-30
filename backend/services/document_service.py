import os
from datetime import datetime
from uuid import UUID

import qrcode
from io import BytesIO
from fastapi import HTTPException, status
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from weasyprint import HTML

from config import settings
from database import async_session_factory
from models.document import Document, DocumentType
from models.repair import Repair
from models.customer import Customer
from models.device import Device
from models.quote import Quote
from models.invoice import Invoice
from models.warranty import WarrantyRecord

# Set up Jinja2 templates
TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
jinja_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


def _generate_qr_code(url: str) -> bytes:
    """Generate a QR code PNG image for the given URL."""
    qr = qrcode.QRCode(version=1, box_size=4, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


async def _generate_pdf_from_template(
    template_name: str,
    context: dict,
    db: AsyncSession,
    document_type: DocumentType,
    repair_id: UUID | None,
    generated_by: UUID | None = None,
) -> Document:
    """Render an HTML template to PDF and store as a Document record."""
    template = jinja_env.get_template(template_name)
    context.setdefault("business_name", "Sunset Country Repairs")
    context.setdefault("generated_at", datetime.utcnow())
    html_content = template.render(**context)

    pdf_bytes = HTML(string=html_content, base_url=f"{settings.APP_URL}").write_pdf()

    # Save to storage
    filename = f"{document_type.value}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"

    class _FileWrapper:
        def __init__(self, data: bytes):
            self._data = data

        def read(self) -> bytes:
            return self._data

    from services.storage_service import save_file

    file_path = await save_file(
        _FileWrapper(pdf_bytes), filename, subfolder="documents"
    )

    document = Document(
        repair_id=repair_id,
        document_type=document_type,
        filename=filename,
        file_path=file_path,
        file_size=str(len(pdf_bytes)),
        generated_by=generated_by,
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)
    return document


async def _fetch_repair_context(db: AsyncSession, repair_id: UUID) -> dict:
    """Fetch all repair-related data for document templates."""
    repair_result = await db.execute(
        select(Repair).where(Repair.id == repair_id)
    )
    repair = repair_result.scalar_one_or_none()
    if repair is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repair not found",
        )

    customer_result = await db.execute(
        select(Customer).where(Customer.id == repair.customer_id)
    )
    customer = customer_result.scalar_one()

    device_result = await db.execute(
        select(Device).where(Device.id == repair.device_id)
    )
    device = device_result.scalar_one()

    # Generate QR code for portal link
    portal_url = f"{settings.APP_URL}/portal/repair/{repair.id}"
    qr_code = _generate_qr_code(portal_url)

    return {
        "repair": repair,
        "customer": customer,
        "device": device,
        "portal_url": portal_url,
        "qr_code_base64": __import__("base64").b64encode(qr_code).decode(),
    }


async def generate_intake_receipt(repair_id: UUID, db: AsyncSession) -> Document:
    context = await _fetch_repair_context(db, repair_id)
    return await _generate_pdf_from_template(
        "documents/intake_receipt.html",
        context,
        db,
        DocumentType.INTAKE_RECEIPT,
        repair_id=repair_id,
    )


async def generate_quote_pdf(quote_id: UUID, db: AsyncSession) -> Document:
    quote_result = await db.execute(
        select(Quote).where(Quote.id == quote_id)
    )
    quote = quote_result.scalar_one_or_none()
    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found",
        )

    context = await _fetch_repair_context(db, quote.repair_id)
    context["quote"] = quote
    return await _generate_pdf_from_template(
        "documents/quote.html",
        context,
        db,
        DocumentType.QUOTE,
        repair_id=quote.repair_id,
    )


async def generate_invoice_pdf(invoice_id: UUID, db: AsyncSession) -> Document:
    invoice_result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = invoice_result.scalar_one_or_none()
    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    context = await _fetch_repair_context(db, invoice.repair_id)
    context["invoice"] = invoice
    return await _generate_pdf_from_template(
        "documents/invoice.html",
        context,
        db,
        DocumentType.INVOICE,
        repair_id=invoice.repair_id,
    )


async def generate_collection_receipt(repair_id: UUID, db: AsyncSession) -> Document:
    context = await _fetch_repair_context(db, repair_id)
    return await _generate_pdf_from_template(
        "documents/collection_receipt.html",
        context,
        db,
        DocumentType.COLLECTION_RECEIPT,
        repair_id=repair_id,
    )


async def generate_warranty_receipt(warranty_id: UUID, db: AsyncSession) -> Document:
    warranty_result = await db.execute(
        select(WarrantyRecord).where(WarrantyRecord.id == warranty_id)
    )
    warranty = warranty_result.scalar_one_or_none()
    if warranty is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warranty not found",
        )

    context = await _fetch_repair_context(db, warranty.repair_id)
    context["warranty"] = warranty
    return await _generate_pdf_from_template(
        "documents/warranty_receipt.html",
        context,
        db,
        DocumentType.WARRANTY_RECEIPT,
        repair_id=warranty.repair_id,
    )


async def get_document_or_404(db: AsyncSession, document_id: UUID) -> Document:
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return document
