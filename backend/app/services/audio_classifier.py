"""Service de classification audio pour les captures entomologiques.

Algorithme feature-based (FFT + bandes spectrales) utilisé par défaut.
Si un artefact ONNX est présent sur le modèle ML déployé, l'inférence ONNX
prend le relais automatiquement.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np

from app.services.audio_preprocessing import (
    extract_mfcc_mel_features,
    FEATURE_SIZE,
    SPECIES_BANDS,
    load_audio,
)

from app.services.model_registry import load_manifest

FEATURE_CLASSIFIER_NAME = "feature-based-v1"


@dataclass
class AudioClassificationResult:
    espece_detectee: str
    confiance: float
    distribution: Dict[str, float]
    frequence: float
    modele: str
    temps_traitement: float
    duree_sec: float


def extract_features(signal: np.ndarray, sample_rate: int) -> Dict[str, float]:
    """Extrait la fréquence dominante et les scores par bande d'espèce."""
    n = len(signal)
    if n < 4:
        raise ValueError("Signal audio trop court pour l'analyse")

    spectrum = np.abs(np.fft.rfft(signal))
    freqs = np.fft.rfftfreq(n, d=1.0 / sample_rate)
    dominant_idx = int(np.argmax(spectrum[1:]) + 1) if len(spectrum) > 1 else 0
    dominant_frequency = float(freqs[dominant_idx])

    band_scores: Dict[str, float] = {}
    for species, (low, high) in SPECIES_BANDS.items():
        mask = (freqs >= low) & (freqs <= high)
        band_scores[species] = float(spectrum[mask].sum()) if mask.any() else 0.0

    total = sum(band_scores.values())
    if total <= 0:
        uniform = 1.0 / len(SPECIES_BANDS)
        band_scores = {species: uniform for species in SPECIES_BANDS}
    else:
        band_scores = {species: score / total for species, score in band_scores.items()}

    return {
        "dominant_frequency": dominant_frequency,
        "band_scores": band_scores,
    }


def _classify_from_features(features: Dict[str, float], model_name: str) -> AudioClassificationResult:
    band_scores: Dict[str, float] = features["band_scores"]
    dominant_frequency = features["dominant_frequency"]
    best_species = max(band_scores, key=band_scores.get)
    confidence = float(band_scores[best_species])
    # Renforce la confiance si la fréquence dominante tombe dans la bande de l'espèce gagnante.
    low, high = SPECIES_BANDS[best_species]
    if low <= dominant_frequency <= high:
        confidence = min(0.99, confidence + 0.15)
    confidence = max(0.35, round(confidence, 4))
    distribution = {species: round(score, 4) for species, score in band_scores.items()}
    return AudioClassificationResult(
        espece_detectee=best_species,
        confiance=confidence,
        distribution=distribution,
        frequence=round(dominant_frequency, 2),
        modele=model_name,
        temps_traitement=0.0,
        duree_sec=0.0,
    )


def _parse_onnx_probabilities(outputs, labels: list[str]) -> Dict[str, float]:
    if len(outputs) >= 2:
        probs = outputs[1]
        if isinstance(probs, list) and probs and isinstance(probs[0], dict):
            mapping = probs[0]
            return {str(k): round(float(v), 4) for k, v in mapping.items()}
        flat = np.asarray(probs).flatten()
        if labels and flat.size == len(labels):
            total = flat.sum() or 1.0
            return {labels[i]: round(float(flat[i] / total), 4) for i in range(len(labels))}
    logits = np.asarray(outputs[0]).flatten()
    if logits.dtype.kind in {"U", "S", "O"}:
        species = str(logits[0])
        return {species: 1.0}
    species_list = labels or list(SPECIES_BANDS.keys())
    if logits.size == len(species_list):
        exp_logits = np.exp(logits.astype(np.float64) - np.max(logits))
        probs = exp_logits / exp_logits.sum()
        return {species_list[i]: round(float(probs[i]), 4) for i in range(len(species_list))}
    return {}


def _classify_with_onnx(
    signal: np.ndarray,
    sample_rate: int,
    model_path: Path,
    model_name: str,
) -> AudioClassificationResult:
    import onnxruntime as ort

    manifest = load_manifest("audio") or {}
    labels = manifest.get("labels") or list(SPECIES_BANDS.keys())
    expected_size = int(manifest.get("feature_size") or FEATURE_SIZE)

    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    features = extract_mfcc_mel_features(signal, sample_rate).reshape(1, -1).astype(np.float32)
    if features.shape[1] != expected_size:
        raise ValueError(f"Feature size invalide: {features.shape[1]} != {expected_size}")

    outputs = session.run(None, {input_name: features})
    distribution = _parse_onnx_probabilities(outputs, labels)
    if not distribution:
        raise ValueError("Le modèle ONNX n'a produit aucune probabilité")

    best_species = max(distribution, key=distribution.get)
    features_fft = extract_features(signal, sample_rate)

    return AudioClassificationResult(
        espece_detectee=best_species,
        confiance=float(distribution[best_species]),
        distribution=distribution,
        frequence=features_fft["dominant_frequency"],
        modele=model_name,
        temps_traitement=0.0,
        duree_sec=round(len(signal) / sample_rate, 2),
    )


def classify_audio_file(
    audio_path: str,
    model_chemin: Optional[str] = None,
    model_nom: Optional[str] = None,
) -> AudioClassificationResult:
    """Analyse un fichier audio et retourne la classification complète."""
    started = time.perf_counter()
    signal, sample_rate = load_audio(audio_path)
    duration_sec = round(len(signal) / sample_rate, 2)
    features = extract_features(signal, sample_rate)
    model_name = model_nom or FEATURE_CLASSIFIER_NAME

    if model_chemin:
        model_path = Path(model_chemin)
        if model_path.suffix.lower() == ".onnx" and model_path.is_file():
            result = _classify_with_onnx(signal, sample_rate, model_path, model_name)
            result.temps_traitement = round(time.perf_counter() - started, 3)
            result.duree_sec = duration_sec
            result.modele = f"{model_name} (onnx)"
            return result

    result = _classify_from_features(features, model_name)
    result.temps_traitement = round(time.perf_counter() - started, 3)
    result.duree_sec = duration_sec
    return result


def generate_test_wav(path: Path, frequency_hz: float, duration_sec: float = 2.0, sample_rate: int = 16000) -> None:
    """Génère un WAV sinusoïdal pour les tests et le seed."""
    from scipy.io import wavfile

    path.parent.mkdir(parents=True, exist_ok=True)
    t = np.linspace(0, duration_sec, int(sample_rate * duration_sec), endpoint=False)
    signal = (0.8 * np.sin(2 * np.pi * frequency_hz * t)).astype(np.float32)
    wavfile.write(str(path), sample_rate, signal)
