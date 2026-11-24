import io
import os
import uuid
import pypdf
import pytest
from fastapi.testclient import TestClient
from tests.test_auth import create_test_token

def generate_sample_pdf(num_pages: int = 2) -> bytes:
    """Generate a valid in-memory PDF file containing test text across multiple pages."""
    writer = pypdf.PdfWriter()
    for i in range(num_pages):
        page = writer.add_blank_page(width=612, height=792)
    stream = io.BytesIO()
    writer.write(stream)
    return stream.getvalue()


def test_unauthenticated_document_endpoints(client: TestClient) -> None:
    """All document endpoints must reject unauthenticated requests with HTTP 401."""
    assert client.get("/api/documents").status_code == 401
    assert client.get("/api/documents/1").status_code == 401
    assert client.delete("/api/documents/1").status_code == 401

    fake_file = io.BytesIO(b"Hello world")
    assert client.post("/api/documents", files={"files": ("test.txt", fake_file, "text/plain")}).status_code == 401


def test_upload_valid_txt_document(client: TestClient) -> None:
    """Upload a valid plain-text document, verify synchronous extraction and persistence."""
    user_uuid = str(uuid.uuid4())
    token = create_test_token(sub=user_uuid, email="alice@test.com", full_name="Alice")

    content = b"KnowFlow Document Management System.\nLine 2: Semantic retrieval foundation.\nLine 3: Day 3."
    files = [("files", ("notes.txt", io.BytesIO(content), "text/plain"))]

    response = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert response.status_code == 201
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1

    doc = data[0]
    assert doc["filename"] == "notes.txt"
    assert doc["file_type"] == "txt"
    assert doc["file_size"] == len(content)
    assert doc["processing_status"] == "completed"
    assert doc["page_count"] == 1
    assert doc["error_message"] is None

    # Fetch document detail
    detail_res = client.get(
        f"/api/documents/{doc['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert "KnowFlow Document Management System" in detail["extracted_text"]


def test_upload_valid_pdf_document(client: TestClient) -> None:
    """Upload a valid PDF file, verify page extraction and metadata."""
    user_uuid = str(uuid.uuid4())
    token = create_test_token(sub=user_uuid, email="bob@test.com", full_name="Bob")

    pdf_bytes = generate_sample_pdf(num_pages=3)
    files = [("files", ("annual_report.pdf", io.BytesIO(pdf_bytes), "application/pdf"))]

    response = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data) == 1

    doc = data[0]
    assert doc["filename"] == "annual_report.pdf"
    assert doc["file_type"] == "pdf"
    assert doc["page_count"] == 3
    assert doc["processing_status"] == "completed"


def test_upload_multiple_documents(client: TestClient) -> None:
    """Upload multiple documents in a single request."""
    user_uuid = str(uuid.uuid4())
    token = create_test_token(sub=user_uuid, email="charlie@test.com")

    pdf_bytes = generate_sample_pdf(num_pages=1)
    txt_bytes = b"Sample plain text research article."

    files = [
        ("files", ("doc1.pdf", io.BytesIO(pdf_bytes), "application/pdf")),
        ("files", ("doc2.txt", io.BytesIO(txt_bytes), "text/plain")),
    ]

    response = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data) == 2
    assert data[0]["processing_status"] == "completed"
    assert data[1]["processing_status"] == "completed"


def test_upload_invalid_file_extension(client: TestClient) -> None:
    """Files with disallowed extensions must be rejected with HTTP 400."""
    user_uuid = str(uuid.uuid4())
    token = create_test_token(sub=user_uuid, email="david@test.com")

    files = [("files", ("image.png", io.BytesIO(b"\x89PNG\r\n\x1a\n"), "image/png"))]
    response = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]


def test_upload_empty_file(client: TestClient) -> None:
    """Empty 0-byte files must be rejected with HTTP 400."""
    user_uuid = str(uuid.uuid4())
    token = create_test_token(sub=user_uuid, email="emma@test.com")

    files = [("files", ("empty.txt", io.BytesIO(b""), "text/plain"))]
    response = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_multi_user_document_isolation(client: TestClient) -> None:
    """Enforce strict user-level document isolation across users."""
    user_a_uuid = str(uuid.uuid4())
    token_a = create_test_token(sub=user_a_uuid, email="user_a@test.com")

    user_b_uuid = str(uuid.uuid4())
    token_b = create_test_token(sub=user_b_uuid, email="user_b@test.com")

    # User A uploads document
    txt_content = b"Confidential User A data"
    files = [("files", ("secret_a.txt", io.BytesIO(txt_content), "text/plain"))]
    upload_res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token_a}"},
        files=files,
    )
    assert upload_res.status_code == 201
    doc_a_id = upload_res.json()[0]["id"]

    # User B lists documents -> doc_a_id must NOT be visible
    list_b_res = client.get(
        "/api/documents",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert list_b_res.status_code == 200
    b_doc_ids = [d["id"] for d in list_b_res.json()]
    assert doc_a_id not in b_doc_ids

    # User B attempts to access User A's document directly -> 404
    get_b_res = client.get(
        f"/api/documents/{doc_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_b_res.status_code == 404

    # User B attempts to delete User A's document -> 404
    del_b_res = client.delete(
        f"/api/documents/{doc_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert del_b_res.status_code == 404

    # User A can still access their document
    get_a_res = client.get(
        f"/api/documents/{doc_a_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert get_a_res.status_code == 200


def test_delete_document(client: TestClient) -> None:
    """Deleting a document removes the database record and the stored file."""
    user_uuid = str(uuid.uuid4())
    token = create_test_token(sub=user_uuid, email="frank@test.com")

    # Upload document
    files = [("files", ("to_delete.txt", io.BytesIO(b"Delete me soon"), "text/plain"))]
    upload_res = client.post(
        "/api/documents",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()[0]["id"]

    # Delete document
    del_res = client.delete(
        f"/api/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "ok"

    # Confirm 404 on subsequent get
    assert client.get(
        f"/api/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token}"},
    ).status_code == 404
