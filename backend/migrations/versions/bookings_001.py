"""create bookings table

Revision ID: bookings_001
Revises: 
Create Date: 2024-01-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "bookings_001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types
    op.execute("CREATE TYPE bookingtype AS ENUM ('pickup', 'dropoff')")
    op.execute("CREATE TYPE bookingstatus AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show')")
    
    # Create bookings table
    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("repair_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("repairs.id"), nullable=True),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("booking_type", sa.Enum(name="bookingtype"), nullable=False),
        sa.Column("status", sa.Enum(name="bookingstatus"), nullable=False, server_default="scheduled"),
        sa.Column("scheduled_at", sa.DateTime(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    
    # Create indexes
    op.create_index("idx_bookings_scheduled_at", "bookings", ["scheduled_at"])
    op.create_index("idx_bookings_customer_id", "bookings", ["customer_id"])
    op.create_index("idx_bookings_repair_id", "bookings", ["repair_id"])


def downgrade():
    op.drop_table("bookings")
    op.execute("DROP TYPE bookingtype")
    op.execute("DROP TYPE bookingstatus")