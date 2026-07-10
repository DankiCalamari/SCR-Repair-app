"""
WebSocket endpoint for real-time log streaming.

Provides a WebSocket connection for admin users to stream logs in real-time.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import JWTError
from jose import jwt as jose_jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import async_session_factory
from models.user import User, UserRole
from services.log_broadcaster import broadcaster
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


@router.websocket("/ws/logs")
async def websocket_logs(
    websocket: WebSocket,
):
    """
    WebSocket endpoint for real-time log streaming.
    
    Clients connect to this endpoint to receive log events as they occur.
    Only admin-authenticated users can connect.
    
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
    if not user or user.role != UserRole.ADMIN:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    if not user.is_active:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Connect to the broadcaster
    await broadcaster.connect(websocket)
    
    try:
        # Listen for client messages (ping/pong or log level changes)
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif message.get("type") == "set_level":
                    # Could be used to filter logs on backend
                    pass
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await broadcaster.disconnect(websocket)
    except Exception as e:
        get_logger(__name__).error("websocket_error", error=str(e))
        await broadcaster.disconnect(websocket)