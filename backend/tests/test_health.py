from fastapi.testclient import TestClient

def test_health_endpoint(client: TestClient) -> None:
    """Verify that GET /health returns status 200 and the expected payload."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["project"] == "KnowFlow"

def test_docs_endpoint(client: TestClient) -> None:
    """Verify that Swagger docs are accessible at /docs."""
    response = client.get("/docs")
    assert response.status_code == 200

def test_openapi_schema(client: TestClient) -> None:
    """Verify OpenAPI schema metadata."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "KnowFlow API"
    assert schema["info"]["version"] == "0.1.0"
