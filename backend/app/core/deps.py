import uuid
from collections.abc import Generator
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.security import verify_supabase_jwt

security_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """
    FastAPI dependency that:
    1. Extracts the Bearer token from the Authorization header.
    2. Validates the JWT format and signature with verify_supabase_jwt.
    3. Resolves the user identity by UUID.
    4. Automatically synchronizes / creates the application User record in PostgreSQL if not present.
    5. Enforces user status (active vs inactive).
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Bearer token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials.strip()
    if not token or token.lower() in ("undefined", "null", "none"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Bearer token is invalid or empty",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_supabase_jwt(token)

    sub_str = payload.get("sub")
    try:
        user_uuid = uuid.UUID(str(sub_str))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid user UUID format in token: '{sub_str}'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Look up user in local PostgreSQL database
    user = db.get(User, user_uuid)

    # Extract user metadata provided by JWT claims
    email = payload.get("email") or f"{user_uuid}@knowflow.local"
    user_metadata = payload.get("user_metadata", {}) or {}
    app_metadata = payload.get("app_metadata", {}) or {}
    full_name = (
        user_metadata.get("full_name")
        or user_metadata.get("name")
        or payload.get("full_name")
    )
    provider = app_metadata.get("provider") or payload.get("auth_provider") or "email"

    if user is None:
        # Check if email is already taken by another ID (edge case safety)
        existing_email_user = db.query(User).filter(User.email == email).first()
        if existing_email_user:
            user = existing_email_user
        else:
            # Synchronize new user into application database
            user = User(
                id=user_uuid,
                email=email,
                full_name=full_name,
                auth_provider=provider,
                is_active=True,
                is_superuser=False,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    else:
        # Update metadata if changed
        updated = False
        if full_name and user.full_name != full_name:
            user.full_name = full_name
            updated = True
        if provider and user.auth_provider != provider:
            user.auth_provider = provider
            updated = True
        if updated:
            db.commit()
            db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated",
        )

    return user
