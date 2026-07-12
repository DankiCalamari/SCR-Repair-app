"""
WebSocket endpoint for real-time repair updates.

Provides a WebSocket connection for admin users to receive repair events in real-time.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from services.repair_events import broadcaster
from config import settings
from database import async_session_factory
from models.user import User, UserRole
from jose import JWTError
from jose import jwt as jose_jwt
from sqlalchemy import select
from logging_config import get_logger

router = APIRouter()


async def verify_token_and_get_user(token: str) -> User | None:
    """Verify JWT token and return the associated user."""
    try:
        payload = jose_jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "access":
            return None
        
        user_id = payload.get("sub")
        if user_id is None:
            return None
        
        async with async_session_factory() as db:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            return user
    except JWTError:
        return None


@router.websocket("/ws/repairs")
async def websocket_repairs(
    websocket: WebSocket,
):
    """
    WebSocket endpoint for real-time repair event streaming.
    
    Clients connect to receive repair events (status changes, deletions) as they occur.
    Only staff-authenticated users can connect.
    
    Authentication is performed via the 'token' query parameter.
    """
    # Check for authentication via query parameter (preferred for WebSockets)
    token = websocket.query_params.get("token")
    
    if not token:
        # Try to get from headers
        auth_header = websocket.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
    
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    user = await verify_token_and_get_user(token)
    if not user or user.role not in (UserRole.ADMIN, UserRole.STAFF):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    if not user.is_active:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Connect to the broadcaster
    await broadcaster.connect(websocket)
    
    try:
        # Listen for client messages (ping/pong)
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif message.get("type") == "subscribe":
                    # Acknowledge subscription
                    await websocket.send_json({"type": "subscribed", "event_types": ["status_change", "delete"]})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await broadcaster.disconnect(websocket)
    except Exception as e:
        get_logger(__name__).error("websocket_error", error=str(e))
        await broadcaster.disconnect(websocket)