"""
WebSocket log broadcaster for real-time log streaming.

Manages WebSocket connections and broadcasts log events to all connected clients.
Uses an async-safe approach to avoid blocking log operations.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from starlette.websockets import WebSocket


class LogBroadcaster:
    """
    Central broadcaster for log events to all connected WebSocket clients.
    
    Thread-safe using asyncio.Lock for connection management.
    """
    
    def __init__(self):
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)
        _log("websocket_log_client_connected", client_count=len(self._connections))
    
    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        async with self._lock:
            self._connections.discard(websocket)
        _log("websocket_log_client_disconnected", client_count=len(self._connections))
    
    async def broadcast(self, log_entry: dict[str, Any]) -> None:
        """Send a log entry to all connected clients."""
        if not self._connections:
            return
        
        # Get connections to send to (avoid modification during iteration)
        async with self._lock:
            connections = list(self._connections)
        
        # Send to each connection, removing dead ones
        dead_connections = []
        for websocket in connections:
            try:
                await websocket.send_json(log_entry)
            except Exception as e:
                _log("websocket_send_failed", error=str(e))
                dead_connections.append(websocket)
        
        # Clean up dead connections
        if dead_connections:
            async with self._lock:
                for ws in dead_connections:
                    self._connections.discard(ws)


# Global broadcaster instance
broadcaster = LogBroadcaster()


def format_log_entry(
    level: str,
    message: str,
    logger_name: str | None = None,
    **kwargs: Any
) -> dict[str, Any]:
    """Format a log entry for WebSocket transmission."""
    return {
        "type": "log",
        "timestamp": kwargs.pop("timestamp", None),
        "level": level,
        "message": message,
        "logger": logger_name,
        "data": kwargs,
    }


def _log(message: str, **kwargs: Any) -> None:
    """Internal logging helper that uses stdlib logging to avoid circular imports."""
    logging.getLogger(__name__).info(message, **kwargs)


# Create a custom logging handler that broadcasts to WebSocket
class WebSocketLogHandler(logging.Handler):
    """
    Custom handler that broadcasts log records to WebSocket clients.
    
    This extends logging.Handler to integrate with the standard Python logging.
    Note: This handler is added for fallback compatibility. The primary broadcast
    mechanism is via the structlog processor _broadcast_to_websocket.
    """
    
    def __init__(self, broadcaster: LogBroadcaster | None):
        super().__init__()
        self.broadcaster = broadcaster or broadcaster_global
    
    def emit(self, record: logging.LogRecord) -> None:
        """Emit a log record to all WebSocket clients."""
        from datetime import datetime
        
        log_entry = {
            "type": "log",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname.lower(),
            "level_name": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Try to add extra fields from structlog if present
        if hasattr(record, "__dict__"):
            for key in ("service", "environment", "correlation_id", "duration_ms"):
                if hasattr(record, key):
                    log_entry[key] = getattr(record, key)
        
        # Schedule broadcast without blocking
        try:
            loop = asyncio.get_running_loop()
            if self.broadcaster:
                loop.create_task(self.broadcaster.broadcast(log_entry))
        except RuntimeError:
            # No running loop - skip WebSocket broadcast
            pass


# Global broadcaster for use by the handler
broadcaster_global = broadcaster