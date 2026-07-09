"""Add integration tables for Hnry and other accounting platforms

Revision ID: 20240101000000
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20240101000000'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create integration_settings table
    op.create_table('integration_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('provider', sa.Enum('hnry', 'xero', 'myob', 'quickbooks', name='integrationprovider'), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('webhook_url', sa.String(length=2000), nullable=True),
        sa.Column('secret_token', sa.String(length=2000), nullable=True),
        sa.Column('last_sync_success', sa.DateTime(), nullable=True),
        sa.Column('last_sync_error', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('settings', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_integration_settings_provider', 'integration_settings', ['provider'], unique=False)

    # Create integration_sync_logs table
    op.create_table('integration_sync_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('provider', sa.Enum('hnry', 'xero', 'myob', 'quickbooks', name='integrationprovider'), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('webhook_url', sa.String(length=2000), nullable=False),
        sa.Column('payload', postgresql.JSONB(), nullable=False),
        sa.Column('response_status', sa.Integer(), nullable=True),
        sa.Column('response_body', sa.Text(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.Enum('pending', 'queued', 'syncing', 'synced', 'failed', name='syncstatus'), nullable=False, server_default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('idempotency_key', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_integration_sync_logs_provider', 'integration_sync_logs', ['provider'], unique=False)
    op.create_index('ix_integration_sync_logs_entity_id', 'integration_sync_logs', ['entity_id'], unique=False)
    op.create_index('ix_integration_sync_logs_idempotency_key', 'integration_sync_logs', ['idempotency_key'], unique=False)

    # Create customer_integration_sync table
    op.create_table('customer_integration_sync',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('provider', sa.Enum('hnry', 'xero', 'myob', 'quickbooks', name='integrationprovider'), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('external_id', sa.String(length=200), nullable=True),
        sa.Column('sync_status', sa.Enum('pending', 'queued', 'syncing', 'synced', 'failed', name='syncstatus'), nullable=False, server_default='pending'),
        sa.Column('last_sync_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_customer_integration_sync_provider', 'customer_integration_sync', ['provider'], unique=False)
    op.create_index('ix_customer_integration_sync_customer_id', 'customer_integration_sync', ['customer_id'], unique=False)


def downgrade() -> None:
    op.drop_table('customer_integration_sync')
    op.drop_table('integration_sync_logs')
    op.drop_table('integration_settings')
    op.drop_index('ix_integration_settings_provider', table_name='integration_settings')
    op.drop_index('ix_integration_sync_logs_provider', table_name='integration_sync_logs')
    op.drop_index('ix_integration_sync_logs_entity_id', table_name='integration_sync_logs')
    op.drop_index('ix_integration_sync_logs_idempotency_key', table_name='integration_sync_logs')
    op.drop_index('ix_customer_integration_sync_provider', table_name='customer_integration_sync')
    op.drop_index('ix_customer_integration_sync_customer_id', table_name='customer_integration_sync')
    sa.Enum('hnry', 'xero', 'myob', 'quickbooks', name='integrationprovider').drop(op.get_bind())
    sa.Enum('pending', 'queued', 'syncing', 'synced', 'failed', name='syncstatus').drop(op.get_bind())