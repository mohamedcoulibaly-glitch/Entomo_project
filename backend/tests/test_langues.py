"""Tests pour les langues (endpoints /api/v1/langues/*)."""

_cnt = [0]


def _code():
    _cnt[0] += 1
    return f"lang-{_cnt[0]}"


def _create_langue(client, headers, active=False, **kw):
    body = {"code": _code(), "nom": "Test", "date_format": "DD/MM/YYYY", "timezone": "UTC", "active": active, **kw}
    return client.post("/api/v1/langues/", json=body, headers=headers)


def test_list_langues_empty(client, admin_token_headers):
    res = client.get("/api/v1/langues/", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_create_langue(client, admin_token_headers):
    res = _create_langue(client, admin_token_headers, active=True)
    assert res.status_code == 200
    data = res.json()
    assert data["active"] is True
    assert "id" in data


def test_create_langue_duplicate(client, admin_token_headers):
    code = _code()
    _create_langue(client, admin_token_headers, code=code)
    res = _create_langue(client, admin_token_headers, code=code)
    assert res.status_code == 400
    assert "déjà utilisé" in res.json()["detail"]


def test_ajouter_langue(client, admin_token_headers):
    res = client.post("/api/v1/langues/ajouter?code=en&nom=English", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["code"] == "en"


def test_get_langue(client, admin_token_headers):
    res = _create_langue(client, admin_token_headers)
    lang_id = res.json()["id"]
    res = client.get(f"/api/v1/langues/{lang_id}", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["nom"] == "Test"


def test_get_langue_not_found(client, admin_token_headers):
    res = client.get("/api/v1/langues/9999", headers=admin_token_headers)
    assert res.status_code == 404


def test_update_langue(client, admin_token_headers):
    res = _create_langue(client, admin_token_headers)
    lang_id = res.json()["id"]
    res = client.put(f"/api/v1/langues/{lang_id}", json={
        "nom": "Mis à jour",
        "active": False,
    }, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["nom"] == "Mis à jour"
    assert res.json()["active"] is False


def test_update_format(client, admin_token_headers):
    _create_langue(client, admin_token_headers, active=True)
    res = client.post("/api/v1/langues/format", json={
        "date_format": "YYYY-MM-DD",
        "timezone": "UTC",
    }, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["date_format"] == "YYYY-MM-DD"


def test_update_format_no_active(client, admin_token_headers):
    all_langues = client.get("/api/v1/langues/", headers=admin_token_headers).json()
    for l in all_langues:
        client.put(f"/api/v1/langues/{l['id']}", json={"active": False}, headers=admin_token_headers)
    res = client.post("/api/v1/langues/format", json={
        "date_format": "DD/MM/YYYY",
    }, headers=admin_token_headers)
    assert res.status_code == 404


def test_delete_langue(client, admin_token_headers):
    res = _create_langue(client, admin_token_headers)
    lang_id = res.json()["id"]
    res = client.delete(f"/api/v1/langues/{lang_id}", headers=admin_token_headers)
    assert res.status_code == 200
    res2 = client.get(f"/api/v1/langues/{lang_id}", headers=admin_token_headers)
    assert res2.status_code == 404


def test_langues_unauthenticated(client):
    res = client.get("/api/v1/langues/")
    assert res.status_code == 401
