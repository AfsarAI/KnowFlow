import io
import uuid
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.models.conversation import Conversation
from app.models.message import Message
from tests.test_auth import create_test_token


def test_unauthenticated_chat_endpoints(client: TestClient) -> None:
    """All chat and conversation endpoints must reject unauthenticated requests with HTTP 401."""
    assert client.post("/api/chat", json={"message": "Test question"}).status_code == 401
    assert client.get("/api/conversations").status_code == 401
    assert client.get("/api/conversations/1").status_code == 401
    assert client.delete("/api/conversations/1").status_code == 401


def test_chat_insufficient_evidence_when_no_documents_exist(client: TestClient) -> None:
    """When the user has no uploaded documents, RAG returns clear insufficient-evidence fallback."""
    user_id = str(uuid.uuid4())
    token = create_test_token(sub=user_id, email="nodocs@test.com")

    response = client.post(
        "/api/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "What were the Q3 financial results?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["insufficient_evidence"] is True
    assert data["citations"] == []
    assert "cannot find this information" in data["assistant_message"]["content"].lower()
    assert data["conversation_id"] is not None


def test_chat_grounded_answer_and_citations(client: TestClient, db_session: Session) -> None:
    """Verify true RAG execution: embedding retrieval, LLM prompt synthesis, and citation output."""
    user_id = str(uuid.uuid4())
    token = create_test_token(sub=user_id, email="rag_user@test.com", full_name="RAG User")

    # 1. Upload a document
    doc_content = b"KnowFlow Security Architecture. Page 1: Multi-tenant database isolation prevents cross-tenant data leakage."
    files = [("files", ("security_whitepaper.txt", io.BytesIO(doc_content), "text/plain"))]
    upload_res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()[0]["id"]

    # 2. Assign vector embedding to the chunk
    chunk = db_session.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).first()
    assert chunk is not None
    test_vec = [0.0] * 1536
    test_vec[0] = 1.0
    chunk.embedding = test_vec
    db_session.commit()

    # 3. Mock query embedding and LLM response
    mock_query_vec = [0.0] * 1536
    mock_query_vec[0] = 0.98

    mock_llm_answer = (
        "KnowFlow uses multi-tenant database isolation to prevent cross-tenant data leakage "
        "[Doc: security_whitepaper.txt, Page: 1]."
    )

    with patch("app.services.embedding_service.is_embedding_configured", return_value=True), \
         patch("app.services.embedding_service.embed_text", return_value=mock_query_vec), \
         patch("app.services.rag_service.is_llm_configured", return_value=True), \
         patch("app.services.rag_service.generate_llm_answer", return_value=mock_llm_answer):

        chat_res = client.post(
            "/api/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": "How does KnowFlow isolate tenant data?"},
        )
        assert chat_res.status_code == 200
        data = chat_res.json()
        assert data["insufficient_evidence"] is False
        assert len(data["citations"]) > 0
        citation = data["citations"][0]
        assert citation["filename"] == "security_whitepaper.txt"
        assert citation["page_number"] == 1
        assert "Multi-tenant database isolation" in citation["snippet"]
        assert "multi-tenant database isolation" in data["assistant_message"]["content"].lower()

        conv_id = data["conversation_id"]

        # 4. Verify conversation persistence
        conv_res = client.get(
            f"/api/conversations/{conv_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert conv_res.status_code == 200
        conv_data = conv_res.json()
        assert len(conv_data["messages"]) == 2
        assert conv_data["messages"][0]["role"] == "user"
        assert conv_data["messages"][1]["role"] == "assistant"
        assert len(conv_data["messages"][1]["sources"]) > 0


def test_multi_user_isolation_conversations(client: TestClient, db_session: Session) -> None:
    """A user cannot access, read, or delete conversations created by another user."""
    user_a_id = str(uuid.uuid4())
    user_b_id = str(uuid.uuid4())
    token_a = create_test_token(sub=user_a_id, email="usera@test.com")
    token_b = create_test_token(sub=user_b_id, email="userb@test.com")

    # User A creates a conversation
    res_a = client.post(
        "/api/chat",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"message": "User A private inquiry"},
    )
    assert res_a.status_code == 200
    conv_id = res_a.json()["conversation_id"]

    # User B attempts to read User A's conversation -> 404
    res_b_get = client.get(
        f"/api/conversations/{conv_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_b_get.status_code == 404

    # User B attempts to delete User A's conversation -> 404
    res_b_del = client.delete(
        f"/api/conversations/{conv_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_b_del.status_code == 404

    # User A can delete their own conversation
    res_a_del = client.delete(
        f"/api/conversations/{conv_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_a_del.status_code == 200

    # Once deleted, User A also receives 404
    assert client.get(f"/api/conversations/{conv_id}", headers={"Authorization": f"Bearer {token_a}"}).status_code == 404
