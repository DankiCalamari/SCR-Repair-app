import secrets
from urllib.parse import urlencode

import httpx
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.deps import get_db, get_current_active_user
from config import settings
from models.user import User, UserRole
from schemas.user import (
    LoginRequest,
    RegisterRequest,
    Token,
    UserResponse,
)
from services.auth_service import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    create_user,
    hash_password,
)

router = APIRouter()


def _get_secure_cookie(request: Request) -> bool:
    """Check if we should set secure cookies based on the request protocol."""
    forwarded_proto = request.headers.get("X-Forwarded-Proto", "").lower()
    # Secure cookies only needed for HTTPS
    is_https = forwarded_proto == "https"
    # In development mode without HTTPS, allow non-secure cookies for localhost
    if settings.APP_ENV == "development" and not is_https:
        return False
    return is_https


@router.get("/sso/login")
async def sso_login(request: Request):
    """Initiate Authentik SSO login flow."""
    if not settings.AUTHENTIK_URL or not settings.AUTHENTIK_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SSO is not configured",
        )
    
    # Build the redirect URI using the forwarded host if behind proxy
    forwarded_host = request.headers.get("X-Forwarded-Host", "")
    forwarded_proto = request.headers.get("X-Forwarded-Proto", "http")
    if forwarded_host:
        base_url = f"{forwarded_proto}://{forwarded_host}"
    else:
        base_url = settings.APP_URL
    
    redirect_uri = settings.AUTHENTIK_REDIRECT_URI or f"{base_url}/api/v1/auth/sso/callback"
    state = secrets.token_urlsafe(32)
    
    params = {
        "client_id": settings.AUTHENTIK_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
    }
    
    auth_url = f"{settings.AUTHENTIK_URL}/application/o/authorize/?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/sso/callback")
async def sso_callback(code: str, state: str = None, request: Request = None, db: AsyncSession = Depends(get_db)):
    """Handle Authentik SSO callback."""
    if not settings.AUTHENTIK_URL or not settings.AUTHENTIK_CLIENT_ID or not settings.AUTHENTIK_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SSO is not configured",
        )
    
    # Build the redirect URI using the forwarded host if behind proxy
    forwarded_host = request.headers.get("X-Forwarded-Host", "")
    forwarded_proto = request.headers.get("X-Forwarded-Proto", "http")
    if forwarded_host:
        base_url = f"{forwarded_proto}://{forwarded_host}"
    else:
        base_url = settings.APP_URL
    
    redirect_uri = settings.AUTHENTIK_REDIRECT_URI or f"{base_url}/api/v1/auth/sso/callback"
    
    token_url = f"{settings.AUTHENTIK_URL}/application/o/token/"
    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": settings.AUTHENTIK_CLIENT_ID,
        "client_secret": settings.AUTHENTIK_CLIENT_SECRET,
    }
    
    async with httpx.AsyncClient() as client:
        token_response = await client.post(token_url, data=token_data)
        
        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="SSO authentication failed",
            )
        
        tokens = token_response.json()
        access_token = tokens.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No access token received from SSO provider",
            )
        
        userinfo_response = await client.get(
            f"{settings.AUTHENTIK_URL}/application/o/userinfo/",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to get user info from SSO provider",
            )
        
        userinfo = userinfo_response.json()
        email = userinfo.get("email")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No email received from SSO provider",
            )
    
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        from schemas.user import UserCreate
        user_create = UserCreate(
            email=email,
            full_name=userinfo.get("name", userinfo.get("preferred_username", "SSO User")),
            phone=None,
            password=hash_password(secrets.token_urlsafe(16)),
            role="customer",
            is_active=True,
        )
        user = await create_user(user_create, db)
        # Link SSO provider to the user
        user.sso_provider = "authentik"
        # Get the SSO user ID if available (sub claim)
        sso_id = userinfo.get("sub")
        if sso_id:
            user.sso_id = str(sso_id)
        await db.flush()
    
    # Update SSO linkage for existing users if not already linked
    if user.sso_provider != "authentik":
        user.sso_provider = "authentik"
        sso_id = userinfo.get("sub")
        if sso_id:
            user.sso_id = str(sso_id)
        await db.flush()
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    
    user.last_login = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()
    
    token_data = {"sub": str(user.id)}
    jwt_access_token = create_access_token(token_data)
    jwt_refresh_token = create_refresh_token(token_data)
    
    # Check for HTTPS behind proxy
    forwarded_proto = request.headers.get("X-Forwarded-Proto", "http").lower()
    is_https = forwarded_proto == "https"
    
    # Build redirect URL using forwarded headers
    forwarded_host = request.headers.get("X-Forwarded-Host", "")
    redirect_base = f"{forwarded_proto}://{forwarded_host}" if forwarded_host else settings.APP_URL
    response = RedirectResponse(url=f"{redirect_base}/app/login")
    
    response.set_cookie(
        key="access_token",
        value=jwt_access_token,
        httponly=True,
        secure=is_https,
        samesite="lax",
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=jwt_refresh_token,
        httponly=True,
        secure=is_https,
        samesite="lax",
        path="/"
    )
    
    return response


@router.post("/login", response_model=Token)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(request.email, request.password, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    user.last_login = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()

    token_data = {"sub": str(user.id)}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/register", response_model=Token)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(User).where(User.email == request.email)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    from schemas.user import UserCreate

    user_create = UserCreate(
        email=request.email,
        full_name=request.full_name,
        phone=request.phone,
        password=request.password,
        role="customer",
    )
    user = await create_user(user_create, db)

    token_data = {"sub": str(user.id)}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_request: dict,
    db: AsyncSession = Depends(get_db),
):
    from services.auth_service import verify_token

    token_value = refresh_request.get("refresh_token")
    if not token_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token is required",
        )

    payload = verify_token(token_value)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_type = payload.get("type")
    if token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    token_data = {"sub": str(user.id)}
    access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.get("/sync", response_model=Token)
async def sync_sso(request: Request, db: AsyncSession = Depends(get_db)):
    """Sync endpoint for SSO - reads tokens from cookies and returns them."""
    from services.auth_service import verify_token
    
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No access token found in cookies",
        )
    
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token in cookies",
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing subject",
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return Token(
        access_token=token,
        refresh_token=request.cookies.get("refresh_token", ""),
        token_type="bearer",
    )
