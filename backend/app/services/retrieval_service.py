import logging
import uuid
from typing import Any
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.services import embedding_service

logger = logging.getLogger(__name__)


def retrieve_relevant_chunks(
    db: Session,
    user_id: uuid.UUID,
    query_text: str,
    selected_document_ids: list[int] | None = None,
    top_k: int | None = None,
    similarity_threshold: float | None = None,
) -> list[dict[str, Any]]:
    """
    Retrieve top-k relevant document chunks for a query using pgvector cosine similarity,
    strictly enforcing tenant data isolation (documents.user_id == user_id).
    """
    clean_query = query_text.strip()
    if not clean_query:
        return []

    limit = top_k or settings.RAG_TOP_K
    threshold = (
        similarity_threshold
        if similarity_threshold is not None
        else settings.RAG_SIMILARITY_THRESHOLD
    )

    # 1. Verify user-owned completed documents
    user_docs_query = db.query(Document.id).filter(
        Document.user_id == user_id,
        Document.processing_status == "completed",
    )
    all_user_doc_ids = {row[0] for row in user_docs_query.all()}

    if not all_user_doc_ids:
        logger.info(f"User {user_id} has no completed documents to retrieve from.")
        return []

    target_doc_ids = all_user_doc_ids
    if selected_document_ids:
        # Strictly intersect with user-owned documents to prevent cross-tenant access
        filtered_ids = set(selected_document_ids).intersection(all_user_doc_ids)
        if not filtered_ids:
            logger.warning(
                f"User {user_id} requested document IDs {selected_document_ids}, but none are owned/completed."
            )
            return []
        target_doc_ids = filtered_ids

    # 2. Check if embedding provider is configured
    if not embedding_service.is_embedding_configured():
        logger.warning("Embedding service is not configured. Cannot perform vector retrieval.")
        return []

    # 3. Generate query embedding vector
    try:
        query_vector = embedding_service.embed_text(clean_query)
    except Exception as exc:
        logger.error(f"Failed to generate query embedding: {exc}")
        raise RuntimeError(f"Query embedding generation failed: {str(exc)}") from exc

    # 4. Perform vector cosine distance retrieval in PostgreSQL using pgvector
    # Cosine similarity = 1 - cosine_distance
    distance_expr = DocumentChunk.embedding.cosine_distance(query_vector)
    similarity_expr = (1 - distance_expr).label("similarity")

    stmt = (
        db.query(DocumentChunk, Document.filename, similarity_expr)
        .join(Document, DocumentChunk.document_id == Document.id)
        .filter(
            Document.id.in_(target_doc_ids),
            Document.user_id == user_id,
            Document.processing_status == "completed",
            DocumentChunk.embedding.isnot(None),
        )
        .order_by(distance_expr.asc())
        .limit(limit)
    )

    rows = stmt.all()

    retrieved: list[dict[str, Any]] = []
    for chunk, filename, similarity in rows:
        sim_val = float(similarity) if similarity is not None else 0.0
        if sim_val >= threshold:
            retrieved.append({
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "filename": filename,
                "page_number": chunk.page_number,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "similarity": round(sim_val, 4),
            })

    logger.info(
        f"Retrieved {len(retrieved)} chunks above threshold {threshold} for user {user_id}."
    )
    return retrieved
