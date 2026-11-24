from fastapi import APIRouter, Depends
from app.models.user import User
from app.schemas.user import UserResponse, AuthStatusResponse
from app.core.deps import get_current_user
from app.core.config import settings

router = APIRouter(tags=["Authentication"])

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
        auth_mode="supabase" if configured else "local-development",
        jwks_available=bool(settings.SUPABASE_JWKS_URL or settings.SUPABASE_URL),
    )
