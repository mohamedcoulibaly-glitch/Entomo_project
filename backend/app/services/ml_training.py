"""Entraînement réel des modèles audio/image et export ONNX."""

from __future__ import annotations

import json
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
from sqlalchemy.orm import Session

from app.models.capture import Capture
from app.models.model import MLModel
from app.services.audio_preprocessing import SPECIES_BANDS, load_audio
from app.services.audio_classifier import generate_test_wav
from app.services.audio_preprocessing import (
    FEATURE_SIZE,
    SAMPLE_RATE,
    extract_mfcc_mel_features,
    species_list,
)
from app.services.model_registry import AUDIO_DIR, IMAGE_DIR, _write_manifest, registry_model_path
from app.services.terrain_dataset import load_terrain_dataset, terrain_dataset_available, get_terrain_stats

AUDIO_MODEL_FILE = "entomo-audio-v1.onnx"
IMAGE_MODEL_FILE = "entomo-image-v1.onnx"


@dataclass
class TrainingResult:
    model_path: str
    manifest_path: str
    precision: float
    rappel: float
    f1_score: float
    accuracy: float
    echantillons: int
    labels: List[str]
    logs: str


def _synthetic_audio_dataset(samples_per_class: int = 80) -> Tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(42)
    center_freqs = {
        "An. gambiae": 450.0,
        "An. funestus": 485.0,
        "An. arabiensis": 510.0,
        "Ae. aegypti": 600.0,
        "Cx. quinquefasciatus": 675.0,
    }
    features: List[np.ndarray] = []
    labels: List[str] = []

    for species, base_freq in center_freqs.items():
        low, high = SPECIES_BANDS[species]
        for _ in range(samples_per_class):
            freq = float(rng.uniform(low, high))
            duration = 2.0
            t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
            signal = np.sin(2 * np.pi * freq * t)
            signal += rng.normal(0, 0.05, size=signal.shape)
            features.append(extract_mfcc_mel_features(signal, SAMPLE_RATE))
            labels.append(species)

    return np.vstack(features), np.asarray(labels)


def _load_audio_dataset_from_captures(db: Session) -> Tuple[np.ndarray, np.ndarray]:
    # Priorité 1 : dataset terrain validé par experts
    if terrain_dataset_available():
        x_terrain, y_terrain, _meta = load_terrain_dataset()
        if len(x_terrain) >= 20 and len(set(y_terrain.tolist())) >= 2:
            return x_terrain, y_terrain

    captures = (
        db.query(Capture)
        .filter(Capture.audio_path.isnot(None), Capture.espece.isnot(None))
        .all()
    )
    features: List[np.ndarray] = []
    labels: List[str] = []
    for capture in captures:
        path = Path(capture.audio_path)
        if not path.is_file():
            alt = Path("uploads/captures") / path.name
            path = alt if alt.is_file() else path
        if not path.is_file():
            continue
        try:
            features.append(extract_mfcc_mel_features(*_load_signal(path)))
            labels.append(capture.espece_corrigee or capture.espece)
        except (ValueError, OSError):
            continue
    if not features:
        return _synthetic_audio_dataset()
    return np.vstack(features), np.asarray(labels)


def _load_signal(path: Path):
    return load_audio(str(path))


def _export_sklearn_onnx(model: RandomForestClassifier, path: Path, n_features: int) -> None:
    initial_type = [("input", FloatTensorType([None, n_features]))]
    onnx_model = convert_sklearn(model, initial_types=initial_type, target_opset=12)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as handle:
        handle.write(onnx_model.SerializeToString())


def train_audio_model(db: Session, *, pipeline_name: str = "audio-training") -> TrainingResult:
    started = time.perf_counter()
    x_data, y_labels = _load_audio_dataset_from_captures(db)
    unique_labels = sorted(set(y_labels.tolist()))
    if len(unique_labels) < 2:
        x_data, y_labels = _synthetic_audio_dataset()

    x_train, x_test, y_train, y_test = train_test_split(
        x_data, y_labels, test_size=0.2, random_state=42, stratify=y_labels
    )
    classifier = RandomForestClassifier(
        n_estimators=200,
        max_depth=16,
        min_samples_leaf=2,
        random_state=42,
        class_weight="balanced",
    )
    classifier.fit(x_train, y_train)
    predictions = classifier.predict(x_test)

    precision = float(precision_score(y_test, predictions, average="macro", zero_division=0))
    rappel = float(recall_score(y_test, predictions, average="macro", zero_division=0))
    f1 = float(f1_score(y_test, predictions, average="macro", zero_division=0))
    accuracy = float(accuracy_score(y_test, predictions))

    model_path = registry_model_path("audio", AUDIO_MODEL_FILE)
    _export_sklearn_onnx(classifier, model_path, FEATURE_SIZE)
    labels = sorted(classifier.classes_.tolist())
    manifest = {
        "name": "entomo-audio-v1",
        "version": "1.0.0",
        "type": "audio",
        "architecture": "RandomForest+mfcc13_mel64",
        "labels": labels,
        "feature_size": FEATURE_SIZE,
        "sample_rate": SAMPLE_RATE,
        "metrics": {
            "precision": round(precision, 4),
            "rappel": round(rappel, 4),
            "f1_score": round(f1, 4),
            "accuracy": round(accuracy, 4),
            "echantillons": int(len(x_data)),
        },
        "onnx_file": AUDIO_MODEL_FILE,
    }
    manifest_path = _write_manifest(AUDIO_DIR, manifest)
    elapsed = round(time.perf_counter() - started, 2)
    logs = (
        f"[{pipeline_name}] Entraînement audio terminé en {elapsed}s — "
        f"précision={precision:.3f}, rappel={rappel:.3f}, f1={f1:.3f}, "
        f"échantillons={len(x_data)}"
    )
    return TrainingResult(
        model_path=str(model_path),
        manifest_path=str(manifest_path),
        precision=round(precision, 4),
        rappel=round(rappel, 4),
        f1_score=round(f1, 4),
        accuracy=round(accuracy, 4),
        echantillons=len(x_data),
        labels=labels,
        logs=logs,
    )


def _synthetic_image_dataset(samples_per_class: int = 30) -> Tuple[np.ndarray, np.ndarray]:
    from PIL import Image

    rng = np.random.default_rng(7)
    palette = {
        "An. gambiae": (30, 90, 180),
        "An. funestus": (40, 120, 90),
        "An. arabiensis": (90, 60, 150),
        "Ae. aegypti": (200, 120, 40),
        "Cx. quinquefasciatus": (180, 40, 60),
    }
    features: List[np.ndarray] = []
    labels: List[str] = []
    for species, rgb in palette.items():
        for _ in range(samples_per_class):
            arr = np.zeros((32, 32, 3), dtype=np.uint8)
            noise = rng.integers(-25, 25, size=3)
            color = tuple(int(np.clip(c + noise[i], 0, 255)) for i, c in enumerate(rgb))
            arr[:, :] = color
            img = Image.fromarray(arr, mode="RGB")
            features.append(_image_feature_vector(img))
            labels.append(species)
    return np.vstack(features), np.asarray(labels)


def _image_feature_vector(image) -> np.ndarray:
    resized = image.resize((32, 32))
    arr = np.asarray(resized, dtype=np.float32) / 255.0
    hist_r, _ = np.histogram(arr[:, :, 0], bins=16, range=(0, 1))
    hist_g, _ = np.histogram(arr[:, :, 1], bins=16, range=(0, 1))
    hist_b, _ = np.histogram(arr[:, :, 2], bins=16, range=(0, 1))
    vector = np.concatenate([hist_r, hist_g, hist_b]).astype(np.float32)
    vector /= vector.sum() + 1e-6
    return vector


def _load_image_dataset_from_captures(db: Session) -> Tuple[np.ndarray, np.ndarray]:
    from PIL import Image

    captures = (
        db.query(Capture)
        .filter(Capture.image_path.isnot(None), Capture.espece.isnot(None))
        .all()
    )
    features: List[np.ndarray] = []
    labels: List[str] = []
    for capture in captures:
        path = Path(capture.image_path)
        if not path.is_file():
            alt = Path("uploads/captures") / path.name
            path = alt if alt.is_file() else path
        if not path.is_file():
            continue
        try:
            img = Image.open(path).convert("RGB")
            features.append(_image_feature_vector(img))
            labels.append(capture.espece_corrigee or capture.espece)
        except (OSError, ValueError):
            continue
    if len(features) < 10:
        return _synthetic_image_dataset()
    return np.vstack(features), np.asarray(labels)


def train_image_model(db: Session, *, pipeline_name: str = "image-training") -> TrainingResult:
    started = time.perf_counter()
    x_data, y_labels = _load_image_dataset_from_captures(db)
    x_train, x_test, y_train, y_test = train_test_split(
        x_data, y_labels, test_size=0.2, random_state=42, stratify=y_labels
    )
    classifier = RandomForestClassifier(n_estimators=80, random_state=42)
    classifier.fit(x_train, y_train)
    predictions = classifier.predict(x_test)
    precision = float(precision_score(y_test, predictions, average="macro", zero_division=0))
    rappel = float(recall_score(y_test, predictions, average="macro", zero_division=0))
    f1 = float(f1_score(y_test, predictions, average="macro", zero_division=0))
    accuracy = float(accuracy_score(y_test, predictions))

    n_features = x_data.shape[1]
    model_path = registry_model_path("image", IMAGE_MODEL_FILE)
    _export_sklearn_onnx(classifier, model_path, n_features)
    labels = sorted(classifier.classes_.tolist())
    manifest = {
        "name": "entomo-image-v1",
        "version": "1.0.0",
        "type": "image",
        "architecture": "RandomForest+histogram48",
        "labels": labels,
        "feature_size": n_features,
        "metrics": {
            "precision": round(precision, 4),
            "rappel": round(rappel, 4),
            "f1_score": round(f1, 4),
            "accuracy": round(accuracy, 4),
            "echantillons": int(len(x_data)),
        },
        "onnx_file": IMAGE_MODEL_FILE,
    }
    manifest_path = _write_manifest(IMAGE_DIR, manifest)
    elapsed = round(time.perf_counter() - started, 2)
    logs = (
        f"[{pipeline_name}] Entraînement image terminé en {elapsed}s — "
        f"précision={precision:.3f}, f1={f1:.3f}"
    )
    return TrainingResult(
        model_path=str(model_path),
        manifest_path=str(manifest_path),
        precision=round(precision, 4),
        rappel=round(rappel, 4),
        f1_score=round(f1, 4),
        accuracy=round(accuracy, 4),
        echantillons=len(x_data),
        labels=labels,
        logs=logs,
    )


def ensure_default_models(db: Session) -> Dict[str, str]:
    """Génère ou met à niveau les modèles ONNX par défaut."""
    results = {}
    audio_manifest_path = registry_model_path("audio", "manifest.json")
    needs_audio = True
    if audio_manifest_path.is_file():
        try:
            data = json.loads(audio_manifest_path.read_text(encoding="utf-8"))
            onnx_name = data.get("onnx_file", AUDIO_MODEL_FILE)
            onnx_path = registry_model_path("audio", onnx_name)
            needs_audio = (
                data.get("feature_size") != FEATURE_SIZE
                or not onnx_path.is_file()
            )
        except (json.JSONDecodeError, OSError):
            needs_audio = True

    if needs_audio:
        train_result = train_audio_model(db)
        model = db.query(MLModel).filter(MLModel.nom == "entomo-audio-v1").first()
        if not model:
            model = MLModel(
                nom="entomo-audio-v1",
                version="1.1.0",
                type_modele="audio",
                architecture="RandomForest+mfcc13_mel64",
                actif=True,
                deploye=True,
            )
            db.add(model)
        model.version = "1.1.0"
        model.architecture = "RandomForest+mfcc13_mel64"
        model.chemin = train_result.model_path
        model.precision = train_result.precision
        model.rappel = train_result.rappel
        model.f1_score = train_result.f1_score
        model.taille_mb = round(Path(train_result.model_path).stat().st_size / (1024 * 1024), 2)
        model.actif = True
        model.deploye = True
        db.commit()
        results["audio"] = train_result.model_path

    image_manifest = registry_model_path("image", "manifest.json")
    if not image_manifest.is_file():
        train_result = train_image_model(db)
        model = MLModel(
            nom="entomo-image-v1",
            version="1.0.0",
            type_modele="classification",
            architecture="RandomForest+histogram48",
            chemin=train_result.model_path,
            precision=train_result.precision,
            rappel=train_result.rappel,
            f1_score=train_result.f1_score,
            taille_mb=round(Path(train_result.model_path).stat().st_size / (1024 * 1024), 2),
            actif=True,
            deploye=False,
        )
        db.add(model)
        db.commit()
        results["image"] = train_result.model_path
    return results


def attach_training_to_ml_model(db: Session, ml_model_id: int, result: TrainingResult) -> Optional[MLModel]:
    model = db.query(MLModel).filter(MLModel.id == ml_model_id).first()
    if not model:
        return None
    model.chemin = result.model_path
    model.precision = result.precision
    model.rappel = result.rappel
    model.f1_score = result.f1_score
    model.taille_mb = round(Path(result.model_path).stat().st_size / (1024 * 1024), 2)
    model.architecture = (
        "RandomForest+mfcc13_mel64" if model.type_modele == "audio"
        else "RandomForest+histogram48"
    )
    db.commit()
    db.refresh(model)
    return model
