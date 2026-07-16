"""Tests CRUD pour les modèles ML, modèles de risque, et pipelines."""

from pathlib import Path

# ─── ML Models ─────────────────────────────────────────────────────────────────

def test_list_ml_models(client, admin_token_headers):
    res = client.get("/api/v1/modeles/ml", headers=admin_token_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1


def test_list_deployed_ml_models(client, admin_token_headers):
    res = client.get("/api/v1/modeles/ml/deployes", headers=admin_token_headers)
    assert res.status_code == 200
    for m in res.json():
        assert m["deploye"] is True


def test_create_ml_model(client, admin_token_headers):
    res = client.post("/api/v1/modeles/ml", json={
        "nom": "NewML v1", "version": "1.0",
        "type_modele": "classification", "architecture": "VGG16",
        "precision": 0.92, "rappel": 0.90, "f1_score": 0.91,
        "taille_mb": 45.2, "actif": True, "deploye": False,
    }, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["nom"] == "NewML v1"
    return res.json()["id"]


def test_create_ml_model_missing_required(client, admin_token_headers):
    res = client.post("/api/v1/modeles/ml", json={}, headers=admin_token_headers)
    assert res.status_code == 422


def test_get_ml_model(client, admin_token_headers, ml_model_id):
    res = client.get(f"/api/v1/modeles/ml/{ml_model_id}", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["id"] == ml_model_id


def test_get_ml_model_not_found(client, admin_token_headers):
    res = client.get("/api/v1/modeles/ml/99999", headers=admin_token_headers)
    assert res.status_code == 404


def test_update_ml_model(client, admin_token_headers, ml_model_id):
    res = client.put(f"/api/v1/modeles/ml/{ml_model_id}", json={"precision": 0.99},
                     headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["precision"] == 0.99


def test_deploy_ml_model(client, admin_token_headers, ml_model_id):
    res = client.post(f"/api/v1/modeles/ml/{ml_model_id}/deployer?deploye=false",
                      headers=admin_token_headers)
    assert res.status_code == 200
    res = client.get(f"/api/v1/modeles/ml/{ml_model_id}", headers=admin_token_headers)
    assert res.json()["deploye"] is False


# ─── Risk Models ───────────────────────────────────────────────────────────────

def test_list_risk_models(client, admin_token_headers):
    res = client.get("/api/v1/modeles/risque", headers=admin_token_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1


def test_create_risk_model(client, admin_token_headers):
    res = client.post("/api/v1/modeles/risque", json={
        "nom": "NewRisk v1", "version": "1.0",
        "algorithme": "random_forest",
        "precision": 0.85, "f1_score": 0.83,
    }, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["nom"] == "NewRisk v1"
    return res.json()["id"]


def test_get_risk_model(client, admin_token_headers, risk_model_id):
    res = client.get(f"/api/v1/modeles/risque/{risk_model_id}", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["id"] == risk_model_id


def test_get_risk_model_not_found(client, admin_token_headers):
    res = client.get("/api/v1/modeles/risque/99999", headers=admin_token_headers)
    assert res.status_code == 404


def test_update_risk_model(client, admin_token_headers, risk_model_id):
    res = client.put(f"/api/v1/modeles/risque/{risk_model_id}", json={"description": "Mis à jour"},
                     headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["description"] == "Mis à jour"


# ─── Pipelines ─────────────────────────────────────────────────────────────────

def test_list_pipelines_empty(client, admin_token_headers):
    res = client.get("/api/v1/modeles/pipelines", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_create_pipeline(client, admin_token_headers, ml_model_id):
    res = client.post("/api/v1/modeles/pipelines", json={
        "nom": "Pipeline Test",
        "type_pipeline": "entrainement",
        "ml_model_id": ml_model_id,
    }, headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["nom"] == "Pipeline Test"
    assert data["statut"] == "en_attente"
    return data["id"]


def test_create_pipeline_missing_required(client, admin_token_headers):
    res = client.post("/api/v1/modeles/pipelines", json={}, headers=admin_token_headers)
    assert res.status_code == 422


def test_get_pipeline(client, admin_token_headers, ml_model_id):
    pid = test_create_pipeline(client, admin_token_headers, ml_model_id)
    res = client.get(f"/api/v1/modeles/pipelines/{pid}", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["id"] == pid


def test_get_pipeline_not_found(client, admin_token_headers):
    res = client.get("/api/v1/modeles/pipelines/99999", headers=admin_token_headers)
    assert res.status_code == 404


def test_update_pipeline(client, admin_token_headers, ml_model_id):
    pid = test_create_pipeline(client, admin_token_headers, ml_model_id)
    res = client.put(f"/api/v1/modeles/pipelines/{pid}", json={
        "nom": "Pipeline Modifié", "type_pipeline": "entrainement",
        "ml_model_id": ml_model_id, "statut": "en_cours",
    }, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["statut"] == "en_cours"


def test_update_pipeline_partial_and_control_execution(client, admin_token_headers, ml_model_id):
    pid = test_create_pipeline(client, admin_token_headers, ml_model_id)

    res = client.put(
        f"/api/v1/modeles/pipelines/{pid}",
        json={"nom": "Pipeline reconfiguré"},
        headers=admin_token_headers,
    )
    assert res.status_code == 200
    assert res.json()["nom"] == "Pipeline reconfiguré"
    assert res.json()["ml_model_id"] == ml_model_id

    started = client.post(f"/api/v1/modeles/pipelines/{pid}/lancer", headers=admin_token_headers)
    assert started.status_code == 200
    assert started.json()["statut"] == "en_cours"
    assert started.json()["progression"] >= 5

    stopped = client.post(f"/api/v1/modeles/pipelines/{pid}/arreter", headers=admin_token_headers)
    assert stopped.status_code == 200
    assert stopped.json()["statut"] == "arrete"


def test_import_ml_model_artifact(client, admin_token_headers):
    res = client.post(
        "/api/v1/modeles/ml/importer",
        data={
            "nom": "Détecteur ONNX",
            "version": "2.0.0",
            "type_modele": "detection",
            "architecture": "YOLOv8",
        },
        files={"fichier": ("detecteur.onnx", b"fake-onnx-model", "application/octet-stream")},
        headers=admin_token_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["type_modele"] == "detection"
    assert body["chemin"].endswith(".onnx")
    assert body["taille_mb"] >= 0
    Path(body["chemin"]).unlink(missing_ok=True)
