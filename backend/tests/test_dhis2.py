"""Tests pour les endpoints DHIS2 (endpoints /api/v1/dhis2/*)."""

def test_list_configs_empty(client, admin_token_headers):
    res = client.get("/api/v1/dhis2/config", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_create_config(client, admin_token_headers):
    res = client.post("/api/v1/dhis2/config", json={
        "nom": "DHIS2 Test", "url": "https://dhis2.test.org",
        "username": "testuser", "password": "testpass",
        "org_unit": "OU_123", "data_set": "DS_456",
        "periode": "202401", "actif": True,
    }, headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["nom"] == "DHIS2 Test"
    assert data["url"] == "https://dhis2.test.org"
    assert "password" not in data
    assert "hashed_password" not in data
    assert "id" in data
    return data["id"]


def test_create_config_minimal(client, admin_token_headers):
    res = client.post("/api/v1/dhis2/config", json={
        "url": "https://dhis2.minimal.org",
        "password": "minpass",
    }, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["url"] == "https://dhis2.minimal.org"


def test_get_config(client, admin_token_headers):
    cid = test_create_config(client, admin_token_headers)
    res = client.get(f"/api/v1/dhis2/config/{cid}", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["id"] == cid


def test_get_config_not_found(client, admin_token_headers):
    res = client.get("/api/v1/dhis2/config/99999", headers=admin_token_headers)
    assert res.status_code == 404


def test_update_config(client, admin_token_headers):
    cid = test_create_config(client, admin_token_headers)
    res = client.put(f"/api/v1/dhis2/config/{cid}", json={"url": "https://updated.test.org"},
                     headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["url"] == "https://updated.test.org"


def test_add_mapping(client, admin_token_headers):
    cid = test_create_config(client, admin_token_headers)
    res = client.post(f"/api/v1/dhis2/config/{cid}/mappings", json={
        "indicateur_local": "total_captures",
        "element_dhis2": "CAPTURE_TOTAL",
        "type_donnee": "integer",
    }, headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["indicateur_local"] == "total_captures"
    assert data["config_id"] == cid
    return data["id"]


def test_add_mapping_missing_field(client, admin_token_headers):
    cid = test_create_config(client, admin_token_headers)
    res = client.post(f"/api/v1/dhis2/config/{cid}/mappings", json={},
                      headers=admin_token_headers)
    assert res.status_code == 422


def test_list_mappings(client, admin_token_headers):
    cid = test_create_config(client, admin_token_headers)
    client.post(f"/api/v1/dhis2/config/{cid}/mappings", json={
        "indicateur_local": "m1", "element_dhis2": "E1",
    }, headers=admin_token_headers)
    client.post(f"/api/v1/dhis2/config/{cid}/mappings", json={
        "indicateur_local": "m2", "element_dhis2": "E2",
    }, headers=admin_token_headers)
    res = client.get(f"/api/v1/dhis2/config/{cid}/mappings", headers=admin_token_headers)
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_delete_mapping(client, admin_token_headers):
    cid = test_create_config(client, admin_token_headers)
    mid = test_add_mapping(client, admin_token_headers)
    res = client.delete(f"/api/v1/dhis2/mappings/{mid}", headers=admin_token_headers)
    assert res.status_code == 200


def test_delete_mapping_not_found(client, admin_token_headers):
    res = client.delete("/api/v1/dhis2/mappings/99999", headers=admin_token_headers)
    assert res.status_code == 404


def test_trigger_sync(client, admin_token_headers):
    cid = test_create_config(client, admin_token_headers)
    res = client.post("/api/v1/dhis2/sync", json={"config_id": cid},
                      headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["statut"] in ("succes", "succès", "echoué", "en_cours")
    assert data["config_id"] == cid


def test_trigger_sync_no_config(client, admin_token_headers):
    res = client.post("/api/v1/dhis2/sync", json={"config_id": 99999},
                      headers=admin_token_headers)
    assert res.status_code == 404


def test_sync_history(client, admin_token_headers):
    cid = test_create_config(client, admin_token_headers)
    # Trigger a sync first
    client.post("/api/v1/dhis2/sync", json={"config_id": cid}, headers=admin_token_headers)
    res = client.get(f"/api/v1/dhis2/sync/historique/{cid}", headers=admin_token_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1


def test_sync_history_no_config(client, admin_token_headers):
    res = client.get("/api/v1/dhis2/sync/historique/99999", headers=admin_token_headers)
    assert res.status_code == 404


def test_unauthorized_access(client):
    res = client.get("/api/v1/dhis2/config")
    assert res.status_code == 401
