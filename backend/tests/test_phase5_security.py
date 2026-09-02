"""Tests Phase 5 — sécurité uploads et rate limiting."""

from io import BytesIO
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.core.rate_limit import check_login_allowed, record_failed_login, reset_login_attempts
from app.services.upload_validation import validate_upload_file, MAX_IMAGE_BYTES


def test_validate_upload_rejects_bad_extension():
    file = MagicMock()
    file.filename = "malware.exe"
    with pytest.raises(HTTPException) as exc:
        validate_upload_file(file, "image")
    assert exc.value.status_code == 400


def test_validate_upload_accepts_jpeg():
    file = MagicMock()
    file.filename = "photo.jpg"
    ext, max_bytes = validate_upload_file(file, "image")
    assert ext == ".jpg"
    assert max_bytes == MAX_IMAGE_BYTES


def test_login_rate_limit_blocks_after_five():
    key = "test-ip-phase5"
    reset_login_attempts(key)
    for _ in range(5):
        assert check_login_allowed(key)
        record_failed_login(key)
    assert not check_login_allowed(key)
    reset_login_attempts(key)


def test_save_upload_stream_rejects_huge(tmp_path):
    from pathlib import Path
    from app.services.upload_validation import save_upload_stream

    dest = tmp_path / "big.jpg"
    mock = MagicMock()
    mock.file.read = lambda n=65536: b"x" * (6 * 1024 * 1024)
    with pytest.raises(HTTPException) as exc:
        save_upload_stream(mock, dest, 5 * 1024 * 1024)
    assert exc.value.status_code == 413
    assert not dest.exists()
