"""Tests d'application des permissions RBAC et de l'audit."""

from app.models.audit_log import AuditLog


def test_public_login_no_token(client):
    res = client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "Admin@2024"},
    )
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_public_reference_enrichi_no_token(client):
    res = client.get("/api/v1/reference/enrichi")
    assert res.status_code == 200
    body = res.json()
    assert "especes" in body


def test_protected_route_without_token_returns_401(client):
    res = client.get("/api/v1/captures/")
    assert res.status_code == 401


def test_limited_user_can_list_captures(client, limited_token_headers):
    res = client.get("/api/v1/captures/", headers=limited_token_headers)
    assert res.status_code == 200


def test_limited_user_cannot_create_site(client, limited_token_headers, site1_id):
    res = client.post(
        "/api/v1/sites/",
        headers=limited_token_headers,
        json={
            "nom": "Site interdit",
            "code": "FORBIDDEN-001",
            "region": "Dakar",
            "district": "Dakar",
            "latitude": 14.7,
            "longitude": -17.4,
            "zone_type": "urbain",
            "type_environnement": "zone humide",
            "actif": True,
        },
    )
    assert res.status_code == 403


def test_limited_user_cannot_access_dashboard(client, limited_token_headers):
    res = client.get("/api/v1/dashboard/stats", headers=limited_token_headers)
    assert res.status_code == 403


def test_limited_user_cannot_export_captures(client, limited_token_headers):
    res = client.get("/api/v1/captures/export?format=csv", headers=limited_token_headers)
    assert res.status_code == 403


def test_labo_user_can_validate_capture(client, labo_token_headers, site1_id, labo_id):
    create = client.post(
        "/api/v1/captures/",
        headers=labo_token_headers,
        json={
            "site_id": site1_id,
            "utilisateur_id": labo_id,
            "espece": "An. gambiae",
            "nombre_individus": 3,
            "methode_capture": "CDC_LIGHT_TRAP",
            "statut": "a_valider",
            "date_capture": "2026-09-01",
        },
    )
    assert create.status_code == 200
    capture_id = create.json()["id"]
    res = client.post(
        f"/api/v1/captures/{capture_id}/valider",
        headers=labo_token_headers,
        json={"statut": "valide", "espece_corrigee": "An. gambiae"},
    )
    assert res.status_code == 200


def test_labo_user_cannot_access_dhis2_config(client, labo_token_headers):
    res = client.get("/api/v1/dhis2/config", headers=labo_token_headers)
    assert res.status_code == 403


def test_admin_can_access_dashboard(client, admin_token_headers):
    res = client.get("/api/v1/dashboard/stats", headers=admin_token_headers)
    assert res.status_code == 200


def test_login_creates_audit_log(client, admin_token_headers, db):
    before = db.query(AuditLog).filter(AuditLog.action == "login").count()
    client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "Admin@2024"},
    )
    after = db.query(AuditLog).filter(AuditLog.action == "login").count()
    assert after == before + 1


def test_capture_create_creates_audit_log(client, labo_token_headers, site1_id, labo_id, db):
    before = db.query(AuditLog).filter(AuditLog.action == "capture_create").count()
    res = client.post(
        "/api/v1/captures/",
        headers=labo_token_headers,
        json={
            "site_id": site1_id,
            "utilisateur_id": labo_id,
            "espece": "Ae. aegypti",
            "nombre_individus": 1,
            "methode_capture": "audio",
            "statut": "a_valider",
            "date_capture": "2026-09-01",
        },
    )
    assert res.status_code == 200
    after = db.query(AuditLog).filter(AuditLog.action == "capture_create").count()
    assert after == before + 1


def test_capture_delete_creates_audit_log(client, admin_token_headers, site1_id, admin_id, db):
    create = client.post(
        "/api/v1/captures/",
        headers=admin_token_headers,
        json={
            "site_id": site1_id,
            "utilisateur_id": admin_id,
            "espece": "Cx. quinquefasciatus",
            "nombre_individus": 2,
            "methode_capture": "FILET",
            "statut": "a_valider",
            "date_capture": "2026-09-01",
        },
    )
    capture_id = create.json()["id"]
    before = db.query(AuditLog).filter(AuditLog.action == "capture_delete").count()
    res = client.delete(f"/api/v1/captures/{capture_id}", headers=admin_token_headers)
    assert res.status_code == 200
    after = db.query(AuditLog).filter(AuditLog.action == "capture_delete").count()
    assert after == before + 1


def test_logout_all_creates_audit_log(client, admin_token_headers, db):
    before = db.query(AuditLog).filter(AuditLog.action == "logout_all").count()
    res = client.post("/api/v1/auth/logout-all", headers=admin_token_headers)
    assert res.status_code == 200
    after = db.query(AuditLog).filter(AuditLog.action == "logout_all").count()
    assert after == before + 1


def test_model_deploy_creates_audit_log(client, admin_token_headers, ml_model_id, db):
    before = db.query(AuditLog).filter(AuditLog.action == "model_deploy").count()
    res = client.post(
        f"/api/v1/modeles/ml/{ml_model_id}/deployer?deploye=true",
        headers=admin_token_headers,
    )
    assert res.status_code == 200
    after = db.query(AuditLog).filter(AuditLog.action == "model_deploy").count()
    assert after >= before + 1


def test_auth_me_still_works_with_enforcement(client, admin_token_headers):
    res = client.get("/api/v1/auth/me", headers=admin_token_headers)
    assert res.status_code == 200
    assert "permissions" in res.json()


def test_notifications_accessible_to_authenticated_user(client, limited_token_headers):
    res = client.get("/api/v1/notifications/", headers=limited_token_headers)
    assert res.status_code == 200


def test_support_tickets_accessible_to_authenticated_user(client, limited_token_headers):
    res = client.get("/api/v1/support/tickets", headers=limited_token_headers)
    assert res.status_code == 200
