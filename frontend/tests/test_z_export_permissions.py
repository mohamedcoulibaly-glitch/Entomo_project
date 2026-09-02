"""Tests frontend — permissions, exports, hub."""

from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
WWW = BASE / "www"
JS = WWW / "js"


def test_permission_guard_module():
    content = (JS / "permission-guard.js").read_text(encoding="utf-8")
    assert "PermissionGuard" in content
    assert "validation-dhis2.html" in content
    assert "enforcePageAccess" in content


def test_entomo_events_module():
    content = (JS / "entomo-events.js").read_text(encoding="utf-8")
    assert "capture-validated" in content or "EntomoEvents" in content


def test_api_has_download_and_export():
    api = (JS / "api.js").read_text(encoding="utf-8")
    assert "apiDownload" in api
    assert "captures/export" in api
    assert "formatApiError" in api
    assert "queueOfflineMutation" in api


def test_centre_application_has_assistant():
    hub = (JS / "centre-application.js").read_text(encoding="utf-8")
    assert "assistant.html" in hub
    assert "filterScreens" in hub or "PermissionGuard" in hub


def test_analyse_donnees_uses_backend_export():
    js = (JS / "analyse-donnees.js").read_text(encoding="utf-8")
    assert "apiCaptures.export" in js
