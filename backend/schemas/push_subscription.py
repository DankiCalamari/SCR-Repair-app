from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class PushSubscriptionCreate(BaseModel):
    endpoint: str = Field(..., max_length=500)
    p256dh: str = Field(..., max_length=255)
    auth: str = Field(..., max_length=255)


class PushSubscriptionResponse(BaseModel):
    id: UUID
    endpoint: str
    created_at: datetime

    class Config:
        from_attributes = True


class VapidKeyResponse(BaseModel):
    public_key: str
