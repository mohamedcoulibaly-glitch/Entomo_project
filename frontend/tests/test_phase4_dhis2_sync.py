"""Tests Phase 4 frontend — DHIS2 sync API et offline."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WWW = ROOT / "frontend" / "www"
JS = WWW / "js"


def test_api_validate_and_push_uses_sync_capture():
    text = (JS / "api.js").read_text(encoding="utf-8")
    assert "syncCapture" in text
    assert "validateAndPush" in text
    idx = text.find("validateAndPush")
    block = text[idx:idx + 600]
    assert "syncCapture" in block


def test_api_sync_resolve_conflict():
    text = (JS / "api.js").read_text(encoding="utf-8")
    assert "resolveConflict" in text
    assert "/sync/queue/" in text


def test_offline_sync_backoff():
    text = (JS / "offline-sync.js").read_text(encoding="utf-8")
    assert "_backoffUntil" in text
    assert "purgeExpired" in text
    assert "registerFailure" in text


def test_offline_store_purge_expired():
    text = (JS / "offline-store.js").read_text(encoding="utf-8")
    assert "purgeExpired" in text
    assert "cached_at" in text


def test_gestion_hors_ligne_conflict_mapping():
    text = (JS / "gestion-hors-ligne.js").read_text(encoding="utf-8")
    assert "conflict_count" in text or "statut === 'conflict'" in text
    assert "erreur" in text
    assert "conflit" in text
