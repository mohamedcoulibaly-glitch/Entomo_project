"""Tests intégration backend — smoke endpoints critiques."""

def test_health_endpoints(client):
    assert client.get("/health").status_code in {200, 503}
    assert client.get("/health/live").status_code == 200
    assert client.get("/health/ready").status_code in {200, 503}


def test_dhis2_status_authenticated(client, admin_token_headers):
    res = client.get("/api/v1/dhis2/status", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert "conflict_count" in data
    assert "queue_error_count" in data
    assert "sync_percentage" in data


def test_sync_settings_roundtrip(client, admin_token_headers):
    res = client.post(
        "/api/v1/sync/settings",
        json={"auto_sync": True, "frequence": 45, "cache_expiry_hours": 48},
        headers=admin_token_headers,
    )
    assert res.status_code == 200
    got = client.get("/api/v1/sync/settings?extended=true", headers=admin_token_headers)
    assert got.status_code == 200
    assert got.json().get("frequence") == 45
