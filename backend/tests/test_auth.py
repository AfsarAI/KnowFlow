import datetime
import uuid
import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.user import User

def create_test_token(sub: str, email: str, full_name: str | None = None, exp_delta_seconds: int = 3600) -> str:
    """Generate a test JWT token signed with SECRET_KEY (local dev fallback)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": sub,
        "email": email,
        "user_metadata": {
            "full_name": full_name or "Test User",
        },
        "app_metadata": {
            "provider": "email",
        },
        "exp": int((now + datetime.timedelta(seconds=exp_delta_seconds)).timestamp()),
        "iat": int(now.timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def test_auth_me_missing_token(client: TestClient) -> None:
    """Missing Bearer token must return HTTP 401 Unauthorized."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "token is missing" in response.json()["detail"].lower()


def test_auth_me_invalid_token(client: TestClient) -> None:
    """Malformed or bogus Bearer token must return HTTP 401 Unauthorized."""
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer bad-token-here"})
    assert response.status_code == 401


def test_auth_me_expired_token(client: TestClient) -> None:
    """Expired token must be rejected with HTTP 401 Unauthorized."""
    expired_token = create_test_token(
        sub=str(uuid.uuid4()),
        email="expired@example.com",
        exp_delta_seconds=-3600,
    )
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401


def test_auth_me_valid_token_syncs_user(client: TestClient, db_session: Session) -> None:
    """Valid token must return 200 and synchronize user into application database."""
    test_uuid = str(uuid.uuid4())
    test_email = f"user_{test_uuid[:8]}@example.com"
    test_name = "Alice KnowFlow"

    token = create_test_token(sub=test_uuid, email=test_email, full_name=test_name)
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == test_uuid
    assert data["email"] == test_email
    assert data["full_name"] == test_name
    assert data["auth_provider"] == "email"
    assert data["is_active"] is True

    # Verify user exists in PostgreSQL database
    db_user = db_session.get(User, uuid.UUID(test_uuid))
    assert db_user is not None
    assert db_user.email == test_email


def test_auth_status_endpoint(client: TestClient) -> None:
    """Verify /api/auth/status returns configuration metadata."""
    response = client.get("/api/auth/status")
    assert response.status_code == 200
    data = response.json()
    assert "supabase_configured" in data
    assert "auth_mode" in data
