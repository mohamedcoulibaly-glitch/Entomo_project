"""Vérifications de santé pour les probes Kubernetes / monitoring."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.model_registry import load_manifest


def check_database(db: Session) -> Dict[str, Any]:
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


def check_ml_registry() -> Dict[str, Any]:
    audio = load_manifest("audio")
    image = load_manifest("image")
    registry_root = Path(__file__).resolve().parents[2] / "models_registry"
    return {
        "status": "ok" if audio and image else "degraded",
        "audio_ready": bool(audio),
        "image_ready": bool(image),
        "registry_path": str(registry_root),
    }


def build_health_summary(db: Session) -> Dict[str, Any]:
    db_status = check_database(db)
    ml_status = check_ml_registry()
    overall = "healthy"
    if db_status["status"] != "ok":
        overall = "unhealthy"
    elif ml_status["status"] != "ok":
        overall = "degraded"
    return {
        "status": overall,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "ml_registry": ml_status,
    }


def build_readiness(db: Session) -> Dict[str, Any]:
    db_status = check_database(db)
    ready = db_status["status"] == "ok"
    return {
        "status": "ready" if ready else "not_ready",
        "checks": {"database": db_status},
    }


def build_liveness() -> Dict[str, Any]:
    return {
        "status": "alive",
        "pid": os.getpid(),
    }
