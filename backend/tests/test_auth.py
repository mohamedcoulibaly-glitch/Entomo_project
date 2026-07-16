"""Tests pour l'authentification (endpoints /api/v1/auth/*)."""

def test_login_success(client):
    res = client.post("/api/v1/auth/login", data={"username": "admin", "password": "Admin@2024"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials(client):
    res = client.post("/api/v1/auth/login", data={"username": "admin", "password": "wrongpassword"})
    assert res.status_code == 401
    assert "incorrect" in res.json()["detail"].lower()


def test_login_nonexistent_user(client):
    res = client.post("/api/v1/auth/login", data={"username": "nobody", "password": "nopass"})
    assert res.status_code == 401


def test_login_inactive_user(client):
    res = client.post("/api/v1/auth/login", data={"username": "inactive", "password": "Inactive@2024"})
    assert res.status_code == 400
    assert "désactivé" in res.json()["detail"].lower()


def test_login_missing_fields(client):
    res = client.post("/api/v1/auth/login", data={"username": "", "password": ""})
    assert res.status_code == 422


def test_me_authenticated(client, admin_token_headers):
    res = client.get("/api/v1/auth/me", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "admin"
    assert data["email"] == "admin@test.entomo.sn"


def test_me_unauthenticated(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_me_invalid_token(client):
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalidtoken123"})
    assert res.status_code == 401


def test_me_expired_token(client):
    from datetime import timedelta
    from app.core.security import create_access_token
    token = create_access_token({"user_id": 1, "sub": "admin"}, expires_delta=timedelta(seconds=-1))
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401


def test_preferences_are_persisted(client, admin_token_headers):
    payload = {
        "theme": "dark",
        "lang": "Français",
        "notif_email": False,
        "notif_inapp": True,
        "ignored": "not-stored",
    }
    saved = client.put("/api/v1/auth/me/preferences", json=payload, headers=admin_token_headers)
    assert saved.status_code == 200
    assert saved.json()["theme"] == "dark"
    assert "ignored" not in saved.json()

    loaded = client.get("/api/v1/auth/me/preferences", headers=admin_token_headers)
    assert loaded.status_code == 200
    assert loaded.json()["notif_email"] is False


def test_activity_endpoint(client, admin_token_headers):
    response = client.get("/api/v1/auth/me/activity", headers=admin_token_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_logout_all_revokes_existing_token(client):
    login = client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "Admin@2024"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    revoked = client.post("/api/v1/auth/logout-all", headers=headers)
    assert revoked.status_code == 200
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401

    relogin = client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "Admin@2024"},
    )
    assert relogin.status_code == 200
    fresh = {"Authorization": f"Bearer {relogin.json()['access_token']}"}
    assert client.get("/api/v1/auth/me", headers=fresh).status_code == 200
