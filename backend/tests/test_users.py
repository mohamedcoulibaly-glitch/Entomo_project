"""Tests CRUD pour les utilisateurs (endpoints /api/v1/users/*)."""

def test_list_users(client, admin_token_headers):
    res = client.get("/api/v1/users/", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 3  # admin, labo1, inactive
    usernames = [u["username"] for u in data]
    assert "admin" in usernames
    assert "labo1" in usernames


def test_list_users_filters(client, admin_token_headers):
    res = client.get("/api/v1/users/?region=Dakar", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert all(u["region"] == "Dakar" for u in data)


def test_list_users_unauthorized(client):
    res = client.get("/api/v1/users/")
    assert res.status_code == 401


def test_create_user_success(client, admin_token_headers):
    new_user = {
        "email": "newuser@test.sn", "username": "newuser",
        "password": "NewPass@2024", "full_name": "New User",
        "region": "Thiès", "is_active": True,
    }
    res = client.post("/api/v1/users/", json=new_user, headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@test.sn"
    assert data["is_active"] is True
    assert "password" not in data


def test_create_user_duplicate_email(client, admin_token_headers):
    new_user = {
        "email": "admin@test.entomo.sn", "username": "uniqueuser",
        "password": "Pass@2024", "full_name": "Test",
    }
    res = client.post("/api/v1/users/", json=new_user, headers=admin_token_headers)
    assert res.status_code == 400
    assert "email" in res.json()["detail"].lower()


def test_create_user_duplicate_username(client, admin_token_headers):
    res = client.post("/api/v1/users/", json={
        "email": "unique@test.sn", "username": "admin",
        "password": "Pass@2024", "full_name": "Test",
    }, headers=admin_token_headers)
    assert res.status_code == 400
    assert "utilisateur" in res.json()["detail"].lower()


def test_create_user_not_superuser(client, labo_token_headers):
    res = client.post("/api/v1/users/", json={
        "email": "no@test.sn", "username": "nobody",
        "password": "Pass@2024", "full_name": "Nobody",
    }, headers=labo_token_headers)
    assert res.status_code == 403


def test_create_user_missing_fields(client, admin_token_headers):
    res = client.post("/api/v1/users/", json={}, headers=admin_token_headers)
    assert res.status_code == 422


def test_create_user_invalid_email(client, admin_token_headers):
    res = client.post("/api/v1/users/", json={
        "email": "notanemail", "username": "baduser",
        "password": "Pass@2024", "full_name": "Bad",
    }, headers=admin_token_headers)
    assert res.status_code == 422


def test_get_user(client, admin_token_headers):
    res = client.get("/api/v1/users/", headers=admin_token_headers)
    users = res.json()
    target_id = users[0]["id"]
    res = client.get(f"/api/v1/users/{target_id}", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["id"] == target_id


def test_get_user_not_found(client, admin_token_headers):
    res = client.get("/api/v1/users/99999", headers=admin_token_headers)
    assert res.status_code == 404


def test_update_user_self(client, admin_token_headers):
    res = client.get("/api/v1/auth/me", headers=admin_token_headers)
    my_id = res.json()["id"]
    res = client.put(f"/api/v1/users/{my_id}", json={"full_name": "Updated Admin"}, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["full_name"] == "Updated Admin"


def test_update_user_by_superuser(client, admin_token_headers, labo_id):
    res = client.put(f"/api/v1/users/{labo_id}", json={"is_active": False}, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["is_active"] is False


def test_update_user_not_authorized(client, labo_token_headers, admin_id):
    res = client.put(f"/api/v1/users/{admin_id}", json={"full_name": "Hacked"}, headers=labo_token_headers)
    assert res.status_code in (400, 403)


def test_delete_user_superuser(client, admin_token_headers):
    # Create a temp user to delete
    res = client.post("/api/v1/users/", json={
        "email": "todelete@test.sn", "username": "todelete",
        "password": "Pass@2024", "full_name": "Delete Me",
    }, headers=admin_token_headers)
    user_id = res.json()["id"]
    res = client.delete(f"/api/v1/users/{user_id}", headers=admin_token_headers)
    assert res.status_code == 200
    # Verify deletion
    res = client.get(f"/api/v1/users/{user_id}", headers=admin_token_headers)
    assert res.status_code == 404


def test_delete_user_not_superuser(client, labo_token_headers):
    res = client.delete("/api/v1/users/1", headers=labo_token_headers)
    assert res.status_code in (400, 403)
