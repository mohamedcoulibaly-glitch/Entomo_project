"""Tests Phase 5 frontend — sécurité et déploiement."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_upload_validation_module_exists():
    path = ROOT / "backend" / "app" / "services" / "upload_validation.py"
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "MAX_IMAGE_BYTES" in text
    assert "save_upload_stream" in text


def test_rate_limit_module_exists():
    path = ROOT / "backend" / "app" / "core" / "rate_limit.py"
    assert path.is_file()


def test_nginx_ssl_example_exists():
    assert (ROOT / "frontend" / "nginx-ssl.example.conf").is_file()
