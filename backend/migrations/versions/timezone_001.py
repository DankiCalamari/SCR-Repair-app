"""Add timezone setting and updated_at to photos.

Revision ID: timezone_001
"""

from alembic import op
import sqlalchemy as sa

revision = "timezone_001"
down_revision = "pdf_templates_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add timezone setting
    op.execute("""
        INSERT INTO system_settings (id, key, value, description, updated_at)
        VALUES (gen_random_uuid(), 'timezone', 'Australia/Melbourne', 'Business timezone for timestamps', now())
        ON CONFLICT (key) DO NOTHING
    """)
    
    # Add updated_at column to photos
    op.add_column('photos', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), server_onupdate=sa.text('now()'), nullable=False))


def downgrade() -> None:
    # Remove timezone setting
    op.execute("DELETE FROM system_settings WHERE key = 'timezone'")
    
    # Remove updated_at column from photos
    op.drop_column('photos', 'updated_at')