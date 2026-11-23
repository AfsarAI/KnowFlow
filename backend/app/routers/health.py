from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.schemas.health import HealthResponse
from app.db.session import get_db

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Return application health status and project name."""
    return HealthResponse(status="ok", project="KnowFlow")

@router.get("/health/db")
def health_check_db(db: Session = Depends(get_db)):
    """Deep health check verifying PostgreSQL connectivity and pgvector extension status."""
    try:
        db.execute(text("SELECT 1"))
        vector_ext = db.execute(
            text("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
        ).scalar()
        return {
            "status": "ok",
            "project": "KnowFlow",
            "database": "connected",
            "pgvector_extension": "enabled" if vector_ext else "not installed",
            "pgvector_version": vector_ext,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(exc)}",
        )
