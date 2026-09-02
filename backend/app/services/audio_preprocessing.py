"""Extraction de features audio partagée entre entraînement et inférence."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, Tuple

import numpy as np

MFCC_COUNT = 13
MEL_COUNT = 64
FEATURE_SIZE = MFCC_COUNT + MEL_COUNT
SAMPLE_RATE = 16000
TARGET_SECONDS = 2.0
MAX_SECONDS = 30.0

# Bandes de fréquence caractéristiques documentées (Hz) pour les espèces cibles.
SPECIES_BANDS: Dict[str, Tuple[float, float]] = {
    "An. gambiae": (400.0, 500.0),
    "An. funestus": (450.0, 520.0),
    "An. arabiensis": (480.0, 540.0),
    "Ae. aegypti": (550.0, 650.0),
    "Cx. quinquefasciatus": (600.0, 750.0),
}

_AUDIO_EXTENSIONS = {".wav", ".mp3", ".ogg", ".flac", ".m4a", ".webm"}


def _normalize_signal(signal: np.ndarray) -> np.ndarray:
    peak = np.max(np.abs(signal))
    if peak > 0:
        return signal / peak
    return signal


def _prepare_chunk(signal: np.ndarray, sample_rate: int) -> np.ndarray:
    max_len = int(sample_rate * MAX_SECONDS)
    target_len = int(sample_rate * TARGET_SECONDS)
    if len(signal) > max_len:
        signal = signal[:max_len]
    if len(signal) >= target_len:
        return _normalize_signal(signal[:target_len])
    return _normalize_signal(np.pad(signal, (0, target_len - len(signal))))


def load_audio_wav_scipy(path: str) -> Tuple[np.ndarray, int]:
    from scipy.io import wavfile

    file_path = Path(path)
    if not file_path.is_file():
        raise FileNotFoundError(f"Fichier audio introuvable: {path}")

    sample_rate, data = wavfile.read(str(file_path))
    signal = np.asarray(data, dtype=np.float64)
    if signal.ndim > 1:
        signal = signal.mean(axis=1)
    return _normalize_signal(signal), int(sample_rate)


def load_audio(path: str) -> Tuple[np.ndarray, int]:
    """Charge un fichier audio (WAV via scipy, autres formats via librosa si disponible)."""
    file_path = Path(path)
    if not file_path.is_file():
        raise FileNotFoundError(f"Fichier audio introuvable: {path}")

    ext = file_path.suffix.lower()
    if ext == ".wav":
        return load_audio_wav_scipy(str(file_path))

    if ext in _AUDIO_EXTENSIONS:
        try:
            import librosa

            signal, sr = librosa.load(
                str(file_path),
                sr=SAMPLE_RATE,
                mono=True,
                duration=MAX_SECONDS,
            )
            return _normalize_signal(np.asarray(signal, dtype=np.float64)), int(sr)
        except ImportError:
            raise ValueError(
                f"Format {ext} requiert la dépendance librosa (pip install librosa soundfile)"
            )

    return load_audio_wav_scipy(str(file_path))


def extract_spectral_features(signal: np.ndarray, sample_rate: int) -> np.ndarray:
    """Vecteur de 64 bandes spectrales log-normalisées (fallback heuristique)."""
    chunk = _prepare_chunk(signal, sample_rate)
    if len(chunk) < 8:
        raise ValueError("Signal audio trop court")

    spectrum = np.abs(np.fft.rfft(chunk))
    if spectrum.size < MEL_COUNT:
        spectrum = np.pad(spectrum, (0, MEL_COUNT - spectrum.size))
    bands = spectrum[:MEL_COUNT].astype(np.float64)
    bands = np.log1p(bands)
    bands -= bands.mean()
    std = bands.std()
    if std > 0:
        bands /= std
    return bands.astype(np.float32)


def extract_mfcc_mel_features(signal: np.ndarray, sample_rate: int) -> np.ndarray:
    """MFCC (13) + log-mel moyens (64) = 77 features pour le modèle ONNX."""
    chunk = _prepare_chunk(signal, sample_rate)
    if len(chunk) < 8:
        raise ValueError("Signal audio trop court")

    try:
        import librosa

        mfcc = librosa.feature.mfcc(y=chunk, sr=sample_rate, n_mfcc=MFCC_COUNT)
        mel = librosa.feature.melspectrogram(y=chunk, sr=sample_rate, n_mels=MEL_COUNT)
        mel_db = librosa.power_to_db(mel, ref=np.max(mel) + 1e-9)
        vector = np.concatenate([mfcc.mean(axis=1), mel_db.mean(axis=1)]).astype(np.float64)
    except ImportError:
        spectral = extract_spectral_features(signal, sample_rate)
        mfcc_approx = spectral[:MFCC_COUNT]
        vector = np.concatenate([mfcc_approx, spectral]).astype(np.float64)

    vector -= vector.mean()
    std = vector.std()
    if std > 0:
        vector /= std
    if vector.size < FEATURE_SIZE:
        vector = np.pad(vector, (0, FEATURE_SIZE - vector.size))
    return vector[:FEATURE_SIZE].astype(np.float32)


def features_from_path(audio_path: str) -> np.ndarray:
    signal, sample_rate = load_audio(audio_path)
    return extract_mfcc_mel_features(signal, sample_rate)


def species_list() -> list[str]:
    return list(SPECIES_BANDS.keys())
