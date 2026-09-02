"""Tests pour les endpoints analytics enrichis du dashboard."""

import pytest


def test_dashboard_stats_enriched(client, admin_token_headers):
    res = client.get("/api/v1/dashboard/stats", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert "alertes" in data
    assert "region5" in data
    assert "espece_dominante" in data
    assert "couverture_irs" in data
    assert "densite_moyenne" in data
    assert isinstance(data["alertes"], list)
    assert "densite_moyenne" in data["region5"]


def test_dashboard_stats_with_period_filter(client, admin_token_headers):
    res = client.get("/api/v1/dashboard/stats?period=1M", headers=admin_token_headers)
    assert res.status_code == 200


def test_captures_par_region(client, admin_token_headers):
    res = client.get("/api/v1/dashboard/captures-par-region", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if data:
        assert "region" in data[0]
        assert "densite" in data[0]
        assert "risque" in data[0]


def test_densite_evolution(client, admin_token_headers):
    res = client.get("/api/v1/dashboard/densite-evolution?granularity=week", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)


def test_dashboard_alertes(client, admin_token_headers):
    res = client.get("/api/v1/dashboard/alertes", headers=admin_token_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_dashboard_heatmap(client, admin_token_headers):
    res = client.get("/api/v1/dashboard/heatmap", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)


def test_dashboard_captures_par_methode(client, admin_token_headers):
    res = client.get("/api/v1/dashboard/captures-par-methode", headers=admin_token_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_dashboard_captures_par_statut(client, admin_token_headers):
    res = client.get("/api/v1/dashboard/captures-par-statut", headers=admin_token_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_dashboard_regions_list(client, admin_token_headers):
    res = client.get("/api/v1/dashboard/regions", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert "regions" in data
    assert "region_medicale_5" in data
    assert len(data["regions"]) == 14


def test_dashboard_region5_filter(client, admin_token_headers):
    res = client.get("/api/v1/dashboard/stats?region=region%205", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert "region5" in data


def test_interventions_stats(client, admin_token_headers):
    res = client.get("/api/v1/dashboard/interventions-stats", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert {"total", "planifiees", "en_cours", "realisees"}.issubset(data.keys())
