"""
Tests E2E contre instance DHIS2 Play (ou ministère).

Configuration via variables d'environnement :
  DHIS2_PLAY_URL      — ex. https://play.im.dhis2.org/stable-2-40-12/
  DHIS2_PLAY_USER     — défaut: admin
  DHIS2_PLAY_PASSWORD — défaut: district

Exécution :
  set DHIS2_PLAY_URL=https://play.im.dhis2.org/stable-2-40-12/
  pytest tests/test_dhis2_play_e2e.py -v -m dhis2_e2e

Les tests sont ignorés si DHIS2_PLAY_URL n'est pas défini ou si la connexion échoue.
"""

import os

import pytest

pytestmark = pytest.mark.dhis2_e2e

DHIS2_PLAY_URL = os.environ.get("DHIS2_PLAY_URL", "").rstrip("/")
DHIS2_PLAY_USER = os.environ.get("DHIS2_PLAY_USER", "admin")
DHIS2_PLAY_PASSWORD = os.environ.get("DHIS2_PLAY_PASSWORD", "district")

requires_play = pytest.mark.skipif(
    not DHIS2_PLAY_URL,
    reason="DHIS2_PLAY_URL non défini — test E2E DHIS2 Play ignoré",
)


@requires_play
def test_dhis2_play_connection():
    """Test connexion réelle à l'instance DHIS2 Play."""
    from app.models.dhis2 import DHIS2Config
    from app.services.dhis2_client import test_connection

    config = DHIS2Config(
        nom="Play E2E",
        url=DHIS2_PLAY_URL,
        username=DHIS2_PLAY_USER,
        org_unit="",
        actif=True,
    )
    config.credential_enc = None
    # Mot de passe en clair via override
    ok, message, info = test_connection(config, password=DHIS2_PLAY_PASSWORD)
    if not ok:
        pytest.skip(f"DHIS2 Play inaccessible: {message}")
    assert info is not None
    assert "systemId" in info or "version" in info or "systemName" in info


@requires_play
def test_dhis2_play_catalog_fetch():
    """Test récupération catalogue orgUnits/dataElements depuis DHIS2 Play."""
    from app.models.dhis2 import DHIS2Config
    from app.services.dhis2_client import fetch_catalog, test_connection

    config = DHIS2Config(
        nom="Play E2E Catalog",
        url=DHIS2_PLAY_URL,
        username=DHIS2_PLAY_USER,
        actif=True,
    )
    ok, _, _ = test_connection(config, password=DHIS2_PLAY_PASSWORD)
    if not ok:
        pytest.skip("DHIS2 Play inaccessible pour catalogue")

    success, message, catalog = fetch_catalog(config, password=DHIS2_PLAY_PASSWORD)
    assert success, message
    assert "orgUnits" in catalog
    assert "dataElements" in catalog
    assert len(catalog["orgUnits"]) > 0, "Aucun orgUnit retourné"


@requires_play
def test_dhis2_play_api_system_info_http():
    """Test HTTP direct GET /api/system/info sur DHIS2 Play."""
    import httpx

    url = f"{DHIS2_PLAY_URL}/api/system/info"
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            response = client.get(url, auth=(DHIS2_PLAY_USER, DHIS2_PLAY_PASSWORD))
    except httpx.RequestError as exc:
        pytest.skip(f"DHIS2 Play injoignable: {exc}")

    if response.status_code == 401:
        pytest.skip("Credentials DHIS2 Play invalides (admin/district modifiés)")
    assert response.status_code == 200, f"HTTP {response.status_code}: {response.text[:200]}"
    data = response.json()
    assert "version" in data or "systemName" in data


@requires_play
def test_dhis2_play_full_sync_flow(client, admin_token_headers, monkeypatch):
    """Flux complet : config → test connexion → sync (mock push si pas d'orgUnit)."""
    from app.services.dhis2_client import test_connection
    from app.models.dhis2 import DHIS2Config

    # Vérifier que Play est accessible
    probe = DHIS2Config(nom="probe", url=DHIS2_PLAY_URL, username=DHIS2_PLAY_USER, actif=True)
    ok, msg, _ = test_connection(probe, password=DHIS2_PLAY_PASSWORD)
    if not ok:
        pytest.skip(f"DHIS2 Play: {msg}")

    # Créer config Entomo pointant vers Play
    res = client.post("/api/v1/dhis2/config", json={
        "url": DHIS2_PLAY_URL,
        "username": DHIS2_PLAY_USER,
        "password": DHIS2_PLAY_PASSWORD,
        "org_unit": "PLAY_TEST_OU",
        "data_set": "PLAY_TEST_DS",
        "periode": "mensuel",
        "nom": "DHIS2 Play E2E",
    }, headers=admin_token_headers)
    assert res.status_code == 200
    config_id = res.json()["id"]

    # Test connexion via API
    test_res = client.post("/api/v1/dhis2/test-connection", json={
        "config_id": config_id,
        "password": DHIS2_PLAY_PASSWORD,
    }, headers=admin_token_headers)
    assert test_res.status_code == 200
    test_body = test_res.json()
    if not test_body.get("success"):
        pytest.skip(f"Test connexion API échoué: {test_body.get('message')}")

    # Ajouter mapping valide
    map_res = client.post(f"/api/v1/dhis2/config/{config_id}/mappings", json={
        "indicateur_local": "total_captures",
        "element_dhis2": "PLAY_TEST_ELEMENT",
    }, headers=admin_token_headers)
    assert map_res.status_code == 200

    # Sync — orgUnit fictif : DHIS2 Play rejette (502) mais le flux Entomo est validé
    sync_res = client.post("/api/v1/dhis2/sync", json={
        "config_id": config_id,
        "password": DHIS2_PLAY_PASSWORD,
    }, headers=admin_token_headers)
    # 200 = push accepté par DHIS2 ; 502 = rejet DHIS2 (orgUnit/element invalides) — flux E2E OK
    assert sync_res.status_code in (200, 502), f"Sync inattendue: {sync_res.status_code} {sync_res.text[:200]}"
    if sync_res.status_code == 502:
        assert "DHIS2" in sync_res.json().get("detail", "") or "Échec" in sync_res.json().get("detail", "")
