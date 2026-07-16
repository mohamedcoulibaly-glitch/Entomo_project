"""Tests CRUD pour les rôles et permissions (endpoints /api/v1/roles/*)."""

def test_list_permissions(client, admin_token_headers):
    res = client.get("/api/v1/roles/permissions", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 42  # 7 modules * 6 actions


def test_create_permission(client, admin_token_headers):
    res = client.post("/api/v1/roles/permissions", json={
        "name": "Test Permission", "code": "test:permission",
        "module": "test", "action": "permission",
    }, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["code"] == "test:permission"


def test_create_duplicate_permission(client, admin_token_headers):
    res = client.post("/api/v1/roles/permissions", json={
        "name": "Duplicate", "code": "captures:voir",
        "module": "captures", "action": "voir",
    }, headers=admin_token_headers)
    assert res.status_code == 400


def test_permissions_unauthorized(client, labo_token_headers):
    res = client.get("/api/v1/roles/permissions", headers=labo_token_headers)
    assert res.status_code == 403


def test_list_roles(client, admin_token_headers):
    res = client.get("/api/v1/roles/", headers=admin_token_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 3


_role_counter = 0

def _unique_role_name():
    global _role_counter
    _role_counter += 1
    return f"Rôle Test {_role_counter}"


def test_create_role(client, admin_token_headers):
    perms = client.get("/api/v1/roles/permissions", headers=admin_token_headers).json()
    perm_id = perms[0]["id"]
    name = _unique_role_name()
    res = client.post("/api/v1/roles/", json={
        "name": name,
        "description": "Rôle de test",
        "permission_ids": [perm_id],
    }, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["name"] == name
    assert len(res.json()["permissions"]) == 1
    return res.json()["id"]


def test_create_role_duplicate_name(client, admin_token_headers):
    res = client.post("/api/v1/roles/", json={
        "name": "Super Administrateur",
        "description": "Duplicate",
    }, headers=admin_token_headers)
    assert res.status_code == 400


def test_get_role(client, admin_token_headers):
    role_id = test_create_role(client, admin_token_headers)
    res = client.get(f"/api/v1/roles/{role_id}", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["id"] == role_id


def test_get_role_not_found(client, admin_token_headers):
    res = client.get("/api/v1/roles/99999", headers=admin_token_headers)
    assert res.status_code == 404


def test_update_role(client, admin_token_headers):
    role_id = test_create_role(client, admin_token_headers)
    res = client.put(f"/api/v1/roles/{role_id}", json={"description": "Modifié"},
                     headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["description"] == "Modifié"


def test_delete_role(client, admin_token_headers):
    role_id = test_create_role(client, admin_token_headers)
    res = client.delete(f"/api/v1/roles/{role_id}", headers=admin_token_headers)
    assert res.status_code == 200
    res = client.get(f"/api/v1/roles/{role_id}", headers=admin_token_headers)
    assert res.status_code == 404


def test_roles_unauthorized(client, labo_token_headers):
    res = client.get("/api/v1/roles/", headers=labo_token_headers)
    assert res.status_code == 403
