"""Validation centralisée des uploads (MIME, taille, extension)."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import HTTPException, UploadFile

VALID_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
VALID_AUDIO_EXT = {".wav", ".mp3", ".ogg", ".flac", ".m4a", ".webm"}
VALID_DOC_EXT = {".pdf", ".xlsx", ".xls", ".csv", ".json", ".pt", ".onnx", ".h5", ".pkl"}

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_AUDIO_BYTES = 10 * 1024 * 1024
MAX_DOC_BYTES = 10 * 1024 * 1024

_KIND_MAP = {
    "image": (VALID_IMAGE_EXT, MAX_IMAGE_BYTES),
    "audio": (VALID_AUDIO_EXT, MAX_AUDIO_BYTES),
    "doc": (VALID_DOC_EXT, MAX_DOC_BYTES),
    "any": (VALID_IMAGE_EXT | VALID_AUDIO_EXT | VALID_DOC_EXT, MAX_AUDIO_BYTES),
}


def validate_upload_file(file: UploadFile, kind: str = "any") -> tuple[str, int]:
    """Retourne (extension, max_bytes) ou HTTPException."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Fichier requis")
    ext = os.path.splitext(file.filename)[1].lower()
    allowed, max_bytes = _KIND_MAP.get(kind, _KIND_MAP["any"])
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non autorisé: {ext or 'sans extension'}",
        )
    return ext, max_bytes


def save_upload_stream(file: UploadFile, dest: Path, max_bytes: int) -> int:
    """Écrit le fichier avec limite de taille stricte."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    total = 0
    try:
        with dest.open("wb") as handle:
            while True:
                chunk = file.file.read(64 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Fichier trop volumineux (max {max_bytes // (1024 * 1024)} Mo)",
                    )
                handle.write(chunk)
    except HTTPException:
        if dest.exists():
            dest.unlink()
        raise
    return total
