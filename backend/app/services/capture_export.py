"""Export CSV/Excel des captures pour l'analyse des données."""

from __future__ import annotations

import csv
import io
from datetime import date, datetime, time
from typing import Optional

from openpyxl import Workbook
from sqlalchemy.orm import Session, joinedload

from app.models.capture import Capture


EXPORT_COLUMNS = [
    ("id", "ID"),
    ("date_capture", "Date capture"),
    ("site_id", "Site ID"),
    ("site_nom", "Site"),
    ("espece", "Espèce"),
    ("espece_corrigee", "Espèce corrigée"),
    ("nombre_individus", "Individus"),
    ("methode_capture", "Méthode"),
    ("statut", "Statut"),
    ("confiance", "Confiance IA"),
    ("sexe", "Sexe"),
    ("stade", "Stade"),
    ("temperature", "Température"),
    ("humidite", "Humidité"),
    ("notes", "Notes"),
]


def _query_captures(
    db: Session,
    *,
    site_id: Optional[int] = None,
    statut: Optional[str] = None,
    search: Optional[str] = None,
    date_debut: Optional[date] = None,
    date_fin: Optional[date] = None,
    limit: int = 10000,
):
    query = db.query(Capture).options(joinedload(Capture.site))
    if site_id:
        query = query.filter(Capture.site_id == site_id)
    if statut:
        query = query.filter(Capture.statut == statut)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            Capture.espece.ilike(term)
            | Capture.methode_capture.ilike(term)
            | Capture.notes.ilike(term)
        )
    if date_debut:
        query = query.filter(Capture.date_capture >= datetime.combine(date_debut, time.min))
    if date_fin:
        query = query.filter(Capture.date_capture <= datetime.combine(date_fin, time.max))
    return query.order_by(Capture.date_capture.desc()).limit(limit).all()


def _row_values(capture: Capture) -> list:
    conf = capture.confidence_ia if capture.confidence_ia is not None else capture.confiance
    return [
        capture.id,
        capture.date_capture.isoformat(sep=" ") if capture.date_capture else "",
        capture.site_id,
        capture.site.nom if capture.site else "",
        capture.espece or "",
        capture.espece_corrigee or "",
        capture.nombre_individus or 0,
        capture.methode_capture or "",
        capture.statut or "",
        round(float(conf) * 100, 1) if conf is not None else "",
        capture.sexe or "",
        capture.stade or "",
        capture.temperature if capture.temperature is not None else "",
        capture.humidite if capture.humidite is not None else "",
        (capture.notes or "").replace("\n", " "),
    ]


def export_captures_csv(db: Session, **filters) -> bytes:
    captures = _query_captures(db, **filters)
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow([label for _, label in EXPORT_COLUMNS])
    for capture in captures:
        writer.writerow(_row_values(capture))
    return buffer.getvalue().encode("utf-8-sig")


def export_captures_xlsx(db: Session, **filters) -> bytes:
    captures = _query_captures(db, **filters)
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Captures"
    sheet.append([label for _, label in EXPORT_COLUMNS])
    for capture in captures:
        sheet.append(_row_values(capture))
    sheet.column_dimensions["A"].width = 10
    sheet.column_dimensions["D"].width = 28
    sheet.column_dimensions["E"].width = 22
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
