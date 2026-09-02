"""Classification d'images de spécimens entomologiques via ONNX."""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

import numpy as np

from app.services.ml_training import _image_feature_vector
from app.services.model_registry import load_manifest, registry_model_path

IMAGE_MODEL_FILE = "entomo-image-v1.onnx"


@dataclass
class ImageClassificationResult:
    espece_detectee: str
    confiance: float
    distribution: Dict[str, float]
    modele: str
    temps_traitement: float


def _parse_onnx_probabilities(outputs, labels: list[str]) -> Dict[str, float]:
    if len(outputs) >= 2:
        probs = outputs[1]
        if isinstance(probs, list) and probs and isinstance(probs[0], dict):
            mapping = probs[0]
            return {str(k): round(float(v), 4) for k, v in mapping.items()}
        flat = np.asarray(probs).flatten()
        if flat.size == len(labels):
            total = flat.sum() or 1.0
            return {labels[i]: round(float(flat[i] / total), 4) for i in range(len(labels))}
    logits = np.asarray(outputs[0]).flatten().astype(np.float64)
    if logits.dtype.kind in {"U", "S", "O"}:
        species = str(logits[0])
        return {species: 1.0}
    if logits.size == len(labels):
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / exp_logits.sum()
        return {labels[i]: round(float(probs[i]), 4) for i in range(len(labels))}
    return {"inconnu": 1.0}


def classify_image_file(
    image_path: str,
    model_chemin: Optional[str] = None,
    model_nom: Optional[str] = None,
) -> ImageClassificationResult:
    import onnxruntime as ort
    from PIL import Image

    started = time.perf_counter()
    path = Path(image_path)
    if not path.is_file():
        raise FileNotFoundError(f"Image introuvable: {image_path}")

    manifest = load_manifest("image") or {}
    labels = manifest.get("labels") or []
    model_path = Path(model_chemin) if model_chemin else registry_model_path("image", IMAGE_MODEL_FILE)
    if not model_path.is_file():
        raise FileNotFoundError("Modèle image ONNX introuvable — lancez un pipeline d'entraînement.")

    image = Image.open(path).convert("RGB")
    features = _image_feature_vector(image).reshape(1, -1).astype(np.float32)

    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: features})
    distribution = _parse_onnx_probabilities(outputs, labels)
    if not distribution:
        raise ValueError("Le modèle image n'a produit aucune probabilité")

    best_species = max(distribution, key=distribution.get)
    confidence = float(distribution[best_species])
    return ImageClassificationResult(
        espece_detectee=best_species,
        confiance=round(confidence, 4),
        distribution=distribution,
        modele=model_nom or manifest.get("name", "entomo-image-v1"),
        temps_traitement=round(time.perf_counter() - started, 3),
    )
