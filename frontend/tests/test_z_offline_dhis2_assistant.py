"""Tests frontend Chantiers B et C."""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
WWW = BASE_DIR / "www"
JS = WWW / "js"
PAGES = WWW / "pages"


def test_assistant_page_and_api():
    page = (PAGES / "assistant.html").read_text(encoding="utf-8")
    api = (JS / "api.js").read_text(encoding="utf-8")
    assert "assistant.js" in page
    assert "const apiAssistant" in api
    assert "/assistant/chat" in api


def test_offline_store_exists():
    content = (JS / "offline-store.js").read_text(encoding="utf-8")
    assert "indexedDB.open" in content
    assert "OfflineStore" in content


def test_details_gite_page_exists():
    assert (PAGES / "details-gite.html").exists()
    assert (JS / "details-gite.js").exists()


def test_dhis2_api_has_real_endpoints():
    api = (JS / "api.js").read_text(encoding="utf-8")
    assert "/dhis2/test-connection" in api
    assert "/dhis2/pending" in api
    assert "processQueue" in api


def test_pwa_assets_exist():
    assert (WWW / "sw.js").exists()
    assert (WWW / "manifest.json").exists()
    core = (JS / "core.js").read_text(encoding="utf-8")
    assert "initPWA" in core
    assert "offline-sync.js" in core


def test_gestion_hors_ligne_bulk_actions():
    html = (PAGES / "gestion-hors-ligne.html").read_text(encoding="utf-8")
    js = (JS / "gestion-hors-ligne.js").read_text(encoding="utf-8")
    assert "btn-bulk-sync" in html
    assert "offline-bulk-actions" in html
    assert "handleBulkSync" in js
    assert "listQueue" in js
    assert "queueResult = await apiSync.processQueue()" in js


def test_validation_dhis2_push_flow():
    js = (JS / "validation-dhis2.js").read_text(encoding="utf-8")
    api = (JS / "api.js").read_text(encoding="utf-8")
    assert "validateAndPush" in api
    assert "validateAndPush" in js


def test_statut_sync_dynamic_conflicts():
    html = (PAGES / "statut-sync.html").read_text(encoding="utf-8")
    js = (JS / "statut-sync.js").read_text(encoding="utf-8")
    assert "stat-conflicts" in html
    assert "conflicts-card" in html
    assert "apiSync.processQueue" in js
