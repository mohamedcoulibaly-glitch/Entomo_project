"""Tests pour le dashboard (endpoints /api/v1/dashboard/*)."""

def test_dashboard_stats(client, admin_token_headers):
    res = client.get("/api/v1/dashboard/stats", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert "captures" in data
    assert "sites" in data
    assert "utilisateurs" in data


def test_dashboard_stats_unauthenticated(client):
    res = client.get("/api/v1/dashboard/stats")
    assert res.status_code == 401


def _create_capture_dash(client, headers, site_id, espece="Anopheles gambiae"):
    res = client.post("/api/v1/captures/", json={
        "site_id": site_id,
        "date_capture": "2024-06-15T08:00:00",
        "espece": espece,
        "nombre_individus": 5,
    }, headers=headers)
    assert res.status_code == 200


def test_captures_par_espece(client, admin_token_headers, site1_id):
    _create_capture_dash(client, admin_token_headers, site1_id)
    _create_capture_dash(client, admin_token_headers, site1_id)
    _create_capture_dash(client, admin_token_headers, site1_id, "Culex pipiens")

    res = client.get("/api/v1/dashboard/captures-par-espece", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    especes = {d["espece"]: d["count"] for d in data}
    assert "Anopheles gambiae" in especes
    assert "Culex pipiens" in especes


def test_captures_par_site(client, admin_token_headers, site1_id, site2_id):
    _create_capture_dash(client, admin_token_headers, site1_id)
    _create_capture_dash(client, admin_token_headers, site2_id)

    res = client.get("/api/v1/dashboard/captures-par-site", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    sites = {d["site"]: d["count"] for d in data}
    assert sites.get("Site Test 1", 0) >= 1
    assert sites.get("Site Test 2", 0) >= 1


def test_capture_filters_are_applied(client, admin_token_headers, site1_id, site2_id):
    _create_capture_dash(client, admin_token_headers, site1_id, "Anopheles filtre")
    _create_capture_dash(client, admin_token_headers, site2_id, "Culex filtre")

    response = client.get(
        f"/api/v1/captures/?site_id={site1_id}&espece=Anopheles&date_debut=2024-06-01&date_fin=2024-06-30",
        headers=admin_token_headers,
    )
    assert response.status_code == 200
    captures = response.json()
    assert captures
    assert all(capture["site_id"] == site1_id for capture in captures)
    assert all("anopheles" in (capture["espece"] or "").lower() for capture in captures)


def test_dhis2_status_has_dashboard_contract(client, admin_token_headers):
    response = client.get("/api/v1/dhis2/status", headers=admin_token_headers)
    assert response.status_code == 200
    assert {
        "configured", "config_name", "pending_count", "synced_count",
        "error_count", "sync_percentage", "last_status",
    }.issubset(response.json())
