"""
Alembic environment configuration.

Supports both offline (``--sql``) and online (live database) migration
modes using the async PostgreSQL engine defined in the application config.
"""

from __future__ import annotations

import asyncio
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

# Ensure the project root is on the package path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings
from database import Base

# Import every model so its metadata is registered
import models  # noqa: F401
from models.user import User  # noqa: F401
from models.customer import Customer  # noqa: F401
from models.device import Device  # noqa: F401
from models.repair import Repair, RepairStatusHistory  # noqa: F401
from models.photo import Photo  # noqa: F401
from models.document import Document  # noqa: F401
from models.quote import Quote, QuoteApproval  # noqa: F401
from models.invoice import Invoice, InvoiceItem  # noqa: F401
from models.sms import SmsMessage  # noqa: F401
from models.email import EmailMessage  # noqa: F401
from models.warranty import WarrantyRecord, WarrantyClaim  # noqa: F401
from models.lead import Lead  # noqa: F401
from models.audit_log import AuditLog  # noqa: F401
from models.system_setting import SystemSetting  # noqa: F401
from models.booking import Booking  # noqa: F401

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate support
target_metadata = Base.metadata

# Override sqlalchemy.url with the live application URL
config.set_main_option("sqlalchemy.url", settings.database_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (generates SQL scripts)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    """Callback that runs inside a transaction."""
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode using an async engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
