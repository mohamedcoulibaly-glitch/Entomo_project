"""Tests CRUD pour les datasets et annotations (endpoints /api/v1/datasets/*)."""

def test_list_datasets_empty(client, admin_token_headers):
    res = client.get("/api/v1/datasets/", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_create_dataset_success(client, admin_token_headers):
    res = client.post("/api/v1/datasets/", json={
        "nom": "Dataset Test",
        "description": "Description du dataset",
        "type": "images",
        "taille": 100,
    }, headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["nom"] == "Dataset Test"
    assert data["actif"] is True
    assert "id" in data
    return data["id"]


def test_create_dataset_missing_name(client, admin_token_headers):
    res = client.post("/api/v1/datasets/", json={"type": "images"}, headers=admin_token_headers)
    assert res.status_code == 422


def test_get_dataset(client, admin_token_headers):
    ds_id = test_create_dataset_success(client, admin_token_headers)
    res = client.get(f"/api/v1/datasets/{ds_id}", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["id"] == ds_id


def test_get_dataset_not_found(client, admin_token_headers):
    res = client.get("/api/v1/datasets/99999", headers=admin_token_headers)
    assert res.status_code == 404


def test_update_dataset(client, admin_token_headers):
    ds_id = test_create_dataset_success(client, admin_token_headers)
    res = client.put(f"/api/v1/datasets/{ds_id}", json={"nom": "Dataset Modifié"},
                     headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["nom"] == "Dataset Modifié"


def test_delete_dataset(client, admin_token_headers):
    ds_id = test_create_dataset_success(client, admin_token_headers)
    res = client.delete(f"/api/v1/datasets/{ds_id}", headers=admin_token_headers)
    assert res.status_code == 200
    res = client.get(f"/api/v1/datasets/{ds_id}", headers=admin_token_headers)
    assert res.status_code == 404


def test_add_annotation(client, admin_token_headers):
    ds_id = test_create_dataset_success(client, admin_token_headers)
    res = client.post(f"/api/v1/datasets/{ds_id}/annotations", json={
        "label": "Anopheles gambiae",
        "notes": "Spécimen confirmé",
    }, headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["label"] == "Anopheles gambiae"
    assert data["dataset_id"] == ds_id


def test_add_annotation_missing_label(client, admin_token_headers):
    ds_id = test_create_dataset_success(client, admin_token_headers)
    res = client.post(f"/api/v1/datasets/{ds_id}/annotations", json={},
                      headers=admin_token_headers)
    assert res.status_code == 422


def test_list_annotations(client, admin_token_headers):
    ds_id = test_create_dataset_success(client, admin_token_headers)
    client.post(f"/api/v1/datasets/{ds_id}/annotations", json={"label": "Label 1"},
                headers=admin_token_headers)
    client.post(f"/api/v1/datasets/{ds_id}/annotations", json={"label": "Label 2"},
                headers=admin_token_headers)
    res = client.get(f"/api/v1/datasets/{ds_id}/annotations", headers=admin_token_headers)
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_list_annotations_no_dataset(client, admin_token_headers):
    res = client.get("/api/v1/datasets/99999/annotations", headers=admin_token_headers)
    assert res.status_code == 404


def test_unauthorized_access(client):
    res = client.get("/api/v1/datasets/")
    assert res.status_code == 401
