import datetime
import io
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


def test_auth_me_undefined_or_null_token(client: TestClient) -> None:
    """Explicitly test that 'Bearer undefined' and 'Bearer null' are rejected with 401."""
    res_undefined = client.get("/api/auth/me", headers={"Authorization": "Bearer undefined"})
    assert res_undefined.status_code == 401

    res_null = client.get("/api/auth/me", headers={"Authorization": "Bearer null"})
    assert res_null.status_code == 401

    res_empty = client.get("/api/auth/me", headers={"Authorization": "Bearer "})
    assert res_empty.status_code == 401


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


def test_auth_register_and_login_flow(client: TestClient) -> None:
    """Register a new user, log in with credentials, and verify token works on protected endpoints."""
    unique_suffix = str(uuid.uuid4())[:8]
    test_email = f"real_user_{unique_suffix}@example.com"
    test_password = "SecurePassword123!"
    test_name = "Real User"

    # 1. Register new user
    reg_res = client.post(
        "/api/auth/register",
        json={
            "email": test_email,
            "password": test_password,
            "full_name": test_name,
        },
    )
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    token = reg_data["access_token"]
    assert len(token.split(".")) == 3  # Valid 3-part JWT
    assert reg_data["user"]["email"] == test_email
    assert reg_data["user"]["full_name"] == test_name

    # 2. Duplicate registration must fail
    dup_res = client.post(
        "/api/auth/register",
        json={
            "email": test_email,
            "password": test_password,
        },
    )
    assert dup_res.status_code == 400

    # 3. Login with correct credentials
    login_res = client.post(
        "/api/auth/login",
        json={
            "email": test_email,
            "password": test_password,
        },
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    login_token = login_data["access_token"]
    assert len(login_token.split(".")) == 3

    # 4. Login with wrong password must return 401
    wrong_pwd_res = client.post(
        "/api/auth/login",
        json={
            "email": test_email,
            "password": "WrongPassword999",
        },
    )
    assert wrong_pwd_res.status_code == 401

    # 5. Access protected /api/auth/me with the login token
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {login_token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == test_email

    # 6. Upload document to POST /api/documents using the login token
    sample_content = b"KnowFlow End-to-End Auth and Document Processing Test."
    upload_res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {login_token}"},
        files=[("files", ("auth_test_doc.txt", io.BytesIO(sample_content), "text/plain"))],
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert len(upload_data) == 1
    assert upload_data[0]["filename"] == "auth_test_doc.txt"
    assert upload_data[0]["processing_status"] == "completed"
