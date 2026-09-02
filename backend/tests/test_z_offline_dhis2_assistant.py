"""Tests DHIS2 client, assistant et file hors-ligne."""

from datetime import datetime


def test_build_data_value_set(client, admin_token_headers, monkeypatch):
    from app.services.dhis2_client import build_data_value_set
    from app.models.dhis2 import DHIS2Config, DHIS2Mapping
    from app.db.session import SessionLocal

    cid = client.post("/api/v1/dhis2/config", json={
        "url": "https://dhis2.test.org",
        "username": "admin",
        "password": "secret",
        "org_unit": "OU_TEST",
        "data_set": "DS_TEST",
        "periode": "202601",
    }, headers=admin_token_headers).json()["id"]

    client.post(f"/api/v1/dhis2/config/{cid}/mappings", json={
        "indicateur_local": "total_captures",
        "element_dhis2": "ENTO_TOTAL",
    }, headers=admin_token_headers)

    db = SessionLocal()
    try:
        config = db.query(DHIS2Config).filter(DHIS2Config.id == cid).first()
        payload = build_data_value_set(db, config)
        assert payload["dataSet"] == "DS_TEST"
        assert payload["dataValues"]
        assert payload["dataValues"][0]["dataElement"] == "ENTO_TOTAL"
    finally:
        db.close()


def test_trigger_sync_with_mocked_push(client, admin_token_headers, monkeypatch):
    def fake_push(db, config, password=None):
        return True, "ok", {"dataValues": [{"value": "1"}]}, 1

    monkeypatch.setattr("app.api.v1.endpoints.dhis2.push_data_values", fake_push)
    cid = client.post("/api/v1/dhis2/config", json={
        "url": "https://dhis2.test.org",
        "username": "admin",
        "password": "secret",
    }, headers=admin_token_headers).json()["id"]
    res = client.post("/api/v1/dhis2/sync", json={"config_id": cid}, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["statut"] == "succes"


def test_test_connection_endpoint(client, admin_token_headers, monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.endpoints.dhis2.test_connection",
        lambda config, password=None: (True, "Connexion OK", {"version": "2.40"}),
    )
    cid = client.post("/api/v1/dhis2/config", json={
        "url": "https://dhis2.test.org",
        "username": "admin",
        "password": "secret",
    }, headers=admin_token_headers).json()["id"]
    res = client.post("/api/v1/dhis2/test-connection", json={"config_id": cid}, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["success"] is True


def test_dhis2_pending_endpoint(client, admin_token_headers, site1_id):
    client.post("/api/v1/captures/", json={
        "site_id": site1_id,
        "date_capture": "2024-06-15T08:00:00",
        "espece": "An. gambiae",
        "statut": "a_valider",
    }, headers=admin_token_headers)
    res = client.get("/api/v1/dhis2/pending", headers=admin_token_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1


def test_assistant_chat(client, admin_token_headers):
    res = client.post("/api/v1/assistant/chat", json={"message": "Combien de captures à valider ?"}, headers=admin_token_headers)
    assert res.status_code == 200
    body = res.json()
    assert "reply" in body
    assert "captures_pending" in body["context"]
    assert body.get("provider") == "rules"


def test_assistant_context(client, admin_token_headers):
    res = client.get("/api/v1/assistant/context", headers=admin_token_headers)
    assert res.status_code == 200
    assert "sites_active" in res.json()


def test_offline_queue_flow(client, admin_token_headers, monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.endpoints.sync.push_data_values",
        lambda db, config, password=None: (True, "ok", {"dataValues": []}, 0),
    )
    client.post("/api/v1/dhis2/config", json={
        "url": "https://dhis2.test.org",
        "username": "admin",
        "password": "secret",
        "actif": True,
    }, headers=admin_token_headers)

    created = client.post("/api/v1/sync/queue", json={
        "resource_type": "capture",
        "resource_id": 1,
        "action": "sync",
        "payload": {"code": "SPN-00001"},
    }, headers=admin_token_headers)
    assert created.status_code == 200
    item_id = created.json()["id"]

    listed = client.get("/api/v1/sync/queue", headers=admin_token_headers)
    assert listed.status_code == 200
    assert any(item["id"] == item_id for item in listed.json())

    processed = client.post("/api/v1/sync/queue/process", headers=admin_token_headers)
    assert processed.status_code == 200
    assert processed.json()["processed"] >= 1


def test_sync_settings_cache_expiry(client, admin_token_headers):
    res = client.post("/api/v1/sync/settings", json={
        "cache_expiry_hours": 48,
    }, headers=admin_token_headers)
    assert res.status_code == 200
    saved = client.get("/api/v1/sync/settings?extended=true", headers=admin_token_headers)
    assert saved.json()["cache_expiry_hours"] == 48
