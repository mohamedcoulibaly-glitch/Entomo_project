"""Tests Phase 2 — frontend dynamique : médias, Leaflet, i18n."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WWW = ROOT / "frontend" / "www"
JS = WWW / "js"
PAGES = WWW / "pages"


def test_audio_recorder_util_exists():
    path = JS / "utils" / "audio-recorder.js"
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "MediaRecorder" in text
    assert "EntomoAudioRecorder" in text


def test_creation_entite_capture_media():
    text = (JS / "creation-entite.js").read_text(encoding="utf-8")
    assert "injectCaptureMediaSection" in text
    assert "uploadImage" in text
    assert "uploadAudio" in text
    assert "capture-analyze-audio" in text


def test_nouvelle_capture_loads_audio_recorder():
    html = (PAGES / "nouvelle-capture.html").read_text(encoding="utf-8")
    assert "audio-recorder.js" in html
    assert "creation-entite.js" in html


def test_leaflet_vendor_local():
    assert (WWW / "vendor" / "leaflet" / "leaflet.js").is_file()
    assert (WWW / "vendor" / "leaflet" / "leaflet.css").is_file()
    assert (WWW / "vendor" / "leaflet" / "images" / "marker-icon.png").is_file()


def test_cartographie_uses_leaflet():
    html = (PAGES / "cartographie.html").read_text(encoding="utf-8")
    js = (JS / "cartographie.js").read_text(encoding="utf-8")
    assert "vendor/leaflet/leaflet.css" in html
    assert "vendor/leaflet/leaflet.js" in html
    assert "L.map" in js
    assert "tile.openstreetmap.org" in js
    assert "circleMarker" in js


def test_i18n_files_and_module():
    assert (WWW / "i18n" / "fr.json").is_file()
    assert (WWW / "i18n" / "en.json").is_file()
    assert (JS / "i18n.js").is_file()
    text = (JS / "i18n.js").read_text(encoding="utf-8")
    assert "EntomoI18n" in text
    assert "data-i18n" in text


def test_i18n_loaded_in_common_scripts():
    text = (WWW / "inject_scripts.py").read_text(encoding="utf-8")
    assert "i18n.js" in text


def test_api_upload_methods_present():
    text = (JS / "api.js").read_text(encoding="utf-8")
    assert "uploadAudio" in text
    assert "uploadImage" in text
