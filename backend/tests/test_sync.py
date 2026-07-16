"""Tests pour la synchronisation hors-ligne (endpoints /api/v1/sync/*)."""
import pytest


def test_sync_cache_empty(client, admin_token_headers):
    res = client.delete("/api/v1/sync/cache", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["cache_vide"] is True


def test_sync_settings_persist_without_altering_dhis2_config(client, admin_token_headers):
    res = client.post("/api/v1/sync/settings", json={
        "auto_sync": True,
        "frequence": 30,
        "stockage_max": 250,
        "wifi_only": False,
    }, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["sauvegarde"] is True
    saved = client.get("/api/v1/sync/settings", headers=admin_token_headers)
    assert saved.status_code == 200
    assert saved.json() == {
        "auto_sync": True,
        "frequence": 30,
        "stockage_max": 250,
        "wifi_only": False,
    }


def test_sync_cache_with_config(client, admin_token_headers):
    client.post("/api/v1/dhis2/config", json={
        "url": "https://dhis2.test.org",
        "username": "admin",
        "password": "test123",
    }, headers=admin_token_headers)
    res = client.delete("/api/v1/sync/cache", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["cache_vide"] is True


def test_sync_settings_with_config(client, admin_token_headers):
    client.post("/api/v1/dhis2/config", json={
        "url": "https://dhis2.test.org",
        "username": "admin",
        "password": "test123",
    }, headers=admin_token_headers)
    res = client.post("/api/v1/sync/settings", json={
        "auto_sync": True,
        "frequence": 15,
        "stockage_max": 500,
    }, headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["sauvegarde"] is True
    assert "sauvegardés" in res.json()["message"]


def test_sync_settings_unauthenticated(client):
    assert client.get("/api/v1/sync/settings").status_code == 401


def test_sync_unauthenticated(client):
    res = client.delete("/api/v1/sync/cache")
    assert res.status_code == 401
