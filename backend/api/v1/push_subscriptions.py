from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete

from api.deps import get_db, get_current_active_user
from models.user import User
from models.push_subscription import PushSubscription
from schemas.push_subscription import PushSubscriptionCreate, PushSubscriptionResponse, VapidKeyResponse
from config import settings

router = APIRouter()


@router.get("/vapid-key", response_model=VapidKeyResponse)
async def get_vapid_public_key():
    """Return the VAPID public key for the frontend to subscribe."""
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Push notifications are not configured on this server",
        )
    return VapidKeyResponse(public_key=settings.VAPID_PUBLIC_KEY)


@router.post("/subscribe", response_model=PushSubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def subscribe(
    data: PushSubscriptionCreate,
    db=Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Register a push subscription for the current user."""
    # Upsert: if this endpoint already exists, update keys for this user
    result = await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == data.endpoint)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.p256dh = data.p256dh
        existing.auth = data.auth
        existing.user_id = current_user.id
        await db.flush()
        await db.refresh(existing)
        return existing

    subscription = PushSubscription(
        user_id=current_user.id,
        endpoint=data.endpoint,
        p256dh=data.p256dh,
        auth=data.auth,
    )
    db.add(subscription)
    await db.flush()
    await db.refresh(subscription)
    return subscription


@router.delete("/subscribe/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe_by_id(
    subscription_id: UUID,
    db=Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Remove a specific subscription (must belong to current user)."""
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.id == subscription_id,
            PushSubscription.user_id == current_user.id,
        )
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    await db.delete(sub)
    await db.flush()


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe_by_endpoint(
    data: PushSubscriptionCreate,
    db=Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Remove subscription by endpoint (used by service worker on unsubscribe)."""
    await db.execute(
        delete(PushSubscription).where(
            PushSubscription.endpoint == data.endpoint,
            PushSubscription.user_id == current_user.id,
        )
    )
    await db.flush()


@router.get("/my-subscriptions", response_model=list[PushSubscriptionResponse])
async def list_my_subscriptions(
    db=Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all push subscriptions for the current user."""
    result = await db.execute(
        select(PushSubscription).where(PushSubscription.user_id == current_user.id)
    )
    return list(result.scalars().all())
