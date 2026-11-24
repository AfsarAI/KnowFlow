import datetime
import logging
from typing import Any
import jwt
from jwt import PyJWKClient, PyJWTError
from fastapi import HTTPException, status
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core.config import settings

logger = logging.getLogger(__name__)

# Password hashing instance with Argon2
password_hash = PasswordHash((Argon2Hasher(),))


def get_password_hash(password: str) -> str:
    """Hash a plaintext password using Argon2."""
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against an Argon2 hash."""
    if not hashed_password:
        return False
    try:
        return password_hash.verify(plain_password, hashed_password)
    except Exception as exc:
        logger.warning(f"Password verification error: {exc}")
        return False


def create_access_token(
    data: dict[str, Any],
    expires_delta: datetime.timedelta | None = None,
) -> str:
    """
    Generate a signed JWT token containing user identity and metadata.
    Signed using application SECRET_KEY with standard 24-hour expiration by default.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    expire = now + (expires_delta or datetime.timedelta(hours=24))
    to_encode = {
        **data,
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


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
    Independently verify and decode a JWT access token.
    Supports:
    1. Symmetric HS256 verification using SUPABASE_JWT_SECRET.
    2. Asymmetric RS256/ES256 verification using Supabase JWKS endpoint.
    3. Application / Test verification with project SECRET_KEY.
    """
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = token.strip()
    if token.lower() in ("undefined", "null", "none"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is invalid: received null or undefined token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format: expected 3-part JWT",
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

    # Method 3: Local application & test verification with project SECRET_KEY
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
