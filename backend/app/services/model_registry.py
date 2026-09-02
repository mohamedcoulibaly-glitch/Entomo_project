"""Registre local des artefacts ML versionnés."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional

REGISTRY_ROOT = Path(__file__).resolve().parents[2] / "models_registry"
AUDIO_DIR = REGISTRY_ROOT / "audio"
IMAGE_DIR = REGISTRY_ROOT / "image"


def _write_manifest(directory: Path, manifest: Dict[str, Any]) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    manifest_path = directory / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    return manifest_path


def load_manifest(kind: str) -> Optional[Dict[str, Any]]:
    directory = AUDIO_DIR if kind == "audio" else IMAGE_DIR
    manifest_path = directory / "manifest.json"
    if not manifest_path.is_file():
        return None
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def registry_model_path(kind: str, filename: str) -> Path:
    directory = AUDIO_DIR if kind == "audio" else IMAGE_DIR
    return directory / filename
