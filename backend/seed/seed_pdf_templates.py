"""
Seed PDF templates into an existing database.

Usage:
    python -m seed.seed_pdf_templates
"""

from __future__ import annotations

import asyncio
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from database import async_session_factory, init_db
from logging_config import configure as configure_logging, get_logger
from models.pdf_template import PdfTemplate

configure_logging()
logger = get_logger("seed")

PDF_TEMPLATES = [
    {
        "name": "quote",
        "display_name": "Repair Quote",
        "header_text": "Thank you for choosing Sunset Country Repairs",
        "footer_text": "This quote is valid until the expiry date shown.",
    },
    {
        "name": "invoice",
        "display_name": "Invoice",
        "header_text": "Invoice from Sunset Country Repairs",
        "footer_text": "Payment due within specified terms. Thank you for your business.",
    },
    {
        "name": "warranty_receipt",
        "display_name": "Warranty Receipt",
        "header_text": "Warranty Certificate",
        "footer_text": "Keep this certificate for your records.",
    },
    {
        "name": "intake_receipt",
        "display_name": "Intake Receipt",
        "header_text": "Device Intake Confirmation",
        "footer_text": "Thank you for bringing your device to us.",
    },
    {
        "name": "collection_receipt",
        "display_name": "Collection Receipt",
        "header_text": "Collection Receipt",
        "footer_text": "Thank you for choosing Sunset Country Repairs!",
    },
]


async def seed_pdf_templates() -> None:
    """Seed PDF templates into database."""
    logger.info("seed_pdf_templates_started")
    
    await init_db()
    
    async with async_session_factory() as session:
        for data in PDF_TEMPLATES:
            result = await session.execute(select(PdfTemplate).where(PdfTemplate.name == data["name"]))
            if result.scalar_one_or_none() is None:
                template = PdfTemplate(
                    id=uuid.uuid4(),
                    **data,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                session.add(template)
                logger.info("seed_pdf_template_created", name=data["name"])
        
        await session.commit()
    
    logger.info("seed_pdf_templates_completed")


if __name__ == "__main__":
    asyncio.run(seed_pdf_templates())