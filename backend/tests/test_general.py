"""Tests généraux : endpoints racine, health check, CORS, etc."""

def test_root_endpoint(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "Entomo" in data["message"]
    assert "version" in data


def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_cors_headers(client):
    res = client.options("/", headers={
        "Origin": "http://localhost:8080",
        "Access-Control-Request-Method": "GET",
    })
    assert res.status_code == 200
    assert "access-control-allow-origin" in res.headers


def test_404_handler(client):
    res = client.get("/nonexistent-route")
    assert res.status_code == 404


def test_api_docs_available(client):
    res = client.get("/api/v1/docs")
    assert res.status_code == 200
    assert "swagger" in res.text.lower()


def test_openapi_schema(client):
    res = client.get("/api/v1/openapi.json")
    assert res.status_code == 200
    schema = res.json()
    assert "paths" in schema
    assert len(schema["paths"]) > 0
