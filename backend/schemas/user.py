import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ---------------------------------------------------------------------------
# Reusable helpers
# ---------------------------------------------------------------------------

_PHONE_RE = re.compile(r"^\+?[0-9\s\-]{7,20}$")


def _validate_phone(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    cleaned = v.strip()
    if not _PHONE_RE.match(cleaned):
        raise ValueError("Invalid phone number format")
    return cleaned


# ---------------------------------------------------------------------------
# User schemas
# ---------------------------------------------------------------------------

class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="customer", pattern="^(admin|staff|customer)$")

    _validate_phone = field_validator("phone", mode="before")(_validate_phone)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    role: Optional[str] = Field(None, pattern="^(admin|staff|customer)$")

    _validate_phone = field_validator("phone", mode="before")(_validate_phone)


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    email_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserInDB(UserResponse):
    hashed_password: str


# ---------------------------------------------------------------------------
# Auth / token schemas
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class RegisterRequest(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

    _validate_phone = field_validator("phone", mode="before")(_validate_phone)


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None  # user id as string
    exp: Optional[datetime] = None
    type: Optional[str] = None  # "access" or "refresh"
