"""Tests des services ML : pipeline runner, évaluation et risque SEIR."""

import time

import pytest

from app.services.epidemic_risk import compute_epidemic_risk, _simulate_seir
from app.services.model_evaluator import evaluate_ml_model
from app.services.pipeline_runner import start_pipeline


def test_simulate_seir_increases_with_beta():
    low = _simulate_seir(population=10000, initial_infected=10, beta=0.1, days=30)
    high = _simulate_seir(population=10000, initial_infected=10, beta=0.6, days=30)
    assert high >= low


def test_compute_epidemic_risk_with_captures(client, admin_token_headers, site1_id, db):
    from app.models.capture import Capture
    from datetime import datetime

    db.add(Capture(
        site_id=site1_id,
        date_capture=datetime.utcnow(),
        espece="An. gambiae",
        nombre_individus=25,
        methode_capture="audio",
    ))
    db.commit()

    result = compute_epidemic_risk(db, [{"id": "densite", "poids": 60}])
    assert result["modele"] == "SEIR-v1"
    assert "risque_global" in result
    assert result["facteurs_utilises"] == 1


def test_evaluate_ml_model_returns_deterministic_metrics(db, ml_model_id):
    from app.models.model import MLModel
    from app.models.capture import Capture
    from datetime import datetime

    eval_model = MLModel(
        nom="EvalIsolation v1",
        version="1.0",
        type_modele="classification",
        architecture="test",
        precision=0.9,
        rappel=0.9,
        f1_score=0.9,
        actif=True,
        deploye=False,
    )
    db.add(eval_model)
    db.flush()

    model = db.query(MLModel).filter(MLModel.id == eval_model.id).first()
    db.add(Capture(
        site_id=1,
        date_capture=datetime.utcnow(),
        espece="An. gambiae",
        espece_corrigee="An. gambiae",
        nombre_individus=5,
        confidence_ia=0.92,
        ml_model_id=model.id,
    ))
    db.add(Capture(
        site_id=1,
        date_capture=datetime.utcnow(),
        espece="Ae. aegypti",
        espece_corrigee="An. gambiae",
        nombre_individus=3,
        confidence_ia=0.75,
        ml_model_id=model.id,
    ))
    db.commit()

    first = evaluate_ml_model(db, model)
    second = evaluate_ml_model(db, model)
    assert first == second
    assert first["echantillon_test"] == 2
    assert 0 <= first["accuracy"] <= 1


def test_pipeline_runner_completes(client, admin_token_headers, ml_model_id):
    res = client.post("/api/v1/modeles/pipelines", json={
        "nom": "Pipeline Runner Test",
        "type_pipeline": "entrainement",
        "ml_model_id": ml_model_id,
    }, headers=admin_token_headers)
    pipeline_id = res.json()["id"]

    started = client.post(f"/api/v1/modeles/pipelines/{pipeline_id}/lancer", headers=admin_token_headers)
    assert started.status_code == 200

    final_status = None
    for _ in range(50):
        detail = client.get(f"/api/v1/modeles/pipelines/{pipeline_id}", headers=admin_token_headers)
        final_status = detail.json()
        if final_status["statut"] in {"termine", "erreur", "arrete"}:
            break
        time.sleep(0.1)

    assert final_status is not None
    assert final_status["statut"] == "termine"
    assert final_status["progression"] == 100
    assert "Métriques" in (final_status.get("logs") or "")


def test_tester_ml_model_endpoint(client, admin_token_headers, ml_model_id):
    res = client.post(f"/api/v1/modeles/ml/{ml_model_id}/tester", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["modele_id"] == ml_model_id
    assert "precision" in data
    assert "f1_score" in data


def test_simuler_risque_endpoint(client, admin_token_headers, site1_id):
    client.post("/api/v1/captures/", json={
        "site_id": site1_id,
        "date_capture": "2024-06-15T08:00:00",
        "espece": "An. gambiae",
        "nombre_individus": 12,
    }, headers=admin_token_headers)
    res = client.post("/api/v1/modeles/risque/simuler", json={
        "facteurs": [{"id": "densite", "poids": 50}],
    }, headers=admin_token_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["modele"] == "SEIR-v1"
    assert "regions" in body
