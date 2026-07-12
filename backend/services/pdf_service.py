"""PDF generation service using reportlab."""

import io
from datetime import datetime
from decimal import Decimal
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)

from config import settings
from models.pdf_template import PdfTemplate

# ─── Default Colours ─────────────────────────────────────────────────────────────────
BRAND_PRIMARY = colors.HexColor("#1a1a2e")
BRAND_ACCENT = colors.HexColor("#e94560")
BRAND_SUBTLE = colors.HexColor("#f5f5f5")
TEXT_DARK = colors.HexColor("#333333")
TEXT_MID = colors.HexColor("#666666")
TEXT_LIGHT = colors.HexColor("#999999")
BORDER_COLOR = colors.HexColor("#e0e0e0")
WHITE = colors.white

# ─── Styles ──────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "SCR_Title", parent=styles["Title"], fontSize=24, textColor=BRAND_PRIMARY,
    spaceAfter=4, leading=28,
)
subtitle_style = ParagraphStyle(
    "SCR_Subtitle", parent=styles["Normal"], fontSize=10, textColor=TEXT_MID,
    spaceAfter=2,
)
h1_style = ParagraphStyle(
    "SCR_H1", parent=styles["Heading1"], fontSize=14, textColor=BRAND_PRIMARY,
    spaceBefore=12, spaceAfter=6, leading=18,
)
h2_style = ParagraphStyle(
    "SCR_H2", parent=styles["Heading2"], fontSize=11, textColor=BRAND_PRIMARY,
    spaceBefore=8, spaceAfter=4, leading=14,
)
normal_style = ParagraphStyle(
    "SCR_Normal", parent=styles["Normal"], fontSize=9, textColor=TEXT_DARK,
    leading=13,
)


def _fmt_currency(value) -> str:
    """Format a number as AUD currency."""
    try:
        return f"${float(value):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def _fmt_date(value) -> str:
    """Format a date for display."""
    if not value:
        return "—"
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return value
    if isinstance(value, datetime):
        return value.strftime("%d %b %Y")
    return str(value)


def _header_table(doc_type: str, doc_number: str, date_str: str) -> Table:
    """Build the top header with company info and doc details."""
    company_data = [
        [Paragraph(f"<b>{settings.APP_NAME}</b>", title_style)],
        [Paragraph(settings.SMTP_FROM_EMAIL or "repairs@sunsetcountry.com.au", subtitle_style)],
    ]

    doc_data = [
        [Paragraph(f"<b>{doc_type}</b>", ParagraphStyle(
            "DocType", fontSize=16, textColor=BRAND_ACCENT, alignment=2, leading=20
        ))],
        [Paragraph(f"<b>{doc_number}</b>", ParagraphStyle(
            "DocNum", fontSize=11, textColor=TEXT_DARK, alignment=2, leading=14
        ))],
        [Paragraph(date_str, ParagraphStyle(
            "DocDate", fontSize=9, textColor=TEXT_MID, alignment=2, leading=12
        ))],
    ]

    return Table(
        [[company_data, doc_data]],
        colWidths=[120 * mm, 60 * mm],
    )


def _section_divider() -> HRFlowable:
    return HRFlowable(
        thickness=0.5, color=BORDER_COLOR, spaceBefore=6, spaceAfter=6, width="100%"
    )


def _address_block(label: str, heading: str, phone: str, email: str) -> list:
    """Return flowables for an address block."""
    items = [
        Paragraph(f"<b>{label}</b>", h2_style),
        Paragraph(heading, ParagraphStyle(
            "AddrName", fontSize=10, textColor=TEXT_DARK, leading=13
        )),
    ]
    if phone:
        items.append(Paragraph(f"Ph: {phone}", normal_style))
    if email:
        items.append(Paragraph(f"Email: {email}", normal_style))
    return items


def _items_table(headers: list[str], rows: list[list[str]], col_widths: list[float], totals: list[tuple[str, str]] | None = None) -> Table:
    """Build a styled items table with optional totals rows."""
    table_data = [headers] + rows

    # Add totals rows
    if totals:
        # blank separator row
        table_data.append([""] * len(headers))
        for label, value in totals:
            row = [""] * len(headers)
            row[-2] = label
            row[-1] = value
            table_data.append(row)

    style_commands = [
        # Header
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("LEFTPADDING", (0, 0), (-1, 0), 8),
        ("RIGHTPADDING", (0, 0), (-1, 0), 8),
        # Body
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("TEXTCOLOR", (0, 1), (-1, -1), TEXT_DARK),
        ("TOPPADDING", (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        ("LEFTPADDING", (0, 1), (-1, -1), 8),
        ("RIGHTPADDING", (0, 1), (-1, -1), 8),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        # Grid
        ("LINEBELOW", (0, 0), (-1, 0), 0, BRAND_PRIMARY),
        ("LINEBELOW", (0, -len(totals or [])-1), (-1, -len(totals or [])-1), 1, BORDER_COLOR),
        ("LINEBELOW", (0, -1), (-1, -1), 2, BRAND_PRIMARY),
    ]

    # Alternating row backgrounds
    data_end = len(rows) + 1
    for i in range(1, data_end, 2):
        style_commands.append(("BACKGROUND", (0, i), (-1, i), BRAND_SUBTLE))

    # Bold totals rows
    if totals:
        for j in range(len(totals)):
            row_idx = data_end + 1 + j
            style_commands.append(("FONTNAME", (-2, row_idx), (-1, row_idx), "Helvetica-Bold"))
            style_commands.append(("FONTSIZE", (-2, row_idx), (-1, row_idx), 9))
            if j == len(totals) - 1:
                style_commands.append(("TEXTCOLOR", (-2, row_idx), (-1, row_idx), BRAND_PRIMARY))
                style_commands.append(("FONTSIZE", (-2, row_idx), (-1, row_idx), 10))

    table = Table(table_data, colWidths=col_widths)
    table.setStyle(TableStyle(style_commands))
    return table


def generate_quote_pdf_content(
    quote_number: str,
    quote_date: str,
    valid_until: str | None,
    status: str,
    customer_name: str,
    customer_phone: str,
    customer_email: str,
    customer_address: str | None,
    device_type: str,
    device_brand: str,
    device_model: str,
    repair_ticket: str,
    items: list[dict],
    subtotal: float,
    gst_amount: float,
    total_amount: float,
    description: str | None = None,
) -> bytes:
    """Generate a Quote PDF and return as bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=15 * mm, bottomMargin=15 * mm,
    )

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(_header_table("QUOTE", quote_number, f"Issued: {_fmt_date(quote_date)}"))
    story.append(_section_divider())

    # ── Customer & Device Info ────────────────────────────────────────────────
    cust_items = [Paragraph("<b>Bill To</b>", h2_style)]
    cust_items.append(Paragraph(customer_name, ParagraphStyle(
        "CustName", fontSize=10, textColor=TEXT_DARK, leading=13
    )))
    if customer_phone:
        cust_items.append(Paragraph(f"Ph: {customer_phone}", normal_style))
    if customer_email:
        cust_items.append(Paragraph(f"Email: {customer_email}", normal_style))
    if customer_address:
        cust_items.append(Paragraph(customer_address, normal_style))

    dev_items = [Paragraph("<b>Device</b>", h2_style)]
    dev_items.append(Paragraph(f"{device_brand} {device_model}", ParagraphStyle(
        "DevModel", fontSize=10, textColor=TEXT_DARK, leading=13
    )))
    dev_items.append(Paragraph(f"Type: {device_type}", normal_style))
    dev_items.append(Paragraph(f"Repair: {repair_ticket}", normal_style))

    info_table = Table(
        [cust_items, dev_items],
        colWidths=[90 * mm, 85 * mm],
    )
    info_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 6 * mm))

    # ── Validity ──────────────────────────────────────────────────────────────
    if valid_until:
        story.append(Paragraph(
            f"<b>Valid until:</b> {_fmt_date(valid_until)}",
            ParagraphStyle("Valid", fontSize=10, textColor=BRAND_ACCENT, leading=13),
        ))
        story.append(Spacer(1, 3 * mm))

    # ── Description ────────────────────────────────────────────────────────────
    if description:
        story.append(Paragraph(description, normal_style))
        story.append(Spacer(1, 3 * mm))

    story.append(_section_divider())

    # ── Items Table ────────────────────────────────────────────────────────────
    headers = ["Description", "Type", "Qty", "Unit Price", "Total"]
    col_widths = [75 * mm, 25 * mm, 18 * mm, 28 * mm, 29 * mm]

    rows = []
    for item in items:
        rows.append([
            item["description"],
            str(item["item_type"]).capitalize(),
            str(item["quantity"]),
            _fmt_currency(item["unit_price"]),
            _fmt_currency(item["total"]),
        ])

    totals = [
        ("Subtotal", _fmt_currency(subtotal)),
        ("GST (10%)", _fmt_currency(gst_amount)),
        ("<b>Total</b>", f"<b>{_fmt_currency(total_amount)}</b>"),
    ]

    story.append(_items_table(headers, rows, col_widths, totals))
    story.append(Spacer(1, 8 * mm))

    # ── Footer / Notes ────────────────────────────────────────────────────────
    if status:
        story.append(Paragraph(
            f"Quote status: <b>{status.upper()}</b>",
            ParagraphStyle(
                "Status", fontSize=9, textColor=TEXT_MID, alignment=0, leading=12
            ),
        ))

    story.append(Spacer(1, 10 * mm))
    story.append(_section_divider())
    story.append(Paragraph(
        "Thank you for choosing Sunset Country Repairs. If you have any questions about this quote, please contact us.",
        ParagraphStyle("Footer", fontSize=8, textColor=TEXT_LIGHT, leading=11, alignment=1),
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()


def generate_invoice_pdf_content(
    invoice_number: str,
    invoice_date: str,
    due_date: str | None,
    status: str,
    customer_name: str,
    customer_phone: str,
    customer_email: str,
    customer_address: str | None,
    repair_ticket: str,
    items: list[dict],
    subtotal: float,
    gst_amount: float,
    total_amount: float,
    paid_amount: float | None,
    notes: str | None = None,
) -> bytes:
    """Generate an Invoice PDF and return as bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=15 * mm, bottomMargin=15 * mm,
    )

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(_header_table("INVOICE", invoice_number, f"Issued: {_fmt_date(invoice_date)}"))
    story.append(_section_divider())

    # ── Customer & Repair Info ────────────────────────────────────────────────
    cust_items = [Paragraph("<b>Bill To</b>", h2_style)]
    cust_items.append(Paragraph(customer_name, ParagraphStyle(
        "CustName", fontSize=10, textColor=TEXT_DARK, leading=13
    )))
    if customer_phone:
        cust_items.append(Paragraph(f"Ph: {customer_phone}", normal_style))
    if customer_email:
        cust_items.append(Paragraph(f"Email: {customer_email}", normal_style))
    if customer_address:
        cust_items.append(Paragraph(customer_address, normal_style))

    rep_items = [Paragraph("<b>Repair</b>", h2_style)]
    rep_items.append(Paragraph(f"Ticket: {repair_ticket}", normal_style))
    if due_date:
        rep_items.append(Paragraph(f"Due: {_fmt_date(due_date)}", ParagraphStyle(
            "DueDate", fontSize=10, textColor=BRAND_ACCENT, leading=13,
        )))

    info_table = Table(
        [cust_items, rep_items],
        colWidths=[95 * mm, 80 * mm],
    )
    info_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 6 * mm))
    story.append(_section_divider())

    # ── Items Table ────────────────────────────────────────────────────────────
    headers = ["Description", "Type", "Qty", "Unit Price", "Total"]
    col_widths = [75 * mm, 25 * mm, 18 * mm, 28 * mm, 29 * mm]

    rows = []
    for item in items:
        rows.append([
            item["description"],
            str(item["item_type"]).capitalize(),
            str(item["quantity"]),
            _fmt_currency(item["unit_price"]),
            _fmt_currency(item["total"]),
        ])

    total_rows = [
        ("Subtotal", _fmt_currency(subtotal)),
        ("GST (10%)", _fmt_currency(gst_amount)),
        ("<b>Total</b>", f"<b>{_fmt_currency(total_amount)}</b>"),
    ]
    if paid_amount and paid_amount > 0:
        total_rows.append(("Paid", _fmt_currency(paid_amount)))
        balance = total_amount - paid_amount
        total_rows.append(("<b>Balance Due</b>", f"<b>{_fmt_currency(balance)}</b>"))

    story.append(_items_table(headers, rows, col_widths, total_rows))
    story.append(Spacer(1, 8 * mm))

    # ── Notes ─────────────────────────────────────────────────────────────────
    if notes:
        story.append(Paragraph("<b>Notes</b>", h2_style))
        story.append(Paragraph(notes, normal_style))
        story.append(Spacer(1, 4 * mm))

    # ── Status ────────────────────────────────────────────────────────────────
    if status:
        colour = BRAND_ACCENT if status in ("overdue", "cancelled") else (
            colors.HexColor("#2ecc71") if status == "paid" else TEXT_MID
        )
        story.append(Paragraph(
            f"Invoice status: <b>{status.upper()}</b>",
            ParagraphStyle("Status", fontSize=9, textColor=colour, leading=12),
        ))

    story.append(Spacer(1, 10 * mm))
    story.append(_section_divider())
    story.append(Paragraph(
        "Thank you for your business. Payment is due within the specified terms. "
        "Please contact you have any questions about this invoice.",
        ParagraphStyle("Footer", fontSize=8, textColor=TEXT_LIGHT, leading=11, alignment=1),
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()
