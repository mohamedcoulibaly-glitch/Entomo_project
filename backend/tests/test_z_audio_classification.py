"""Tests de classification audio et endpoints /captures/*/analyser."""

import os
from pathlib import Path

import pytest

from app.services.audio_classifier import classify_audio_file, generate_test_wav, SPECIES_BANDS

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "audio"


@pytest.fixture(scope="session", autouse=True)
def audio_fixtures():
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    files = {
        "an_gambiae_450hz.wav": 450.0,
        "ae_aegypti_600hz.wav": 600.0,
    }
    for name, frequency in files.items():
        path = FIXTURES_DIR / name
        if not path.exists():
            generate_test_wav(path, frequency_hz=frequency)
    yield


def _create_audio_capture(client, headers, site_id, wav_name="an_gambiae_450hz.wav", methode="audio"):
    res = client.post("/api/v1/captures/", json={
        "site_id": site_id,
        "date_capture": "2024-06-15T08:00:00",
        "espece": "Inconnu",
        "methode_capture": methode,
    }, headers=headers)
    assert res.status_code == 200
    capture_id = res.json()["id"]
    wav_path = FIXTURES_DIR / wav_name
    with wav_path.open("rb") as wav_file:
        upload = client.post(
            f"/api/v1/captures/{capture_id}/upload-audio",
            files={"file": (wav_name, wav_file.read(), "audio/wav")},
            headers=headers,
        )
    assert upload.status_code == 200
    return capture_id


def test_audio_classifier_deterministic():
    wav_path = FIXTURES_DIR / "an_gambiae_450hz.wav"
    first = classify_audio_file(str(wav_path))
    second = classify_audio_file(str(wav_path))
    assert first.espece_detectee == second.espece_detectee
    assert first.confiance == second.confiance
    assert first.frequence == second.frequence


def test_audio_classifier_detects_gambiae_frequency():
    result = classify_audio_file(str(FIXTURES_DIR / "an_gambiae_450hz.wav"))
    assert result.espece_detectee == "An. gambiae"
    assert 400 <= result.frequence <= 500
    assert sum(result.distribution.values()) == pytest.approx(1.0, rel=1e-3)


def test_analyser_capture_with_audio(client, admin_token_headers, site1_id, db):
    from app.models.model import MLModel

    audio_model = MLModel(
        nom="test-audio-model",
        version="1.0",
        type_modele="audio",
        architecture="feature-based-v1",
        deploye=True,
        actif=True,
    )
    db.add(audio_model)
    db.commit()

    capture_id = _create_audio_capture(client, admin_token_headers, site1_id)
    res = client.post(f"/api/v1/captures/{capture_id}/analyser", json={}, headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["capture_id"] == capture_id
    assert data["espece_detectee"] in SPECIES_BANDS
    assert 0 < data["confiance"] <= 1
    assert data["distribution"]
    assert data["frequence"] > 0
    assert data["modele"]
    assert data["temps_traitement"] >= 0


def test_analyser_capture_no_audio(client, admin_token_headers, site1_id):
    res = client.post("/api/v1/captures/", json={
        "site_id": site1_id,
        "date_capture": "2024-06-15T08:00:00",
        "espece": "Anopheles gambiae",
        "methode_capture": "audio",
    }, headers=admin_token_headers)
    capture_id = res.json()["id"]
    res = client.post(f"/api/v1/captures/{capture_id}/analyser", json={}, headers=admin_token_headers)
    assert res.status_code == 400
    assert "audio" in res.json()["detail"].lower()


def test_analyser_capture_not_found(client, admin_token_headers):
    res = client.post("/api/v1/captures/99999/analyser", json={}, headers=admin_token_headers)
    assert res.status_code == 404


def test_analyser_uses_deployed_audio_model(client, admin_token_headers, site1_id, db):
    from app.models.model import MLModel

    audio_model = MLModel(
        nom="deployed-audio-v1",
        version="1.0",
        type_modele="audio",
        architecture="feature-based-v1",
        deploye=True,
        actif=True,
    )
    db.add(audio_model)
    db.commit()

    capture_id = _create_audio_capture(client, admin_token_headers, site1_id)
    res = client.post(f"/api/v1/captures/{capture_id}/analyser", json={}, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["modele"] == "deployed-audio-v1"


def test_list_captures_filter_methode_audio(client, admin_token_headers, site1_id):
    _create_audio_capture(client, admin_token_headers, site1_id)
    client.post("/api/v1/captures/", json={
        "site_id": site1_id,
        "date_capture": "2024-06-16T08:00:00",
        "espece": "Culex pipiens",
        "methode_capture": "piège_lumière",
    }, headers=admin_token_headers)

    res = client.get("/api/v1/captures/?methode_capture=audio", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    for capture in data:
        assert "audio" in capture["methode_capture"].lower()


def test_stats_audio(client, admin_token_headers, site1_id):
    capture_id = _create_audio_capture(client, admin_token_headers, site1_id)
    client.post(f"/api/v1/captures/{capture_id}/analyser", json={}, headers=admin_token_headers)

    res = client.get("/api/v1/captures/stats-audio", headers=admin_token_headers)
    assert res.status_code == 200
    stats = res.json()
    assert stats["echantillons"] >= 1
    assert stats["precision"] > 0
    assert stats["detection"] > 0


def test_valider_still_requires_statut(client, admin_token_headers, site1_id):
    res = client.post("/api/v1/captures/", json={
        "site_id": site1_id,
        "date_capture": "2024-06-15T08:00:00",
        "espece": "Anopheles gambiae",
    }, headers=admin_token_headers)
    capture_id = res.json()["id"]
    res = client.post(f"/api/v1/captures/{capture_id}/valider", json={"action": "analyser"}, headers=admin_token_headers)
    assert res.status_code == 422
