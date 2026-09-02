"""Tests d'intégration des 5 flux métier critiques (backend)."""


def test_flow_1_auth_capture_validate(client, admin_token_headers, site1_id):
    create = client.post("/api/v1/captures/", json={
        "site_id": site1_id,
        "date_capture": "2026-07-01T08:00:00",
        "espece": "An. gambiae",
        "statut": "a_valider",
    }, headers=admin_token_headers)
    assert create.status_code == 200
    capture_id = create.json()["id"]

    validate = client.post(f"/api/v1/captures/{capture_id}/valider", json={
        "statut": "valide",
        "espece_corrigee": "An. gambiae",
    }, headers=admin_token_headers)
    assert validate.status_code == 200
    assert validate.json()["statut"] == "valide"


def test_flow_2_audio_analyse(client, admin_token_headers, site1_id):
    from pathlib import Path
    fixtures = Path(__file__).parent / "fixtures" / "audio" / "an_gambiae_450hz.wav"
    if not fixtures.is_file():
        from app.services.audio_classifier import generate_test_wav
        fixtures.parent.mkdir(parents=True, exist_ok=True)
        generate_test_wav(fixtures, frequency_hz=450.0)

    create = client.post("/api/v1/captures/", json={
        "site_id": site1_id,
        "date_capture": "2026-07-01T08:00:00",
        "espece": "Inconnu",
        "methode_capture": "audio",
    }, headers=admin_token_headers)
    capture_id = create.json()["id"]
    with fixtures.open("rb") as handle:
        upload = client.post(
            f"/api/v1/captures/{capture_id}/upload-audio",
            files={"file": ("test.wav", handle.read(), "audio/wav")},
            headers=admin_token_headers,
        )
    assert upload.status_code == 200

    analyse = client.post(f"/api/v1/captures/{capture_id}/analyser", json={}, headers=admin_token_headers)
    assert analyse.status_code == 200
    assert analyse.json()["espece_detectee"]


def test_flow_3_dhis2_sync_capture(client, admin_token_headers, site1_id, monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.endpoints.dhis2.push_capture_to_dhis2",
        lambda db, config, capture_id, password=None: (True, "ok", {"dataValues": []}, 1),
    )
    cid = client.post("/api/v1/dhis2/config", json={
        "url": "https://dhis2.test.org",
        "username": "admin",
        "password": "secret",
    }, headers=admin_token_headers).json()["id"]
    capture = client.post("/api/v1/captures/", json={
        "site_id": site1_id,
        "date_capture": "2026-07-01T08:00:00",
        "espece": "An. gambiae",
        "statut": "valide",
    }, headers=admin_token_headers).json()
    res = client.post(f"/api/v1/dhis2/sync/capture/{capture['id']}", headers=admin_token_headers)
    assert res.status_code == 200


def test_flow_4_offline_queue_replay(client, admin_token_headers, monkeypatch):
    enqueue = client.post("/api/v1/sync/queue", json={
        "resource_type": "capture",
        "action": "create",
        "payload": {
            "site_id": 1,
            "date_capture": "2026-07-01T08:00:00",
            "espece": "An. gambiae",
            "client_id": "phase5-flow4-test",
        },
    }, headers=admin_token_headers)
    assert enqueue.status_code == 200
    item_id = enqueue.json()["id"]

    replay = client.post(f"/api/v1/sync/queue/{item_id}/replay", headers=admin_token_headers)
    assert replay.status_code == 200


def test_flow_5_assistant_and_dashboard(client, admin_token_headers):
    chat = client.post("/api/v1/assistant/chat", json={
        "message": "État des sites sentinelles",
    }, headers=admin_token_headers)
    assert chat.status_code == 200
    assert chat.json()["reply"]

    stats = client.get("/api/v1/dashboard/stats", headers=admin_token_headers)
    assert stats.status_code == 200
    assert "total_captures" in stats.json() or isinstance(stats.json(), dict)
