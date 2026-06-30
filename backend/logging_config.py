"""
Structured logging configuration using structlog.

Provides JSON formatting for production and coloured console output for
development.  Call ``configure()`` once at application startup – every
subsequent ``structlog.get_logger()`` call anywhere in the project will
return a correctly-configured logger.
"""

from __future__ import annotations

import logging
import sys
import uuid
from typing import Any

import structlog

from config import settings


def _add_app_context(
    _: Any, __: Any, event_dict: dict[str, Any]
) -> dict[str, Any]:
    """Inject the service name into every log entry."""
    event_dict["service"] = settings.APP_NAME
    event_dict["environment"] = settings.APP_ENV
    return event_dict


def _add_correlation_id(
    _: Any, __: Any, event_dict: dict[str, Any]
) -> dict[str, Any]:
    """Attach a correlation-id if one has been bound to the current context."""
    correlation_id = structlog.contextvars.get_contextvars().get("correlation_id")
    if correlation_id:
        event_dict["correlation_id"] = correlation_id
    return event_dict


def configure() -> None:
    """Initialise structlog and the stdlib ``logging`` module.

    * ``APP_ENV != "production"``  → coloured console output.
    * ``APP_ENV == "production"``  → JSON output suitable for log aggregation.
    """

    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        _add_app_context,
        _add_correlation_id,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    if settings.APP_ENV == "production":
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processor=renderer,
        foreign_pre_chain=shared_processors,
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

    # Silence noisy third-party loggers in production.
    for noisy in ("uvicorn.access", "sqlalchemy.engine"):
        logging.getLogger(noisy).setLevel(
            logging.WARNING if settings.APP_ENV == "production" else logging.DEBUG
        )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Return a structlog logger, optionally bound to *name*."""
    return structlog.get_logger(name)


def bind_correlation_id(correlation_id: str | None = None) -> str:
    """Bind a correlation-id to the current structlog context and return it."""
    cid = correlation_id or str(uuid.uuid4())
    structlog.contextvars.bind_contextvars(correlation_id=cid)
    return cid


def clear_context() -> None:
    """Clear all structlog context variables for the current execution."""
    structlog.contextvars.clear_contextvars()
