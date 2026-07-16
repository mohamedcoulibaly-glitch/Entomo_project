"""Tests pour les indicateurs de rapport OMS (endpoints /api/v1/indicateurs/*)."""


def test_list_indicateurs_empty(client, admin_token_headers):
    res = client.get("/api/v1/indicateurs/", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_create_indicateur(client, admin_token_headers):
    res = client.post("/api/v1/indicateurs/", json={
        "nom": "Indice de diversité",
        "description": "Mesure la diversité des espèces",
        "formule": "poids_10",
        "unite": "index",
    }, headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["nom"] == "Indice de diversité"
    assert data["id"] is not None
    return data["id"]


def test_get_indicateur(client, admin_token_headers):
    ind_id = test_create_indicateur(client, admin_token_headers)
    res = client.get(f"/api/v1/indicateurs/{ind_id}", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["nom"] == "Indice de diversité"


def test_get_indicateur_not_found(client, admin_token_headers):
    res = client.get("/api/v1/indicateurs/9999", headers=admin_token_headers)
    assert res.status_code == 404


def test_update_indicateur(client, admin_token_headers):
    ind_id = test_create_indicateur(client, admin_token_headers)
    res = client.put(f"/api/v1/indicateurs/{ind_id}", json={
        "nom": "Indice mis à jour",
        "seuil_bas": 20.0,
    }, headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["nom"] == "Indice mis à jour"
    assert data["seuil_bas"] == 20.0


def test_delete_indicateur(client, admin_token_headers):
    ind_id = test_create_indicateur(client, admin_token_headers)
    res = client.delete(f"/api/v1/indicateurs/{ind_id}", headers=admin_token_headers)
    assert res.status_code == 200
    res2 = client.get(f"/api/v1/indicateurs/{ind_id}", headers=admin_token_headers)
    assert res2.status_code == 404


def test_indicateur_config(client, admin_token_headers):
    ind_id = test_create_indicateur(client, admin_token_headers)
    res = client.post("/api/v1/indicateurs/config", json={
        "facteurs": [{"id": ind_id, "poids": 80, "seuil_alerte": 75.0}],
    }, headers=admin_token_headers)
    assert res.status_code == 200
    assert "sauvegardée" in res.json()["message"]


def test_reorder_indicateurs(client, admin_token_headers):
    res = client.put("/api/v1/indicateurs/reorder", json={
        "ordre": [1, 2, 3],
    }, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["message"] == "Ordre mis à jour"


def test_reinitialiser_indicateurs(client, admin_token_headers):
    ind_id = test_create_indicateur(client, admin_token_headers)
    res = client.post("/api/v1/indicateurs/reinitialiser", json={}, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["message"] == "Configuration réinitialisée"
    ind = client.get(f"/api/v1/indicateurs/{ind_id}", headers=admin_token_headers).json()
    assert ind["seuil_bas"] == 10.0


def test_indicateurs_unauthenticated(client):
    res = client.get("/api/v1/indicateurs/")
    assert res.status_code == 401
