"""Tests CRUD pour les sites sentinelles (endpoints /api/v1/sites/*)."""

def test_list_sites(client, admin_token_headers):
    res = client.get("/api/v1/sites/", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 2


def test_list_sites_filter_region(client, admin_token_headers):
    res = client.get("/api/v1/sites/?region=Dakar", headers=admin_token_headers)
    assert res.status_code == 200
    for site in res.json():
        assert site["region"] == "Dakar"


def test_list_sites_filter_actif(client, admin_token_headers):
    res = client.get("/api/v1/sites/?actif=true", headers=admin_token_headers)
    assert res.status_code == 200
    for site in res.json():
        assert site["actif"] is True


def test_list_sites_unauthorized(client):
    res = client.get("/api/v1/sites/")
    assert res.status_code == 401


def test_create_site_success(client, admin_token_headers):
    new_site = {
        "nom": "Nouveau Site", "code": "NEW-001",
        "region": "Kédougou", "district": "Kédougou",
        "latitude": 12.5, "longitude": -12.1,
        "zone_type": "rural", "type_environnement": "forêt",
    }
    res = client.post("/api/v1/sites/", json=new_site, headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["nom"] == "Nouveau Site"
    assert data["code"] == "NEW-001"
    assert data["region"] == "Kédougou"
    assert data["actif"] is True


def test_create_site_duplicate_code(client, admin_token_headers, site1_id):
    res = client.post("/api/v1/sites/", json={
        "nom": "Duplicate Site", "code": "TST-001",
        "region": "Dakar", "district": "Dakar",
        "latitude": 14.7, "longitude": -17.4,
    }, headers=admin_token_headers)
    assert res.status_code == 400
    assert "code" in res.json()["detail"].lower()


def test_create_site_empty_body(client, admin_token_headers):
    res = client.post("/api/v1/sites/", json={}, headers=admin_token_headers)
    assert res.status_code == 422


def test_create_site_unauthorized(client):
    res = client.post("/api/v1/sites/", json={
        "nom": "Unauth Site", "code": "UNA-001",
        "region": "Dakar", "district": "Dakar",
        "latitude": 14.7, "longitude": -17.4,
    })
    assert res.status_code == 401


def test_get_site(client, admin_token_headers, site1_id):
    res = client.get(f"/api/v1/sites/{site1_id}", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == site1_id
    assert data["code"] == "TST-001"


def test_get_site_not_found(client, admin_token_headers):
    res = client.get("/api/v1/sites/99999", headers=admin_token_headers)
    assert res.status_code == 404


def test_update_site(client, admin_token_headers, site1_id):
    res = client.put(f"/api/v1/sites/{site1_id}", json={"nom": "Site Modifié"}, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["nom"] == "Site Modifié"


def test_delete_site(client, admin_token_headers):
    res = client.post("/api/v1/sites/", json={
        "nom": "À Supprimer", "code": "DEL-001",
        "region": "Dakar", "district": "Dakar",
        "latitude": 14.7, "longitude": -17.4,
    }, headers=admin_token_headers)
    site_id = res.json()["id"]
    res = client.delete(f"/api/v1/sites/{site_id}", headers=admin_token_headers)
    assert res.status_code == 200
    res = client.get(f"/api/v1/sites/{site_id}", headers=admin_token_headers)
    assert res.status_code == 404


def test_add_activity(client, admin_token_headers, site1_id):
    res = client.post(f"/api/v1/sites/{site1_id}/activites", json={
        "type_activite": "visite_terrain",
        "description": "Visite de routine",
        "date_activite": "2024-06-15T10:00:00",
    }, headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["type_activite"] == "visite_terrain"
    assert data["site_id"] == site1_id


def test_list_activities(client, admin_token_headers, site1_id):
    res = client.get(f"/api/v1/sites/{site1_id}/activites", headers=admin_token_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_list_activities_no_site(client, admin_token_headers):
    res = client.get("/api/v1/sites/99999/activites", headers=admin_token_headers)
    assert res.status_code == 404
