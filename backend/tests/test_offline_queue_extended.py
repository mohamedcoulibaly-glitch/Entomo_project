"""Tests file hors-ligne étendue et sync DHIS2 granulaire."""

from unittest.mock import patch


def test_enqueue_offline_capture(client, admin_token_headers):
    res = client.post(
        "/api/v1/sync/queue",
        headers=admin_token_headers,
        json={
            "resource_type": "capture",
            "action": "create",
            "client_id": "test-client-001",
            "payload": {
                "client_id": "test-client-001",
                "site_id": 1,
                "espece": "An. gambiae",
                "nombre_individus": 2,
                "methode_capture": "CDC_LIGHT_TRAP",
                "statut": "a_valider",
                "date_capture": "2026-09-01",
            },
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["resource_type"] == "capture"
    assert body["client_id"] == "test-client-001"


def test_process_offline_queue_capture(client, admin_token_headers, site1_id, admin_id):
    client.post(
        "/api/v1/sync/queue",
        headers=admin_token_headers,
        json={
            "resource_type": "capture",
            "action": "create",
            "client_id": "test-client-002",
            "payload": {
                "site_id": site1_id,
                "utilisateur_id": admin_id,
                "espece": "Ae. aegypti",
                "nombre_individus": 1,
                "methode_capture": "audio",
                "statut": "a_valider",
                "date_capture": "2026-09-01",
            },
        },
    )
    res = client.post("/api/v1/sync/queue/process", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["synced"] >= 1


def test_health_dhis2_not_configured(client):
    res = client.get("/health/dhis2")
    assert res.status_code == 200
    body = res.json()
    assert "configured" in body


def test_dhis2_sync_capture_endpoint_requires_valid_capture(client, admin_token_headers, site1_id, admin_id):
    create = client.post(
        "/api/v1/captures/",
        headers=admin_token_headers,
        json={
            "site_id": site1_id,
            "utilisateur_id": admin_id,
            "espece": "An. gambiae",
            "nombre_individus": 1,
            "methode_capture": "FILET",
            "statut": "a_valider",
            "date_capture": "2026-09-01",
        },
    )
    capture_id = create.json()["id"]
    res = client.post(f"/api/v1/dhis2/sync/capture/{capture_id}", headers=admin_token_headers)
    assert res.status_code in {400, 404, 502}


def test_dhis2_sync_capture_validated_mock(client, admin_token_headers, site1_id, admin_id):
    create = client.post(
        "/api/v1/captures/",
        headers=admin_token_headers,
        json={
            "site_id": site1_id,
            "utilisateur_id": admin_id,
            "espece": "An. gambiae",
            "nombre_individus": 3,
            "methode_capture": "FILET",
            "statut": "a_valider",
            "date_capture": "2026-09-01",
        },
    )
    capture_id = create.json()["id"]
    client.post(
        f"/api/v1/captures/{capture_id}/valider",
        headers=admin_token_headers,
        json={"statut": "valide", "espece_corrigee": "An. gambiae"},
    )
    with patch("app.api.v1.endpoints.dhis2.push_capture_to_dhis2", return_value=(True, "ok", {}, 1)):
        res = client.post(f"/api/v1/dhis2/sync/capture/{capture_id}", headers=admin_token_headers)
    assert res.status_code == 200
