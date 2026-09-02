"""Phase 3 — ML ONNX : entraînement, registre, analyse image/audio."""

from io import BytesIO
from pathlib import Path
import json

import numpy as np
import pytest
from PIL import Image

from app.services.audio_classifier import classify_audio_file, generate_test_wav
from app.services.image_classifier import classify_image_file
from app.services.ml_training import ensure_default_models, train_audio_model, train_image_model
from app.services.model_registry import load_manifest, registry_model_path

FIXTURES_AUDIO = Path(__file__).parent / "fixtures" / "audio"
FIXTURES_IMAGE = Path(__file__).parent / "fixtures" / "image"


@pytest.fixture(scope="module")
def onnx_models(db):
    """Génère ou met à niveau les artefacts ONNX pour le module de tests."""
    from app.services.audio_preprocessing import FEATURE_SIZE

    audio_manifest = registry_model_path("audio", "manifest.json")
    if audio_manifest.is_file():
        try:
            data = json.loads(audio_manifest.read_text(encoding="utf-8"))
            if data.get("feature_size") != FEATURE_SIZE:
                audio_manifest.unlink(missing_ok=True)
                onnx_path = registry_model_path("audio", data.get("onnx_file", "entomo-audio-v1.onnx"))
                if onnx_path.is_file():
                    onnx_path.unlink()
        except (json.JSONDecodeError, OSError):
            pass
    return ensure_default_models(db)


def test_train_audio_model_exports_onnx(db):
    result = train_audio_model(db, pipeline_name="pytest-audio")
    assert Path(result.model_path).is_file()
    assert result.precision > 0
    assert result.f1_score > 0
    assert len(result.labels) >= 2
    manifest = load_manifest("audio")
    assert manifest is not None
    assert manifest["onnx_file"] == "entomo-audio-v1.onnx"


def test_train_image_model_exports_onnx(db):
    result = train_image_model(db, pipeline_name="pytest-image")
    assert Path(result.model_path).is_file()
    assert result.precision > 0
    manifest = load_manifest("image")
    assert manifest is not None
    assert manifest["feature_size"] == 48


def test_onnx_audio_inference(onnx_models):
    wav = FIXTURES_AUDIO / "an_gambiae_450hz.wav"
    if not wav.is_file():
        FIXTURES_AUDIO.mkdir(parents=True, exist_ok=True)
        generate_test_wav(wav, frequency_hz=450.0)

    model_path = registry_model_path("audio", "entomo-audio-v1.onnx")
    assert model_path.is_file()
    result = classify_audio_file(str(wav), model_chemin=str(model_path), model_nom="entomo-audio-v1")
    assert result.espece_detectee
    assert 0 < result.confiance <= 1
    assert "(onnx)" in result.modele


def test_onnx_image_inference(onnx_models):
    FIXTURES_IMAGE.mkdir(parents=True, exist_ok=True)
    img_path = FIXTURES_IMAGE / "gambiae_sample.png"
    if not img_path.is_file():
        arr = np.zeros((64, 64, 3), dtype=np.uint8)
        arr[:, :] = (30, 90, 180)
        Image.fromarray(arr, mode="RGB").save(img_path)

    model_path = registry_model_path("image", "entomo-image-v1.onnx")
    assert model_path.is_file()
    result = classify_image_file(str(img_path), model_chemin=str(model_path), model_nom="entomo-image-v1")
    assert result.espece_detectee
    assert 0 < result.confiance <= 1
    assert result.distribution


def test_model_registry_endpoint(client, admin_token_headers, onnx_models):
    res = client.get("/api/v1/modeles/registry", headers=admin_token_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["ready"] is True
    assert body["audio"]["name"] == "entomo-audio-v1"
    assert body["image"]["name"] == "entomo-image-v1"


def _create_image_capture(client, headers, site_id):
    res = client.post("/api/v1/captures/", json={
        "site_id": site_id,
        "date_capture": "2024-06-15T08:00:00",
        "espece": "Inconnu",
        "methode_capture": "photo",
    }, headers=headers)
    assert res.status_code == 200
    capture_id = res.json()["id"]

    arr = np.zeros((64, 64, 3), dtype=np.uint8)
    arr[:, :] = (30, 90, 180)
    buffer = BytesIO()
    Image.fromarray(arr, mode="RGB").save(buffer, format="PNG")
    buffer.seek(0)
    upload = client.post(
        f"/api/v1/captures/{capture_id}/upload-image",
        files={"file": ("specimen.png", buffer.read(), "image/png")},
        headers=headers,
    )
    assert upload.status_code == 200
    return capture_id


def test_analyser_image_capture(client, admin_token_headers, site1_id, db, onnx_models):
    from app.models.model import MLModel
    from app.services.ml_training import train_image_model

    image_model = db.query(MLModel).filter(MLModel.nom == "entomo-image-v1").first()
    if not image_model:
        train_result = train_image_model(db)
        image_model = MLModel(
            nom="entomo-image-v1",
            version="1.0.0",
            type_modele="classification",
            architecture="RandomForest+histogram48",
            chemin=train_result.model_path,
            precision=train_result.precision,
            rappel=train_result.rappel,
            f1_score=train_result.f1_score,
            actif=True,
            deploye=True,
        )
        db.add(image_model)
    else:
        image_model.deploye = True
        image_model.actif = True
    db.commit()

    capture_id = _create_image_capture(client, admin_token_headers, site1_id)
    res = client.post(
        f"/api/v1/captures/{capture_id}/analyser-image",
        json={},
        headers=admin_token_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["capture_id"] == capture_id
    assert data["espece_detectee"]
    assert 0 < data["confiance"] <= 1
    assert data["distribution"]

    detail = client.get(f"/api/v1/captures/{capture_id}", headers=admin_token_headers)
    assert detail.status_code == 200
    capture = detail.json()
    assert capture["image_metadata"] is not None
    assert capture["statut"] == "a_valider"


def test_analyser_image_no_image(client, admin_token_headers, site1_id):
    res = client.post("/api/v1/captures/", json={
        "site_id": site1_id,
        "date_capture": "2024-06-15T08:00:00",
        "espece": "Anopheles gambiae",
    }, headers=admin_token_headers)
    capture_id = res.json()["id"]
    res = client.post(
        f"/api/v1/captures/{capture_id}/analyser-image",
        json={},
        headers=admin_token_headers,
    )
    assert res.status_code == 400
    assert "image" in res.json()["detail"].lower()


def test_audio_stats_uses_ground_truth(db, client, admin_token_headers, site1_id):
    from datetime import datetime
    from app.models.capture import Capture

    db.add(Capture(
        site_id=site1_id,
        date_capture=datetime.utcnow(),
        espece="An. gambiae",
        espece_corrigee="An. gambiae",
        audio_path="fixtures/audio/an_gambiae_450hz.wav",
        audio_metadata={"modele": "test"},
        confidence_ia=0.5,
        methode_capture="audio",
    ))
    db.add(Capture(
        site_id=site1_id,
        date_capture=datetime.utcnow(),
        espece="Ae. aegypti",
        espece_corrigee="An. gambiae",
        audio_path="fixtures/audio/ae_aegypti_600hz.wav",
        audio_metadata={"modele": "test"},
        confidence_ia=0.9,
        methode_capture="audio",
    ))
    db.commit()

    from app.crud.capture import crud_capture
    stats = crud_capture.get_audio_stats(db)
    assert stats["echantillons"] == 2
    assert stats["precision"] == 0.5
