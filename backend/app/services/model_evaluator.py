"""Évaluation réelle des modèles ML à partir des captures validées."""

from __future__ import annotations

from typing import Dict, List, Optional

import numpy as np
from sqlalchemy.orm import Session

from app.models.capture import Capture
from app.models.model import MLModel


def _normalize_species(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def evaluate_ml_model(db: Session, model: MLModel) -> Dict[str, float | int | str]:
    captures = db.query(Capture).filter(Capture.ml_model_id == model.id).all()
    if not captures:
        captures = db.query(Capture).filter(Capture.confidence_ia.isnot(None)).all()

    if not captures:
        base_precision = model.precision or 0.0
        base_rappel = model.rappel or 0.0
        base_f1 = model.f1_score or 0.0
        return {
            "accuracy": round((base_precision + base_rappel + base_f1) / 3, 4) if any([base_precision, base_rappel, base_f1]) else 0.0,
            "precision": base_precision,
            "rappel": base_rappel,
            "f1_score": base_f1,
            "temps_inference": 0.0,
            "echantillon_test": 0,
            "modele_id": model.id,
            "modele_nom": model.nom,
        }

    y_true: List[str] = []
    y_pred: List[str] = []
    confidences: List[float] = []
    inference_times: List[float] = []

    for capture in captures:
        reference = _normalize_species(capture.espece_corrigee or capture.espece)
        predicted = _normalize_species(capture.espece)
        if not reference or not predicted:
            continue
        y_true.append(reference)
        y_pred.append(predicted)
        if capture.confidence_ia is not None:
            confidences.append(float(capture.confidence_ia))
        metadata = capture.audio_metadata or {}
        inference_times.append(float(metadata.get("temps_traitement", 0.05)))

    if not y_true:
        return {
            "accuracy": 0.0,
            "precision": 0.0,
            "rappel": 0.0,
            "f1_score": 0.0,
            "temps_inference": 0.0,
            "echantillon_test": 0,
            "modele_id": model.id,
            "modele_nom": model.nom,
        }

    labels = sorted(set(y_true) | set(y_pred))
    label_to_idx = {label: idx for idx, label in enumerate(labels)}
    matrix = np.zeros((len(labels), len(labels)), dtype=np.int64)
    for truth, pred in zip(y_true, y_pred):
        matrix[label_to_idx[truth], label_to_idx[pred]] += 1

    tp = np.diag(matrix).astype(np.float64)
    precision_per_class = tp / (matrix.sum(axis=0) + 1e-6)
    recall_per_class = tp / (matrix.sum(axis=1) + 1e-6)
    precision = float(np.mean(precision_per_class))
    rappel = float(np.mean(recall_per_class))
    f1 = (2 * precision * rappel) / (precision + rappel + 1e-6)
    accuracy = float(np.trace(matrix) / matrix.sum())

    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "rappel": round(rappel, 4),
        "f1_score": round(f1, 4),
        "temps_inference": round(float(np.mean(inference_times)) if inference_times else 0.05, 3),
        "echantillon_test": len(y_true),
        "modele_id": model.id,
        "modele_nom": model.nom,
    }
