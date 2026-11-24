import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    UserResponse,
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    AuthStatusResponse,
)
from app.core.deps import get_current_user
from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
)

router = APIRouter(tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Register a new user account with validated email and password.
    Hashes password with Argon2, persists user in PostgreSQL, and returns a verified JWT.
    """
    clean_email = payload.email.lower().strip()

    # Check if email is already taken
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    user_id = uuid.uuid4()
    hashed_pwd = get_password_hash(payload.password)

    new_user = User(
        id=user_id,
        email=clean_email,
        full_name=payload.full_name.strip() if payload.full_name else None,
        hashed_password=hashed_pwd,
        auth_provider="local",
        is_active=True,
        is_superuser=False,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token_payload = {
        "sub": str(new_user.id),
        "email": new_user.email,
        "user_metadata": {
            "full_name": new_user.full_name or "",
        },
        "app_metadata": {
            "provider": "local",
        },
    }
    access_token = create_access_token(token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=new_user,
    )


@router.post("/login", response_model=TokenResponse)
def login_user(
    payload: UserLoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate an existing user with email and password.
    Verifies Argon2 hash against PostgreSQL and issues a signed JWT access token.
    """
    clean_email = payload.email.lower().strip()

    user = db.query(User).filter(User.email == clean_email).first()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated.",
        )

    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "user_metadata": {
            "full_name": user.full_name or "",
        },
        "app_metadata": {
            "provider": user.auth_provider,
        },
    }
    access_token = create_access_token(token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
    )


@router.get("/me", response_model=UserResponse)
def get_authenticated_user_profile(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Return the authenticated user's profile using the independently verified token identity.
    Enforces that identity comes strictly from the verified JWT, never a client-supplied body.
    """
    return current_user


@router.get("/status", response_model=AuthStatusResponse)
def get_auth_integration_status() -> AuthStatusResponse:
    """Return public status regarding Supabase Auth configuration."""
    configured = bool(settings.SUPABASE_URL and (settings.SUPABASE_ANON_KEY or settings.SUPABASE_JWT_SECRET))
    return AuthStatusResponse(
        supabase_configured=configured,
        auth_mode="supabase" if configured else "local-database",
        jwks_available=bool(settings.SUPABASE_JWKS_URL or settings.SUPABASE_URL),
    )
