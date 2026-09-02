"""Phase 4 — UI/UX polish, waveform, exports, assistant, modèles visuels."""

from pathlib import Path

import pytest

WWW = Path(__file__).resolve().parents[1] / "www"
PAGES = WWW / "pages"
JS = WWW / "js"

PRIORITY_PAGES = [
    "surveillance-audio.html",
    "gestion-modeles-visuels.html",
    "assistant.html",
    "dashboard-entomo.html",
    "gestion-captures.html",
    "validation-dhis2.html",
    "gestion-hors-ligne.html",
    "centre-application.html",
    "alertes.html",
    "parametres-compte.html",
]


@pytest.mark.parametrize("page_name", PRIORITY_PAGES)
def test_priority_page_exists(page_name):
    assert (PAGES / page_name).is_file()


@pytest.mark.parametrize("page_name", PRIORITY_PAGES)
def test_priority_page_uses_local_tailwind(page_name):
    text = (PAGES / page_name).read_text(encoding="utf-8")
    assert "../css/tailwind.min.css" in text or "/css/tailwind.min.css" in text
    assert "cdn.tailwindcss.com" not in text


@pytest.mark.parametrize("page_name", PRIORITY_PAGES)
def test_priority_page_uses_design_tokens(page_name):
    text = (PAGES / page_name).read_text(encoding="utf-8")
    assert "design-tokens.css" in text


@pytest.mark.parametrize("page_name", PRIORITY_PAGES)
def test_priority_page_loads_core_js(page_name):
    text = (PAGES / page_name).read_text(encoding="utf-8")
    assert "core.js" in text


@pytest.mark.parametrize("page_name", PRIORITY_PAGES)
def test_priority_page_has_dark_mode_class(page_name):
    text = (PAGES / page_name).read_text(encoding="utf-8")
    assert 'class="light"' in text or "dark:" in text


@pytest.mark.parametrize("page_name", PRIORITY_PAGES)
def test_priority_page_no_placehold_co(page_name):
    text = (PAGES / page_name).read_text(encoding="utf-8")
    assert "placehold.co" not in text


def test_download_utils_exist():
    path = JS / "utils" / "download.js"
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "downloadJson" in text
    assert "downloadCsv" in text
    assert "escapeCsvCell" in text


def test_audio_waveform_utils_exist():
    path = JS / "utils" / "audio-waveform.js"
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "drawWaveform" in text
    assert "drawSpectrogram" in text
    assert "Web Audio API" in text


def test_surveillance_audio_exports():
    html = (PAGES / "surveillance-audio.html").read_text(encoding="utf-8")
    js = (JS / "surveillance-audio.js").read_text(encoding="utf-8")
    assert "data-audio-export-actions" in html
    assert "download.js" in html
    assert "audio-waveform.js" in html
    assert "exportCaptures" in js
    assert "exportAnalysisResult" in js
    assert "AudioWaveform.renderToCanvases" in js
    assert "ap-waveform" in js


def test_surveillance_audio_no_fake_export_toast_only():
    js = (JS / "surveillance-audio.js").read_text(encoding="utf-8")
    assert "downloadJson" in js
    assert "downloadCsv" in js
    assert "Résultats exportés en JSON" in js


def test_api_exposes_analyser_image_and_registry():
    api = (JS / "api.js").read_text(encoding="utf-8")
    assert "analyserImage" in api
    assert "/analyser-image" in api
    assert "registry()" in api
    assert "/modeles/registry" in api


def test_gestion_modeles_visuels_registry_integration():
    js = (JS / "gestion-modeles-visuels.js").read_text(encoding="utf-8")
    html = (PAGES / "gestion-modeles-visuels.html").read_text(encoding="utf-8")
    assert "loadRegistry" in js
    assert "apiModels.registry" in js
    assert "placehold.co" not in js
    assert "data-registry-precision" in html
    assert "data-pipeline-progress" in html
    assert "startPipelinePolling" in js


def test_gestion_modeles_fake_metrics_removed():
    html = (PAGES / "gestion-modeles-visuels.html").read_text(encoding="utf-8")
    assert "98.2%" not in html
    assert "97.8%" not in html


def test_assistant_shows_provider_badge():
    js = (JS / "assistant.js").read_text(encoding="utf-8")
    assert "res.provider" in js
    assert "meta.provider" in js


def test_sw_precaches_phase4_assets():
    sw = (WWW / "sw.js").read_text(encoding="utf-8")
    assert "/js/utils/download.js" in sw
    assert "/js/utils/audio-waveform.js" in sw
    assert "/js/tailwind-shim.js" in sw
    assert "surveillance-audio.html" in sw
    assert "gestion-modeles-visuels.html" in sw


def test_tailwind_shim_exists():
    shim = JS / "tailwind-shim.js"
    assert shim.is_file()
    assert "window.tailwind" in shim.read_text(encoding="utf-8")
