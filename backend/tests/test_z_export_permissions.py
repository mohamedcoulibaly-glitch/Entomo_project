"""Tests export captures et permissions utilisateur."""

def test_auth_me_includes_permissions(client, admin_token_headers):
    res = client.get("/api/v1/auth/me", headers=admin_token_headers)
    assert res.status_code == 200
    body = res.json()
    assert "permissions" in body
    assert isinstance(body["permissions"], list)
    assert len(body["permissions"]) > 0


def test_captures_export_csv(client, admin_token_headers):
    res = client.get("/api/v1/captures/export?format=csv&limit=10", headers=admin_token_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
    content = res.content.decode("utf-8-sig")
    assert "ID" in content or "id" in content.lower()
    assert ";" in content


def test_captures_export_xlsx(client, admin_token_headers):
    res = client.get("/api/v1/captures/export?format=xlsx&limit=5", headers=admin_token_headers)
    assert res.status_code == 200
    assert len(res.content) > 100
    assert res.content[:2] == b"PK"
