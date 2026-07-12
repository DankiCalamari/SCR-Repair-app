"""PDF template management API endpoints."""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, require_admin
from models.pdf_template import PdfTemplate
from schemas.pdf_template import PdfTemplateCreate, PdfTemplateUpdate, PdfTemplateResponse

router = APIRouter(prefix="/pdf-templates", tags=["pdf-templates"])


async def get_pdf_template(db: AsyncSession, name: str) -> PdfTemplate | None:
    result = await db.execute(select(PdfTemplate).where(PdfTemplate.name == name))
    return result.scalar_one_or_none()


@router.get("", response_model=list[PdfTemplateResponse])
async def list_pdf_templates(db: AsyncSession = Depends(get_db)) -> list[PdfTemplate]:
    """List all PDF templates."""
    result = await db.execute(select(PdfTemplate).order_by(PdfTemplate.name))
    return list(result.scalars().all())


@router.get("/{template_id}", response_model=PdfTemplateResponse)
async def get_pdf_template_by_id(template_id: UUID, db: AsyncSession = Depends(get_db)) -> PdfTemplate:
    """Get a specific PDF template by ID."""
    result = await db.execute(select(PdfTemplate).where(PdfTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="PDF template not found")
    return template


@router.post("", response_model=PdfTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_pdf_template(
    data: PdfTemplateCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
) -> PdfTemplate:
    """Create a new PDF template."""
    existing = await get_pdf_template(db, data.name)
    if existing:
        raise HTTPException(status_code=409, detail=f"PDF template '{data.name}' already exists")
    
    template = PdfTemplate(**data.model_dump())
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return template


@router.patch("/{template_id}", response_model=PdfTemplateResponse)
async def update_pdf_template(
    template_id: UUID,
    data: PdfTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
) -> PdfTemplate:
    """Update a PDF template."""
    template = await db.get(PdfTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="PDF template not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(template, field, value)
    
    await db.flush()
    await db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pdf_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
) -> None:
    """Delete a PDF template."""
    template = await db.get(PdfTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="PDF template not found")
    
    await db.delete(template)
    await db.flush()