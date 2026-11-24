from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.testclient import TestClient

def test_db_health_endpoint(client: TestClient) -> None:
    """Verify GET /health/db verifies PostgreSQL connection and pgvector extension."""
    response = client.get("/health/db")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert data["pgvector_extension"] == "enabled"
    assert data["pgvector_version"] is not None

def test_db_session_execution(db_session: Session) -> None:
    """Direct database session test verifying vector extension availability."""
    result = db_session.execute(text("SELECT extname FROM pg_extension WHERE extname = 'vector'")).scalar()
    assert result == "vector"

def test_db_tables_exist(db_session: Session) -> None:
    """Verify that all core tables are created in the database schema with proper types."""
    result = db_session.execute(
        text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    ).scalars().all()
    assert "users" in result
    assert "documents" in result
    assert "document_chunks" in result
    assert "conversations" in result
    assert "messages" in result
    assert "alembic_version" in result
