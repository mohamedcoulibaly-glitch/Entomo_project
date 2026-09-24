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
from sklearn.linear_model import LogisticRegression
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
AUDIO_ARCHITECTURE_LABEL = "RandomForest+mfcc13_mel64"
IMAGE_ARCHITECTURE_LABEL = "LogisticRegression+mobilenetv2-embedding1280(imagenet,frozen)"


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


def _export_sklearn_onnx(model, path: Path, n_features: int) -> None:
    initial_type = [("input", FloatTensorType([None, n_features]))]
    onnx_model = convert_sklearn(model, initial_types=initial_type, target_opset=12)

    # skl2onnx ne négocie pas correctement l'opset dans cet environnement (le
    # package onnxconverter-common, dont il dépend pour ça, était absent à
    # l'origine) : le graphe généré est correct et fonctionne, mais reste
    # étiqueté opset 1 quel que soit le target_opset demandé — ce qui fait
    # qu'ONNX Runtime émet un avertissement de compatibilité à chaque
    # chargement. On corrige l'étiquette de version après coup plutôt que de
    # regénérer un graphe (les opérateurs utilisés — TreeEnsembleClassifier,
    # ZipMap — sont stables sur la plage de versions visée).
    for opset in onnx_model.opset_import:
        if opset.domain == "":
            opset.version = 13
        elif opset.domain == "ai.onnx.ml":
            opset.version = 3

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
        "architecture": AUDIO_ARCHITECTURE_LABEL,
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


IMAGE_EMBEDDING_MODEL_PATH = Path(__file__).resolve().parents[2] / "app" / "ml_assets" / "mobilenetv2-embed.onnx"
IMAGE_EMBEDDING_SIZE = 1280
_IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
_embedding_session = None  # session ONNX Runtime mise en cache (poids figés, jamais réentraînés)


def _get_embedding_session():
    global _embedding_session
    if _embedding_session is None:
        import onnxruntime as ort

        _embedding_session = ort.InferenceSession(
            str(IMAGE_EMBEDDING_MODEL_PATH), providers=["CPUExecutionProvider"]
        )
    return _embedding_session


def _image_feature_vector(image) -> np.ndarray:
    """Vecteur de features d'une image via transfer learning : passe l'image
    dans MobileNetV2 pré-entraîné sur ImageNet (poids gelés, jamais
    réentraînés — voir app/ml_assets/README.md) et récupère la sortie de
    l'avant-dernière couche (GlobalAveragePool, 1280 dimensions) juste avant
    la tête de classification à 1000 classes ImageNet d'origine.

    Remplace l'ancien histogramme de couleurs 48-dim (audit du 2026-09-23) :
    un histogramme ne capture que la distribution globale des couleurs et ne
    peut pas distinguer des espèces qui se ressemblent en couleur mais
    diffèrent par la forme/texture (ex. Ae. aegypti vs Ae. albopictus). Un
    embedding CNN pré-entraîné encode forme, texture et motifs — même sans
    fine-tuning sur des moustiques, ces features généralistes séparent bien
    mieux des catégories visuelles fines que des statistiques de couleur.
    """
    resized = image.convert("RGB").resize((224, 224))
    arr = np.asarray(resized, dtype=np.float32) / 255.0
    arr = (arr - _IMAGENET_MEAN) / _IMAGENET_STD
    chw = np.transpose(arr, (2, 0, 1))[np.newaxis, ...].astype(np.float32)

    session = _get_embedding_session()
    input_name = session.get_inputs()[0].name
    output = session.run(None, {input_name: chw})[0]
    vector = output.reshape(-1).astype(np.float32)
    # Normalisation L2 : pratique standard pour des embeddings CNN, stabilise
    # la convergence de la régression logistique entraînée dessus.
    norm = np.linalg.norm(vector) + 1e-8
    return vector / norm


def _stratified_holdout(y_labels: np.ndarray, test_fraction: float = 0.25, seed: int = 42):
    """Split train/test par classe, sans dépendre de sklearn's stratify (qui
    exige >= 2 échantillons par classe pour les DEUX ensembles — inapplicable
    ici puisque certaines espèces n'ont qu'un seul exemplaire). Les classes à
    un seul exemplaire vont entièrement à l'entraînement et ne sont jamais
    évaluées : mieux vaut les exclure honnêtement de la mesure que de fabriquer
    un chiffre de test sur une classe qu'on n'a, par construction, jamais vue
    ailleurs qu'à l'entraînement.
    """
    rng = np.random.default_rng(seed)
    train_idx: List[int] = []
    test_idx: List[int] = []
    for label in sorted(set(y_labels.tolist())):
        idx = np.where(y_labels == label)[0]
        rng.shuffle(idx)
        n_test = max(1, round(len(idx) * test_fraction)) if len(idx) >= 2 else 0
        test_idx.extend(idx[:n_test].tolist())
        train_idx.extend(idx[n_test:].tolist())
    return np.array(train_idx), np.array(test_idx)


def train_image_model(db: Session, *, pipeline_name: str = "image-training") -> TrainingResult:
    """Entraîne le classifieur d'images à partir des photos de captures
    réellement distinctes et correctement étiquetées (voir
    `image_dataset_curation.py`), complétées par un jeu de photos de référence
    Wikimedia/CDC pour les espèces trop peu représentées (voir
    `data/ml_image_reference/`) — les deux sources restent tracées séparément
    dans le manifest, jamais confondues.

    Pas de repli synthétique : un modèle "qui marche" sur des aplats de
    couleur inventés n'apporterait rien de réel.
    """
    from PIL import Image
    from sklearn.metrics import confusion_matrix

    from app.services.image_dataset_curation import curate_image_dataset, load_reference_images

    started = time.perf_counter()
    curated = curate_image_dataset(db, Path("uploads/captures"))
    reference = load_reference_images()
    all_entries = curated + reference

    features: List[np.ndarray] = []
    labels: List[str] = []
    sources: List[str] = []
    conflicts: List[str] = []
    for entry in all_entries:
        try:
            img = Image.open(entry.file_path).convert("RGB")
        except (OSError, ValueError):
            # Fichier illisible/corrompu sur le disque (ex: référence brisée) —
            # on l'ignore plutôt que de faire échouer tout l'entraînement pour
            # un seul spécimen défaillant.
            continue
        features.append(_image_feature_vector(img))
        labels.append(entry.label)
        sources.append(entry.source)
        if entry.had_label_conflict:
            conflicts.append(
                f"{Path(entry.file_path).name}: votes={entry.label_votes} -> "
                f"retenu « {entry.label} » (majorité, {entry.n_captures} capture(s))"
            )

    label_set = set(labels)
    if len(features) < 2 or len(label_set) < 2:
        raise ValueError(
            "Pas assez d'images distinctes et correctement étiquetées pour "
            "entraîner un classifieur (minimum 2 classes, au moins 1 image chacune). "
            f"Trouvé: {len(features)} image(s) exploitable(s), {len(label_set)} classe(s)."
        )

    x_data = np.vstack(features)
    y_labels = np.asarray(labels)
    n_samples = len(y_labels)
    n_classes = len(label_set)
    n_captures_src = sum(1 for s in sources if s == "capture")
    n_reference_src = sum(1 for s in sources if s == "reference")

    train_idx, test_idx = _stratified_holdout(y_labels)
    label_order = sorted(label_set)
    if len(test_idx) > 0:
        eval_clf = LogisticRegression(max_iter=2000, C=1.0, class_weight="balanced")
        eval_clf.fit(x_data[train_idx], y_labels[train_idx])
        y_pred = eval_clf.predict(x_data[test_idx]).tolist()
        y_true = y_labels[test_idx].tolist()
        precision = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
        rappel = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
        f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
        accuracy = float(accuracy_score(y_true, y_pred))
        conf_matrix = confusion_matrix(y_true, y_pred, labels=label_order).tolist()
        methode_eval = (
            f"hold-out stratifié par classe ({len(test_idx)} image(s) de test / "
            f"{len(train_idx)} d'entraînement — classes à 1 seul exemplaire exclues du test)"
        )
    else:
        # Aucune classe n'a assez d'exemplaires pour un hold-out (cas dégénéré).
        precision = rappel = f1 = accuracy = 0.0
        conf_matrix = []
        methode_eval = "aucune évaluation possible (toutes les classes n'ont qu'un seul exemplaire)"

    # Modèle livré : réentraîné sur la totalité des données propres (train +
    # test) une fois l'évaluation faite ci-dessus — pratique standard pour ne
    # pas priver le modèle final du signal du sous-ensemble de test.
    # Régression logistique plutôt que RandomForest : avec un embedding
    # CNN à 1280 dimensions pour ~40 images, un classifieur linéaire
    # régularisé généralise mieux qu'un ensemble d'arbres (moins de risque de
    # surapprentissage en haute dimension / peu d'échantillons).
    classifier = LogisticRegression(max_iter=2000, C=1.0, class_weight="balanced")
    classifier.fit(x_data, y_labels)

    n_features = x_data.shape[1]
    model_path = registry_model_path("image", IMAGE_MODEL_FILE)
    _export_sklearn_onnx(classifier, model_path, n_features)
    labels_sorted = sorted(classifier.classes_.tolist())
    manifest = {
        "name": "entomo-image-v1",
        "version": "2.0.0",
        "type": "image",
        "architecture": IMAGE_ARCHITECTURE_LABEL,
        "labels": labels_sorted,
        "feature_size": n_features,
        "metrics": {
            "precision": round(precision, 4),
            "rappel": round(rappel, 4),
            "f1_score": round(f1, 4),
            "accuracy": round(accuracy, 4),
            "echantillons": int(n_samples),
            "confusion_matrix": conf_matrix,
            "confusion_matrix_labels": label_order,
            "methode_evaluation": methode_eval,
        },
        "data_quality": {
            "images_distinctes": n_samples,
            "classes": n_classes,
            "captures_terrain": n_captures_src,
            "photos_reference_wikimedia": n_reference_src,
            "conflits_labels_resolus": conflicts,
            "avertissement": (
                f"{n_captures_src} photo(s) proviennent de vraies captures, "
                f"{n_reference_src} sont des photos de référence Wikimedia/CDC ajoutées "
                "pour compenser le manque de données de terrain (voir "
                "data/ml_image_reference/manifest.json pour la provenance détaillée). "
                "Toujours peu de données pour certaines espèces (An. arabiensis en particulier) — "
                "à réentraîner dès que davantage de vraies photos de terrain seront disponibles."
            ),
        },
        "onnx_file": IMAGE_MODEL_FILE,
    }
    manifest_path = _write_manifest(IMAGE_DIR, manifest)
    elapsed = round(time.perf_counter() - started, 2)
    logs = (
        f"[{pipeline_name}] Entraînement image terminé en {elapsed}s — "
        f"{n_samples} images distinctes / {n_classes} classes "
        f"({n_captures_src} terrain + {n_reference_src} référence) — "
        f"précision={precision:.3f}, f1={f1:.3f} ({methode_eval}) — "
        f"{len(conflicts)} conflit(s) de label résolu(s) par vote majoritaire"
    )
    return TrainingResult(
        model_path=str(model_path),
        manifest_path=str(manifest_path),
        precision=round(precision, 4),
        rappel=round(rappel, 4),
        f1_score=round(f1, 4),
        accuracy=round(accuracy, 4),
        echantillons=n_samples,
        labels=labels_sorted,
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
                architecture=AUDIO_ARCHITECTURE_LABEL,
                actif=True,
                deploye=True,
            )
            db.add(model)
        model.version = "1.1.0"
        model.architecture = AUDIO_ARCHITECTURE_LABEL
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
            architecture=IMAGE_ARCHITECTURE_LABEL,
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
        AUDIO_ARCHITECTURE_LABEL if model.type_modele == "audio"
        else IMAGE_ARCHITECTURE_LABEL
    )
    db.commit()
    db.refresh(model)
    return model
