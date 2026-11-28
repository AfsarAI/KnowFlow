import datetime
from sqlalchemy import Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.db.base import Base

class DocumentChunk(Base):
    """
    Model representing semantic chunks extracted from uploaded documents,
    indexed with pgvector dense embeddings for cosine similarity retrieval.
    """
    __tablename__ = "document_chunks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding = mapped_column(Vector(1536), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )

    document = relationship("Document", back_populates="chunks")
