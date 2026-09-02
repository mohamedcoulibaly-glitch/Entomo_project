"""Planification automatique des rapports programmés (APScheduler)."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.report import Rapport, RapportProgramme
from app.services.report_generator import generate_report_file

logger = logging.getLogger(__name__)
_scheduler: Optional[BackgroundScheduler] = None


def compute_next_envoi(recurrence: Optional[str], reference: Optional[datetime] = None) -> datetime:
    now = reference or datetime.utcnow()
    key = (recurrence or "hebdomadaire").lower()
    if key.startswith("quot"):
        return now + timedelta(days=1)
    if key.startswith("mens"):
        return now + timedelta(days=30)
    return now + timedelta(days=7)


def _generate_for_programme(db: Session, programme: RapportProgramme) -> None:
    rapport = db.query(Rapport).filter(Rapport.id == programme.rapport_id).first()
    if not rapport:
        programme.actif = False
        db.commit()
        return

    summary = {"scheduled": True, "programme_id": programme.id}
    if rapport.contenu:
        try:
            summary = {**summary, **json.loads(rapport.contenu)}
        except json.JSONDecodeError:
            pass

    fmt = (rapport.format_fichier or "pdf").lower()
    indicateurs = summary.get("indicateurs", []) if isinstance(summary, dict) else []
    rapport.chemin_fichier = generate_report_file(rapport.id, rapport.titre, fmt, summary, indicateurs)
    rapport.statut = "pret"
    rapport.date_generation = datetime.utcnow()
    programme.dernier_envoi = datetime.utcnow()
    programme.prochain_envoi = compute_next_envoi(programme.recurrence, programme.dernier_envoi)
    db.commit()
    logger.info("Rapport %s généré pour programme %s", rapport.id, programme.id)


def process_due_programmes(db: Session) -> int:
    now = datetime.utcnow()
    programmes = (
        db.query(RapportProgramme)
        .filter(
            RapportProgramme.actif.is_(True),
            RapportProgramme.prochain_envoi.isnot(None),
            RapportProgramme.prochain_envoi <= now,
        )
        .all()
    )
    for programme in programmes:
        try:
            _generate_for_programme(db, programme)
        except Exception as exc:
            logger.exception("Échec génération programme %s: %s", programme.id, exc)
    return len(programmes)


def _tick() -> None:
    db = SessionLocal()
    try:
        process_due_programmes(db)
    finally:
        db.close()


def start_report_scheduler() -> Optional[BackgroundScheduler]:
    global _scheduler
    if os.environ.get("TESTING") or os.environ.get("DISABLE_REPORT_SCHEDULER"):
        return None
    if _scheduler and _scheduler.running:
        return _scheduler
    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(_tick, "interval", minutes=1, id="report_programmes", replace_existing=True)
    _scheduler.start()
    return _scheduler


def stop_report_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
    _scheduler = None
