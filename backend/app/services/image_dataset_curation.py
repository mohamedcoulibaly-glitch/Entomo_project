"""Curation du dataset d'images entomologiques pour l'entraînement du classifieur visuel.

Contexte (audit du 2026-09-22) : la table `captures` contient 115 lignes avec
une `image_path`, mais celles-ci ne référencent que 12 fichiers réellement
distincts (par hash MD5) — les mêmes photos sont réutilisées des dizaines de
fois sous des noms de fichiers différents, et plusieurs d'entre elles portent
des labels d'espèce contradictoires selon la capture (une même photo étiquetée
tantôt "An. gambiae", tantôt "Cx. quinquefasciatus"). Deux fichiers ne sont
même pas des photos de moustiques exploitables. Ce module centralise la
résolution de ces incohérences pour que le pipeline d'entraînement (et tout
futur outil d'audit) parte d'une vérité unique et documentée, plutôt que de
faire confiance aveuglément au champ `espece` de chaque capture individuelle.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.capture import Capture

REFERENCE_DATASET_DIR = Path(__file__).resolve().parents[2] / "data" / "ml_image_reference"

# Hashes MD5 de fichiers confirmés inutilisables pour l'entraînement, avec la
# raison constatée manuellement (audit du 2026-09-22) :
EXCLUDED_IMAGE_HASHES: Dict[str, str] = {
    "ba3bdea20bdb2fbc373cee1acdea5aa9": "Fichier factice (contenu texte 'fake-image...'), pas une image réelle",
    "d1f167ac394f37287f03fb6f8f1cf5b5": "Photo hors-sujet (collage sportif), aucun moustique visible",
}


@dataclass
class CuratedImageEntry:
    file_path: str
    label: str
    file_hash: str
    n_captures: int
    label_votes: Dict[str, int]
    had_label_conflict: bool
    source: str = "capture"  # "capture" (vraie donnée terrain) ou "reference" (photo Wikimedia/CDC)


def _normalize_label(label: Optional[str]) -> str:
    """Corrige les variations de casse/espacement (ex: 'An.Gambiae' -> 'An. gambiae')."""
    if not label:
        return ""
    cleaned = label.strip()
    known = ["An. gambiae", "An. funestus", "An. arabiensis", "Ae. aegypti", "Ae. albopictus", "Cx. quinquefasciatus"]
    for k in known:
        if cleaned.replace(" ", "").replace(".", "").lower() == k.replace(" ", "").replace(".", "").lower():
            return k
    return cleaned


def _resolve_file_path(image_path: str, upload_dir: Path) -> Optional[Path]:
    path = Path(image_path)
    if path.is_file():
        return path
    alt = upload_dir / path.name
    if alt.is_file():
        return alt
    return None


def curate_image_dataset(db: Session, upload_dir: Path) -> List[CuratedImageEntry]:
    """Regroupe les captures par fichier image réellement distinct (hash MD5),
    résout le label de chaque groupe par vote majoritaire parmi les captures
    qui l'utilisent, et exclut les fichiers connus comme inutilisables.

    Retourne une entrée par image distincte (pas par capture) : c'est la seule
    façon d'obtenir un dataset sans duplication, condition nécessaire à toute
    séparation train/validation/test qui ait un sens.
    """
    captures = (
        db.query(Capture)
        .filter(Capture.image_path.isnot(None), Capture.espece.isnot(None))
        .all()
    )

    groups: Dict[str, Dict] = {}
    for capture in captures:
        resolved = _resolve_file_path(capture.image_path, upload_dir)
        if not resolved:
            continue
        with resolved.open("rb") as handle:
            file_hash = hashlib.md5(handle.read()).hexdigest()
        if file_hash in EXCLUDED_IMAGE_HASHES:
            continue
        group = groups.setdefault(file_hash, {"path": resolved, "labels": []})
        label = _normalize_label(capture.espece_corrigee or capture.espece)
        if label:
            group["labels"].append(label)

    entries: List[CuratedImageEntry] = []
    for file_hash, group in groups.items():
        if not group["labels"]:
            continue
        votes = Counter(group["labels"])
        best_label, _ = votes.most_common(1)[0]
        entries.append(
            CuratedImageEntry(
                file_path=str(group["path"]),
                label=best_label,
                file_hash=file_hash,
                n_captures=len(group["labels"]),
                label_votes=dict(votes),
                had_label_conflict=len(votes) > 1,
            )
        )
    return entries


def load_reference_images() -> List[CuratedImageEntry]:
    """Charge le jeu de photos de référence (Wikimedia Commons/CDC PHIL) monté
    en secours pour les espèces trop peu représentées dans les vraies captures
    (voir data/ml_image_reference/manifest.json). Ce ne sont pas des captures
    de terrain — chaque entrée est marquée source="reference" pour que le
    reste du pipeline (et le manifest du modèle final) ne les confonde jamais
    avec de vraies données Sénégal.
    """
    manifest_path = REFERENCE_DATASET_DIR / "manifest.json"
    if not manifest_path.is_file():
        return []
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []

    entries: List[CuratedImageEntry] = []
    for item in manifest.get("entries", []):
        # Les fichiers "processed/" sont des copies redimensionnées (max 512px)
        # des originaux dans "raw/" — décoder des JPEG de 5-15 Mo à chaque
        # entraînement pour n'en garder qu'une réduction 32x32 était inutile
        # et rendait l'entraînement plusieurs minutes plus lent.
        stem = Path(item["file"]).stem
        file_path = REFERENCE_DATASET_DIR / "processed" / f"{stem}.jpg"
        if not file_path.is_file():
            file_path = REFERENCE_DATASET_DIR / "raw" / item["file"]
        if not file_path.is_file():
            continue
        label = _normalize_label(item.get("espece"))
        if not label:
            continue
        with file_path.open("rb") as handle:
            file_hash = hashlib.md5(handle.read()).hexdigest()
        entries.append(
            CuratedImageEntry(
                file_path=str(file_path),
                label=label,
                file_hash=file_hash,
                n_captures=0,
                label_votes={label: 1},
                had_label_conflict=False,
                source="reference",
            )
        )
    return entries
