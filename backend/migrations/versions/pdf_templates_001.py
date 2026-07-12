"""Create pdf_templates table for customizable PDF generation.

Revision ID: pdf_templates_001
"""

from alembic import op
import sqlalchemy as sa

revision = "pdf_templates_001"
down_revision = "templates_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pdf_templates",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), unique=True, nullable=False),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("primary_color", sa.String(7), nullable=True),
        sa.Column("accent_color", sa.String(7), nullable=True),
        sa.Column("text_color", sa.String(7), nullable=True),
        sa.Column("header_text", sa.Text, nullable=True),
        sa.Column("footer_text", sa.Text, nullable=True),
        sa.Column("show_logo", sa.Boolean, default=True),
        sa.Column("logo_url", sa.String(255), nullable=True),
        sa.Column("page_margin_mm", sa.Integer, default=15),
        sa.Column("font_family", sa.String(50), default="Helvetica"),
        sa.Column("custom_fields", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), server_onupdate=sa.text("now()")),
    )
    op.create_index("idx_pdf_templates_name", "pdf_templates", ["name"])


def downgrade() -> None:
    op.drop_index("idx_pdf_templates_name", table_name="pdf_templates")
    op.drop_table("pdf_templates")