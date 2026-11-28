import io
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.models.user import User
from tests.test_auth import create_test_token


def test_document_chunks_created_on_upload(client: TestClient, db_session: Session) -> None:
    """Verify document upload creates chunk records with page numbers and metadata."""
    user_id = str(uuid.uuid4())
    token = create_test_token(sub=user_id, email="chunker@test.com", full_name="Chunker")

    content = b"KnowFlow Document Chunking Architecture.\n\n" + (
        b"Paragraph 1 discusses vector embeddings and chunk splitting with overlap.\n"
        b"Paragraph 2 details pgvector storage and cosine distance retrieval in PostgreSQL.\n"
        * 10
    )
    files = [("files", ("chunk_test.txt", io.BytesIO(content), "text/plain"))]

    response = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert response.status_code == 201
    docs = response.json()
    assert len(docs) == 1
    doc_id = docs[0]["id"]
    assert docs[0]["chunk_count"] > 0

    # Query document_chunks table directly
    chunks = (
        db_session.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc_id)
        .order_by(DocumentChunk.chunk_index.asc())
        .all()
    )
    assert len(chunks) > 0
    assert chunks[0].page_number == 1
    assert chunks[0].chunk_index == 0
    assert "KnowFlow Document Chunking" in chunks[0].content
    assert chunks[0].metadata_json is not None


def test_document_deletion_cascades_and_removes_chunks(client: TestClient, db_session: Session) -> None:
    """Verify deleting a document cascades and purges all chunks from pgvector storage."""
    user_id = str(uuid.uuid4())
    token = create_test_token(sub=user_id, email="cascade@test.com", full_name="Cascade")

    content = b"Temporary document content destined for deletion testing."
    files = [("files", ("to_delete.txt", io.BytesIO(content), "text/plain"))]

    upload_res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()[0]["id"]

    # Verify chunks exist prior to deletion
    chunks_before = (
        db_session.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc_id)
        .count()
    )
    assert chunks_before > 0

    # Delete document via API
    del_res = client.delete(
        f"/api/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 200

    # Verify chunks are completely purged from database
    chunks_after = (
        db_session.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc_id)
        .count()
    )
    assert chunks_after == 0


def test_chunk_vector_embedding_cosine_distance_query(client: TestClient, db_session: Session) -> None:
    """Verify storing and querying vector embeddings with pgvector cosine distance operators."""
    user_id = str(uuid.uuid4())
    token = create_test_token(sub=user_id, email="vectortest@test.com")

    # Upload document
    content = b"Vector similarity search test content."
    files = [("files", ("vector_doc.txt", io.BytesIO(content), "text/plain"))]
    upload_res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()[0]["id"]

    # Fetch chunk and assign a mock test vector of dimension 1536
    chunk = (
        db_session.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc_id)
        .first()
    )
    assert chunk is not None

    test_vector = [0.0] * 1536
    test_vector[0] = 1.0
    test_vector[1] = 0.5
    chunk.embedding = test_vector
    db_session.commit()

    # Query using pgvector cosine distance operator
    query_vector = [0.0] * 1536
    query_vector[0] = 0.95
    query_vector[1] = 0.45

    res = (
        db_session.query(
            DocumentChunk.id,
            (1 - DocumentChunk.embedding.cosine_distance(query_vector)).label("sim"),
        )
        .filter(DocumentChunk.id == chunk.id)
        .first()
    )
    assert res is not None
    assert res.sim > 0.9  # High similarity due to aligned vector components
