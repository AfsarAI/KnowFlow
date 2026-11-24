import logging
from typing import Any
import jwt
from jwt import PyJWKClient, PyJWTError
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger(__name__)

# Cache JWKS client instance if JWKS URL is available
_jwk_client: PyJWKClient | None = None

def get_jwk_client() -> PyJWKClient | None:
    global _jwk_client
    if _jwk_client is None:
        jwks_url = settings.SUPABASE_JWKS_URL
        if not jwks_url and settings.SUPABASE_URL:
            jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        if jwks_url:
            try:
                _jwk_client = PyJWKClient(jwks_url)
            except Exception as e:
                logger.warning(f"Could not initialize PyJWKClient: {e}")
    return _jwk_client


def verify_supabase_jwt(token: str) -> dict[str, Any]:
    """
    Independently verify and decode a Supabase JWT access token.
    Supports:
    1. Symmetric HS256 verification using SUPABASE_JWT_SECRET.
    2. Asymmetric RS256/ES256 verification using Supabase JWKS endpoint.
    3. Development fallback using SECRET_KEY (for local development & unit tests).
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token header format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload: dict[str, Any] | None = None
    verification_errors = []

    # Method 1: Verify using Supabase JWT Secret (HS256)
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
                issuer=settings.SUPABASE_JWT_ISSUER,
            )
        except PyJWTError as exc:
            verification_errors.append(f"HS256 (SUPABASE_JWT_SECRET): {exc}")

    # Method 2: Verify using Supabase JWKS (RS256 / ES256)
    if payload is None:
        jwk_client = get_jwk_client()
        if jwk_client:
            try:
                signing_key = jwk_client.get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["RS256", "ES256"],
                    options={"verify_aud": False},
                    issuer=settings.SUPABASE_JWT_ISSUER,
                )
            except Exception as exc:
                verification_errors.append(f"JWKS ({alg}): {exc}")

    # Method 3: Development / Test fallback with project SECRET_KEY
    if payload is None:
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        except PyJWTError as exc:
            verification_errors.append(f"Local SECRET_KEY: {exc}")

    if payload is None:
        logger.error(f"JWT verification failed. Errors: {verification_errors}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: invalid token signature or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate essential claims
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing subject ('sub') claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload
