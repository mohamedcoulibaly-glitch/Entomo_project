"""Tests des endpoints de santé Phase 5."""

def test_health_summary(client):
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] in {"healthy", "degraded"}
    assert "database" in body
    assert "ml_registry" in body
    assert body["database"]["status"] == "ok"


def test_health_live(client):
    res = client.get("/health/live")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "alive"
    assert "pid" in body


def test_health_ready(client):
    res = client.get("/health/ready")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ready"
    assert body["checks"]["database"]["status"] == "ok"


def test_health_dhis2_not_configured(client):
    res = client.get("/health/dhis2")
    assert res.status_code == 200
    body = res.json()
    assert "configured" in body
    assert "status" in body


def test_health_endpoints_are_public(client):
    for path in ("/health", "/health/live", "/health/ready", "/health/dhis2"):
        res = client.get(path)
        assert res.status_code in {200, 503}
