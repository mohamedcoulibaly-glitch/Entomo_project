"""Tests unitaires pour la page surveillance audio et l'API associée."""

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
WWW_DIR = BASE_DIR / "www"
JS_DIR = WWW_DIR / "js"
PAGES_DIR = WWW_DIR / "pages"


def test_surveillance_audio_page_exists():
    page = PAGES_DIR / "surveillance-audio.html"
    assert page.exists()
    content = page.read_text(encoding="utf-8")
    assert "surveillance-audio.js" in content
    assert 'data-audio-container' in content
    assert 'data-stat="precision"' in content


def test_api_js_exposes_audio_endpoints():
    api_js = (JS_DIR / "api.js").read_text(encoding="utf-8")
    assert "analyser(id" in api_js
    assert "statsAudio()" in api_js
    assert "/captures/${id}/analyser" in api_js
    assert "/captures/stats-audio" in api_js


def test_surveillance_audio_js_uses_analyser_endpoint():
    js = (JS_DIR / "surveillance-audio.js").read_text(encoding="utf-8")
    assert "apiCaptures.analyser" in js
    assert "apiCaptures.statsAudio" in js
    assert "action: 'analyser'" not in js
    assert "apiCaptures.valider" not in js
    assert "hidden-audio-player" in js
    assert "addEventListener('click'" in js


def test_surveillance_audio_js_maps_backend_statuts():
    js = (JS_DIR / "surveillance-audio.js").read_text(encoding="utf-8")
    assert "a_valider" in js
    assert "fichier_url" in js or "audio_path" in js


def test_surveillance_audio_js_has_waveform_and_export():
    js = (JS_DIR / "surveillance-audio.js").read_text(encoding="utf-8")
    assert "AudioWaveform" in js
    assert "exportCaptures" in js
    assert "downloadJson" in js
