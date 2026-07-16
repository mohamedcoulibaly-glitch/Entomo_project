"""Tests CRUD pour les rapports (endpoints /api/v1/rapports/*)."""

def test_list_reports_empty(client, admin_token_headers):
    res = client.get("/api/v1/rapports/", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_create_report_success(client, admin_token_headers):
    res = client.post("/api/v1/rapports/", json={
        "titre": "Rapport Mensuel",
        "type": "mensuel",
        "contenu": "Contenu du rapport",
        "format_fichier": "pdf",
        "periode_debut": "2024-01-01T00:00:00",
        "periode_fin": "2024-01-31T23:59:59",
    }, headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["titre"] == "Rapport Mensuel"
    assert data["type"] == "mensuel"
    assert "id" in data
    return data["id"]


def test_create_report_missing_title(client, admin_token_headers):
    res = client.post("/api/v1/rapports/", json={"type": "mensuel"}, headers=admin_token_headers)
    assert res.status_code == 422


def test_get_report(client, admin_token_headers):
    rid = test_create_report_success(client, admin_token_headers)
    res = client.get(f"/api/v1/rapports/{rid}", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["id"] == rid


def test_get_report_not_found(client, admin_token_headers):
    res = client.get("/api/v1/rapports/99999", headers=admin_token_headers)
    assert res.status_code == 404


def test_update_report(client, admin_token_headers):
    rid = test_create_report_success(client, admin_token_headers)
    res = client.put(f"/api/v1/rapports/{rid}", json={"titre": "Rapport Modifié"},
                     headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["titre"] == "Rapport Modifié"


def test_delete_report(client, admin_token_headers):
    rid = test_create_report_success(client, admin_token_headers)
    res = client.delete(f"/api/v1/rapports/{rid}", headers=admin_token_headers)
    assert res.status_code == 200
    res = client.get(f"/api/v1/rapports/{rid}", headers=admin_token_headers)
    assert res.status_code == 404


def test_list_reports_by_type(client, admin_token_headers):
    test_create_report_success(client, admin_token_headers)
    res = client.get("/api/v1/rapports/?type_rapport=mensuel", headers=admin_token_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1
    for r in res.json():
        assert r["type"] == "mensuel"


def test_programmer_rapport(client, admin_token_headers):
    rid = test_create_report_success(client, admin_token_headers)
    res = client.post(f"/api/v1/rapports/{rid}/programmer", json={
        "recurrence": "hebdomadaire",
        "heure_envoi": "08:00",
        "destinataires": "test@entomo.sn",
        "actif": True,
    }, headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["recurrence"] == "hebdomadaire"
    assert data["rapport_id"] == rid


def test_programmer_rapport_not_found(client, admin_token_headers):
    res = client.post("/api/v1/rapports/99999/programmer", json={
        "recurrence": "quotidienne", "heure_envoi": "08:00",
        "destinataires": "test@test.com",
    }, headers=admin_token_headers)
    assert res.status_code == 404


def test_list_active_programmes(client, admin_token_headers):
    res = client.get("/api/v1/rapports/programmes/actifs", headers=admin_token_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_unauthorized_access(client):
    res = client.get("/api/v1/rapports/")
    assert res.status_code == 401
