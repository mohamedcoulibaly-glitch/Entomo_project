"""Vérifie l'absence de dépendances CDN externes critiques en production."""

from pathlib import Path

WWW = Path(__file__).resolve().parents[1] / "www"


def test_no_tailwind_cdn_in_html():
    offenders = []
    for html in WWW.rglob("*.html"):
        text = html.read_text(encoding="utf-8")
        if "cdn.tailwindcss.com" in text:
            offenders.append(str(html.relative_to(WWW)))
    assert not offenders, f"CDN Tailwind encore présent: {offenders}"


def test_local_tailwind_css_exists():
    css = WWW / "css" / "tailwind.min.css"
    assert css.is_file()
    assert css.stat().st_size > 10_000


def test_no_google_avatar_urls():
    offenders = []
    for html in WWW.rglob("*.html"):
        text = html.read_text(encoding="utf-8")
        if "googleusercontent.com" in text:
            offenders.append(str(html.relative_to(WWW)))
    assert not offenders, f"Avatars Google encore présents: {offenders}"


def test_design_tokens_css_exists():
    assert (WWW / "css" / "design-tokens.css").is_file()


def test_avatar_component_exists():
    assert (WWW / "js" / "components" / "avatar.js").is_file()


def test_pages_generiques_has_no_fake_validation():
    text = (WWW / "js" / "pages-generiques.js").read_text(encoding="utf-8")
    assert "confirmValidation" not in text
    assert "validation-dhis2" not in text.lower() or "hasDedicatedScript" not in text
