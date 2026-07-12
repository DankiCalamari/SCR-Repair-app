"""
WebSocket repair events broadcaster for real-time updates.

Manages WebSocket connections and broadcasts repair events to all connected clients.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from starlette.websockets import WebSocket


class RepairEventsBroadcaster:
    """
    Central broadcaster for repair events to all connected WebSocket clients.
    
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
        _log("websocket_repair_client_connected", client_count=len(self._connections))
    
    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        async with self._lock:
            self._connections.discard(websocket)
        _log("websocket_repair_client_disconnected", client_count=len(self._connections))
    
    async def broadcast(self, event: dict[str, Any]) -> None:
        """Send an event to all connected clients."""
        if not self._connections:
            return
        
        # Get connections to send to (avoid modification during iteration)
        async with self._lock:
            connections = list(self._connections)
        
        # Send to each connection, removing dead ones
        dead_connections = []
        for websocket in connections:
            try:
                await websocket.send_json(event)
            except Exception as e:
                _log("websocket_send_failed", error=str(e))
                dead_connections.append(websocket)
        
        # Clean up dead connections
        if dead_connections:
            async with self._lock:
                for ws in dead_connections:
                    self._connections.discard(ws)


# Global broadcaster instance
broadcaster = RepairEventsBroadcaster()


def format_repair_event(
    event_type: str,
    repair_id: str,
    **kwargs: Any
) -> dict[str, Any]:
    """Format a repair event for WebSocket transmission."""
    from datetime import datetime
    return {
        "type": "repair_event",
        "event_type": event_type,
        "repair_id": repair_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": kwargs,
    }


def _log(message: str, **kwargs: Any) -> None:
    """Internal logging helper that uses stdlib logging to avoid circular imports."""
    logging.getLogger(__name__).info(message, **kwargs)


async def broadcast_repair_event(event_type: str, repair_id: str, **kwargs: Any) -> None:
    """Broadcast a repair event to all connected WebSocket clients."""
    event = format_repair_event(event_type, repair_id, **kwargs)
    await broadcaster.broadcast(event)