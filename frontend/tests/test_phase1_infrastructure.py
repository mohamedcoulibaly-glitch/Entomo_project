"""Tests Phase 1 — infrastructure API, config-boot, médias, Docker."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
WWW = ROOT / "frontend" / "www"
JS = WWW / "js"


def test_config_boot_exists():
    assert (JS / "config-boot.js").is_file()


def test_config_boot_sets_entomo_api_base():
    text = (JS / "config-boot.js").read_text(encoding="utf-8")
    assert "ENTOMO_API_BASE" in text
    assert "resolveMediaUrl" in text
    assert "8766" in text or "8876" in text


def test_api_js_no_hardcoded_health_url():
    text = (JS / "api.js").read_text(encoding="utf-8")
    assert "127.0.0.1:8765/health" not in text


def test_api_js_has_upload_methods():
    text = (JS / "api.js").read_text(encoding="utf-8")
    assert "uploadAudio" in text
    assert "uploadImage" in text
    assert "resolveMediaUrl" in text


def test_api_js_uses_config_boot():
    text = (JS / "api.js").read_text(encoding="utf-8")
    assert "ENTOMO_CONFIG" in text or "ENTOMO_API_BASE" in text


def test_details_capture_no_hardcoded_media_host():
    text = (JS / "details-capture.js").read_text(encoding="utf-8")
    assert "127.0.0.1:8765" not in text


def test_design_tokens_enhanced():
    css = (WWW / "css" / "design-tokens.css").read_text(encoding="utf-8")
    assert "entomo-card" in css
    assert "entomo-btn-primary" in css
    assert "#api-status-badge" in css


def test_core_image_fallback_replaces_element():
    text = (JS / "core.js").read_text(encoding="utf-8")
    assert "replaceWith" in text
    assert "entomo-image-fallback" in text


def test_docker_compose_has_frontend_service():
    compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    assert "frontend:" in compose
    assert "entomo_models" in compose


def test_frontend_dockerfile_exists():
    assert (ROOT / "frontend" / "Dockerfile").is_file()
    assert (ROOT / "frontend" / "nginx.conf").is_file()


def test_inject_scripts_includes_config_boot():
    text = (WWW / "inject_scripts.py").read_text(encoding="utf-8")
    assert "config-boot.js" in text


def test_pages_load_config_boot_before_api():
    """Pages avec scripts inline doivent charger config-boot avant api.js."""
    offenders = []
    for html in WWW.rglob("*.html"):
        text = html.read_text(encoding="utf-8")
        if "api.js" not in text:
            continue
        api_pos = text.find("api.js")
        boot_pos = text.find("config-boot.js")
        if boot_pos == -1 or boot_pos > api_pos:
            offenders.append(str(html.relative_to(WWW)))
    assert not offenders, f"config-boot.js manquant ou après api.js: {offenders[:5]}"


def test_cdc_document_exists():
    cdc = ROOT / "docs" / "CDC_MISE_A_100_POURCENT.md"
    assert cdc.is_file()
    content = cdc.read_text(encoding="utf-8")
    assert "Phase 1" in content
    assert "Phase 6" in content
