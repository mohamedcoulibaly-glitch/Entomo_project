"""Met à jour les pages HTML : CSS local, suppression des images externes."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "www"
TAILWIND_CDN_RE = re.compile(
    r'\s*<script src="https://cdn\.tailwindcss\.com[^"]*"></script>\s*',
    re.IGNORECASE,
)
GOOGLE_IMG_RE = re.compile(
    r"background-image:\s*url\([\"']https://lh3\.googleusercontent\.com[^\"')]+[\"']\);?",
    re.IGNORECASE,
)
GOOGLE_IMG_SRC_RE = re.compile(
    r'\s*src="https://lh3\.googleusercontent\.com[^"]*"',
    re.IGNORECASE,
)


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text

    depth = "../" if "/pages/" in str(path).replace("\\", "/") else ""
    css_link = f'    <link rel="stylesheet" href="{depth}css/tailwind.min.css" />\n    <link rel="stylesheet" href="{depth}css/design-tokens.css" />'

    if "cdn.tailwindcss.com" in text:
        text = TAILWIND_CDN_RE.sub(f"\n{css_link}\n", text, count=1)
    elif "css/tailwind.min.css" not in text and path.suffix == ".html":
        text = text.replace("</head>", f"{css_link}\n</head>", 1)

    text = GOOGLE_IMG_RE.sub("", text)
    text = GOOGLE_IMG_SRC_RE.sub(' data-entomo-avatar="1"', text)
    text = text.replace("style=''", "").replace('style=""', "")

    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed = 0
    for html in ROOT.rglob("*.html"):
        if patch_file(html):
            changed += 1
            print(f"updated: {html.relative_to(ROOT)}")
    print(f"Done. {changed} fichier(s) modifié(s).")


if __name__ == "__main__":
    main()
