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

    # PostgreSQL & pgvector Configuration
    POSTGRES_SERVER: str = "127.0.0.1"
    POSTGRES_PORT: int = 5434
    POSTGRES_DB: str = "knowflow"
    POSTGRES_USER: str = "knowflow"
    POSTGRES_PASSWORD: str = "knowflow_dev_password"
    DATABASE_URL: Optional[str] = None

    @computed_field
    def sqlalchemy_database_uri(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

settings = Settings()
