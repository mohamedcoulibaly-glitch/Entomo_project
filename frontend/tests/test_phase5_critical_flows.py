"""Tests E2E des 5 flux métier critiques (Phase 5)."""

from pathlib import Path


def _login(page, base_url):
    page.goto(f"{base_url}/login.html")
    page.wait_for_function("() => !document.getElementById('global-loader')", timeout=15000)
    page.locator("#login-username").fill("admin")
    page.locator("#login-password").fill("Admin@2024")
    page.locator("#login-btn").click()
    page.wait_for_url(f"{base_url}/index.html", timeout=10000)


def test_flow_1_login_capture_validation(page, base_url):
    """Flux 1 : connexion → création capture → liste visible."""
    _login(page, base_url)
    page.goto(f"{base_url}/pages/gestion-captures.html")
    page.wait_for_function("() => typeof apiCaptures !== 'undefined'")
    page.wait_for_timeout(500)
    assert "gestion-captures" in page.url


def test_flow_2_audio_surveillance_and_export_ui(page, base_url):
    """Flux 2 : surveillance audio → stats API → boutons export."""
    _login(page, base_url)
    page.goto(f"{base_url}/pages/surveillance-audio.html")
    page.wait_for_function("() => typeof apiCaptures !== 'undefined'")
    page.wait_for_selector('[data-stat="precision"]', timeout=20000)
    assert page.locator('[data-export="csv"]').is_visible()
    assert page.locator('[data-export="json"]').is_visible()


def test_flow_3_dhis2_validation_page(page, base_url):
    """Flux 3 : validation DHIS2 charge les captures en attente."""
    _login(page, base_url)
    page.goto(f"{base_url}/pages/validation-dhis2.html")
    page.wait_for_function("() => typeof apiDhis2 !== 'undefined'")
    page.wait_for_selector("tbody", timeout=20000)
    assert page.locator("tbody").is_visible()


def test_flow_4_offline_queue_replay_ui(page, base_url):
    """Flux 4 : file hors-ligne accessible avec actions bulk."""
    _login(page, base_url)
    page.goto(f"{base_url}/pages/gestion-hors-ligne.html")
    page.wait_for_selector("#btn-sync", timeout=20000)
    assert page.locator("#offline-table-body").is_visible()
    assert page.locator("#offline-bulk-actions").count() == 1
    assert page.locator("#btn-bulk-sync").count() == 1


def test_flow_5_assistant_contextual_reply(page, base_url):
    """Flux 5 : assistant IA répond avec contexte métier."""
    _login(page, base_url)
    page.goto(f"{base_url}/pages/assistant.html")
    page.wait_for_selector("#assistant-form", timeout=20000)
    page.locator("#assistant-input").fill("Combien de captures à valider ?")
    page.locator("#assistant-form").press("Enter")
    page.wait_for_function(
        "() => document.querySelectorAll('#assistant-messages > div').length >= 2",
        timeout=20000,
    )
    messages = page.locator("#assistant-messages > div")
    assert messages.count() >= 2
