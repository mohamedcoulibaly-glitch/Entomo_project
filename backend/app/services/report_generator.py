from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path
from typing import Iterable

from openpyxl import Workbook


REPORT_DIR = Path("uploads") / "reports"


def _rows(summary: dict) -> list[tuple[str, object]]:
    return [
        ("Sites sentinelles", summary.get("sites", 0)),
        ("Captures", summary.get("captures", 0)),
        ("Individus", summary.get("individus", 0)),
        ("Confiance IA moyenne", f"{summary.get('confiance_moyenne', 0):.1f}%"),
        ("Captures validees", summary.get("validees", 0)),
    ]


def generate_report_file(report_id: int, title: str, output_format: str, summary: dict, indicators: Iterable[str]) -> str:
    """Génère un vrai fichier de rapport et retourne son URL publique."""
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    fmt = (output_format or "pdf").lower().replace("excel", "xlsx")
    if fmt not in {"pdf", "csv", "xlsx"}:
        fmt = "pdf"
    path = REPORT_DIR / f"rapport-{report_id}.{fmt}"
    indicator_list = [str(value) for value in indicators]

    if fmt == "csv":
        with path.open("w", newline="", encoding="utf-8-sig") as handle:
            writer = csv.writer(handle)
            writer.writerow([title])
            writer.writerow(["Genere le", datetime.now().isoformat(timespec="minutes")])
            writer.writerow([])
            writer.writerow(["Indicateur", "Valeur"])
            writer.writerows(_rows(summary))
            writer.writerow([])
            writer.writerow(["Indicateurs selectionnes"])
            writer.writerows([[item] for item in indicator_list])
    elif fmt == "xlsx":
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Synthese"
        sheet.append([title])
        sheet.append(["Genere le", datetime.now().isoformat(timespec="minutes")])
        sheet.append([])
        sheet.append(["Indicateur", "Valeur"])
        for row in _rows(summary):
            sheet.append(list(row))
        sheet.append([])
        sheet.append(["Indicateurs selectionnes"])
        for item in indicator_list:
            sheet.append([item])
        sheet.column_dimensions["A"].width = 32
        sheet.column_dimensions["B"].width = 22
        workbook.save(path)
    else:
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.lib.units import mm
            from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
        except ImportError as exc:
            raise RuntimeError("La dépendance reportlab est requise pour générer un PDF") from exc

        styles = getSampleStyleSheet()
        document = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm)
        story = [
            Paragraph("ENTO-APP AFRIQUE", styles["Title"]),
            Paragraph(title, styles["Heading1"]),
            Paragraph(f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", styles["Normal"]),
            Spacer(1, 8 * mm),
        ]
        data = [["Indicateur", "Valeur"], *[[label, str(value)] for label, value in _rows(summary)]]
        table = Table(data, colWidths=[105 * mm, 55 * mm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("PADDING", (0, 0), (-1, -1), 7),
        ]))
        story.extend([table, Spacer(1, 8 * mm), Paragraph("Indicateurs inclus", styles["Heading2"])])
        story.extend(Paragraph(f"- {item}", styles["Normal"]) for item in indicator_list or ["Synthèse générale"])
        story.extend([Spacer(1, 10 * mm), Paragraph("Rapport produit automatiquement à partir des données validées de la plateforme Ento-App Afrique.", styles["Italic"])])
        document.build(story)

    return f"/uploads/reports/{path.name}"
