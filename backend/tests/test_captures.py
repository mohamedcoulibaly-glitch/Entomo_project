"""Tests CRUD et validation des captures (endpoints /api/v1/captures/*)."""

from datetime import datetime


def test_list_captures_empty(client, admin_token_headers):
    res = client.get("/api/v1/captures/", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json() == []


def _create_capture(client, headers, site_id):
    res = client.post("/api/v1/captures/", json={
        "site_id": site_id,
        "date_capture": "2024-06-15T08:00:00",
        "espece": "Anopheles gambiae",
        "nombre_individus": 10,
        "sexe": "femelle",
        "methode_capture": "piège_lumière",
    }, headers=headers)
    assert res.status_code == 200
    return res.json()["id"]


def test_create_capture_success(client, admin_token_headers, site1_id):
    cid = _create_capture(client, admin_token_headers, site1_id)
    res = client.get(f"/api/v1/captures/{cid}", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["espece"] == "Anopheles gambiae"
    assert data["nombre_individus"] == 10
    assert data["statut"] == "a_valider"
    assert data["valide"] is False


def test_create_capture_invalid_site(client, admin_token_headers):
    res = client.post("/api/v1/captures/", json={
        "site_id": 99999,
        "date_capture": "2024-06-15T08:00:00",
        "espece": "Anopheles gambiae",
    }, headers=admin_token_headers)
    assert res.status_code == 404


def test_create_capture_missing_required(client, admin_token_headers):
    res = client.post("/api/v1/captures/", json={}, headers=admin_token_headers)
    assert res.status_code == 422


def test_create_capture_invalid_date(client, admin_token_headers, site1_id):
    res = client.post("/api/v1/captures/", json={
        "site_id": site1_id,
        "date_capture": "invalid-date",
        "espece": "Anopheles gambiae",
    }, headers=admin_token_headers)
    assert res.status_code == 422


def test_get_capture(client, admin_token_headers, site1_id):
    cid = _create_capture(client, admin_token_headers, site1_id)
    res = client.get(f"/api/v1/captures/{cid}", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["id"] == cid


def test_get_capture_not_found(client, admin_token_headers):
    res = client.get("/api/v1/captures/99999", headers=admin_token_headers)
    assert res.status_code == 404


def test_update_capture(client, admin_token_headers, site1_id):
    cid = _create_capture(client, admin_token_headers, site1_id)
    res = client.put(f"/api/v1/captures/{cid}", json={"nombre_individus": 25, "notes": "Mis à jour"},
                     headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["nombre_individus"] == 25
    assert res.json()["notes"] == "Mis à jour"


def test_list_captures_with_filters(client, admin_token_headers, site1_id, site2_id):
    _create_capture(client, admin_token_headers, site1_id)
    client.post("/api/v1/captures/", json={
        "site_id": site2_id, "date_capture": "2024-06-16T08:00:00",
        "espece": "Culex pipiens", "nombre_individus": 5,
    }, headers=admin_token_headers)
    res = client.get("/api/v1/captures/?site_id=1", headers=admin_token_headers)
    assert res.status_code == 200
    for cap in res.json():
        assert cap["site_id"] == site1_id


def test_a_valider(client, admin_token_headers, site1_id):
    _create_capture(client, admin_token_headers, site1_id)
    res = client.get("/api/v1/captures/a-valider", headers=admin_token_headers)
    assert res.status_code == 200
    for cap in res.json():
        assert cap["statut"] == "a_valider"


def test_valider_capture(client, labo_token_headers, site1_id):
    cid = _create_capture(client, labo_token_headers, site1_id)
    res = client.post(f"/api/v1/captures/{cid}/valider", json={"statut": "valide"},
                      headers=labo_token_headers)
    assert res.status_code == 200
    assert res.json()["statut"] == "valide"
    assert res.json()["valide"] is True


def test_rejeter_capture(client, labo_token_headers, site1_id):
    cid = _create_capture(client, labo_token_headers, site1_id)
    res = client.post(f"/api/v1/captures/{cid}/valider", json={
        "statut": "rejete", "notes": "Spécimen non identifiable",
    }, headers=labo_token_headers)
    assert res.status_code == 200
    assert res.json()["statut"] == "rejete"


def test_valider_capture_invalid_status(client, labo_token_headers, site1_id):
    cid = _create_capture(client, labo_token_headers, site1_id)
    res = client.post(f"/api/v1/captures/{cid}/valider", json={"statut": "invalid_status"},
                      headers=labo_token_headers)
    assert res.status_code == 200


def test_valider_capture_not_found(client, labo_token_headers):
    res = client.post("/api/v1/captures/99999/valider", json={"statut": "valide"},
                      headers=labo_token_headers)
    assert res.status_code == 404


def test_delete_capture(client, admin_token_headers, site1_id):
    cid = _create_capture(client, admin_token_headers, site1_id)
    res = client.delete(f"/api/v1/captures/{cid}", headers=admin_token_headers)
    assert res.status_code == 200
    res = client.get(f"/api/v1/captures/{cid}", headers=admin_token_headers)
    assert res.status_code == 404


def test_upload_image(client, admin_token_headers, site1_id):
    cid = _create_capture(client, admin_token_headers, site1_id)
    res = client.post(f"/api/v1/captures/{cid}/upload-image",
                      files={"file": ("test.jpg", b"fake-image-data", "image/jpeg")},
                      headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["image_path"] is not None


def test_upload_audio(client, admin_token_headers, site1_id):
    cid = _create_capture(client, admin_token_headers, site1_id)
    res = client.post(f"/api/v1/captures/{cid}/upload-audio",
                      files={"file": ("test.wav", b"fake-audio-data", "audio/wav")},
                      headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["audio_path"] is not None
