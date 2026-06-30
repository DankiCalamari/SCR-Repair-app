"""Web Push notification service.

Sends push notifications to all subscribed admin/staff users when
significant events occur. Requires VAPID keys to be configured.
"""

from __future__ import annotations

import logging
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


async def get_admin_subscriptions(db: AsyncSession) -> Sequence[PushSubscription]:
    """Get all push subscriptions belonging to admin and staff users."""
    from models.user import User, UserRole
    result = await db.execute(
        select(PushSubscription)
        .join(User, User.id == PushSubscription.user_id)
        .where(User.role.in_([UserRole.ADMIN, UserRole.STAFF]))
        .where(User.is_active == True)
    )
    return result.scalars().all()


async def send_push_to_subscriptions(
    db: AsyncSession,
    subscriptions: Sequence[PushSubscription],
    title: str,
    body: str,
    url: str | None = None,
) -> int:
    """Send a push notification to a list of subscriptions. Returns count of successful sends."""
    if not settings.VAPID_PRIVATE_KEY or not subscriptions:
        return 0

    from pywebpush import WebPushException, webpush

    payload = {
        "title": title,
        "body": body,
        "icon": "/app/static/logo.svg",
        "badge": "/app/static/logo.svg",
    }
    if url:
        payload["url"] = url

    import json
    data = json.dumps(payload)

    sent = 0
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth,
                    },
                },
                data=data,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={
                    "sub": f"mailto:{settings.VAPID_CLAIMS_EMAIL}",
                },
            )
            sent += 1
        except WebPushException as exc:
            if exc.response is not None and exc.response.status_code in (404, 410):
                # Subscription expired or invalid — remove it
                await db.delete(sub)
                await db.flush()
                logger.info("Removed expired push subscription %s", sub.id)
            else:
                logger.warning("Push send failed for subscription %s: %s", sub.id, exc)
        except Exception as exc:
            logger.warning("Push send error for subscription %s: %s", sub.id, exc)

    return sent


async def notify_admin_push(
    db: AsyncSession,
    title: str,
    body: str,
    url: str | None = None,
) -> None:
    """Send a push notification to all subscribed admin/staff users."""
    if not await _is_enabled(db, "admin_notify_push"):
        return

    if not settings.VAPID_PRIVATE_KEY:
        return

    subscriptions = await get_admin_subscriptions(db)
    if not subscriptions:
        return

    await send_push_to_subscriptions(db, subscriptions, title, body, url)


async def _is_enabled(db: AsyncSession, key: str, default: bool = True) -> bool:
    from models.system_setting import SystemSetting
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key == key)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return default
    return row.value.lower() in ("true", "1", "yes")
