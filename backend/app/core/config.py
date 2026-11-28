from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import computed_field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "KnowFlow"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "dev-insecure-secret-key-knowflow-day-1-setup-32chars"

    # Supabase Auth & JWT Configuration
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None
    SUPABASE_JWKS_URL: Optional[str] = None
    SUPABASE_JWT_ISSUER: Optional[str] = None

    # Document Upload & Storage Settings
    MAX_UPLOAD_SIZE_MB: int = 15
    ALLOWED_EXTENSIONS: list[str] = [".pdf", ".txt"]
    UPLOAD_DIR: str = "storage/documents"

    # AI & Embedding Provider Configuration
    AI_PROVIDER: str = "openai"  # "openai" or "gemini"

    # OpenAI Settings (default embedding dimension: 1536)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"

    # Google Gemini Settings (alternative provider)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"
    GEMINI_CHAT_MODEL: str = "gemini-1.5-flash"

    # Vector Dimension & Chunking Strategy
    EMBEDDING_DIMENSION: int = 1536
    CHUNK_SIZE: int = 500  # Target characters per chunk
    CHUNK_OVERLAP: int = 80  # Overlapping characters between consecutive chunks

    # Semantic Retrieval & Context Generation
    RAG_TOP_K: int = 5
    RAG_SIMILARITY_THRESHOLD: float = 0.30

    # PostgreSQL & pgvector Configuration (Supports Docker local or hosted Supabase PostgreSQL)
    POSTGRES_SERVER: str = "127.0.0.1"
    POSTGRES_PORT: int = 5434
    POSTGRES_DB: str = "knowflow"
    POSTGRES_USER: str = "knowflow"
    POSTGRES_PASSWORD: str = "knowflow_dev_password"
    DATABASE_URL: Optional[str] = None

    @computed_field
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @computed_field
    def sqlalchemy_database_uri(self) -> str:
        if self.DATABASE_URL:
            # Normalize potential postgres:// to postgresql+psycopg://
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+psycopg://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
                url = url.replace("postgresql://", "postgresql+psycopg://", 1)
            return url
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    def get_upload_root(self) -> Path:
        """Resolve and create absolute path to upload storage directory safely."""
        base = Path(__file__).resolve().parent.parent.parent
        root = base / self.UPLOAD_DIR
        root.mkdir(parents=True, exist_ok=True)
        return root

settings = Settings()
