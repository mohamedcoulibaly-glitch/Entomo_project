"""Tests E2E des écrans de synchronisation et validation DHIS2."""

from pathlib import Path


def _login(page, base_url):
    page.goto(f"{base_url}/login.html")
    page.wait_for_function("() => !document.getElementById('global-loader')", timeout=15000)
    page.locator("#login-username").fill("admin")
    page.locator("#login-password").fill("Admin@2024")
    page.locator("#login-btn").click()
    page.wait_for_url(f"{base_url}/index.html", timeout=10000)
    page.wait_for_function("() => !document.getElementById('global-loader')", timeout=15000)


def test_gestion_hors_ligne_page_loads(page, base_url):
    _login(page, base_url)
    response = page.goto(f"{base_url}/pages/gestion-hors-ligne.html")
    assert response.status == 200
    assert page.locator("#btn-sync").is_visible()
    assert page.locator("#offline-table-body").is_visible()
    assert page.locator("#btn-bulk-sync").count() == 1


def test_statut_sync_page_shows_live_status(page, base_url):
    _login(page, base_url)
    page.goto(f"{base_url}/pages/statut-sync.html")
    page.wait_for_function(
        "() => document.querySelector('[data-pending]') && document.querySelector('[data-pending]').textContent !== ''"
    )
    assert page.locator("#conn-label").is_visible()
    assert page.locator("#stat-conflicts").is_visible()
    assert page.locator("#btn-launch-sync").is_visible()


def test_validation_dhis2_page_loads_pending(page, base_url):
    _login(page, base_url)
    page.goto(f"{base_url}/pages/validation-dhis2.html")
    page.wait_for_function("() => typeof apiDhis2 !== 'undefined'")
    page.wait_for_timeout(500)
    tbody = page.locator("tbody")
    assert tbody.is_visible()


def test_pwa_manifest_accessible(page, base_url):
    response = page.request.get(f"{base_url}/manifest.json")
    assert response.status == 200
    data = response.json()
    assert data.get("name")
    assert data.get("start_url")


def test_service_worker_registered(page, base_url):
    _login(page, base_url)
    page.goto(f"{base_url}/pages/gestion-hors-ligne.html")
    page.wait_for_timeout(1500)
    registered = page.evaluate(
        "() => navigator.serviceWorker.getRegistration().then(r => !!r)"
    )
    assert registered is True


def test_sync_settings_persist_from_offline_page(page, base_url):
    _login(page, base_url)
    page.goto(f"{base_url}/pages/gestion-hors-ligne.html")
    page.wait_for_function("() => typeof apiSync !== 'undefined'")
    page.locator("#btn-settings").click()
    page.wait_for_selector("#ol-freq", timeout=30000)
    page.locator("#ol-freq").select_option("30")
    page.locator("#modal-confirm").click()
    page.wait_for_function(
        "() => apiSync.settings().then(s => Number(s.frequence) === 30)",
        timeout=30000,
    )
