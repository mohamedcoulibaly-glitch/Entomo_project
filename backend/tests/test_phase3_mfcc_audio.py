"""Tests Phase 3 — MFCC/mel features et pipeline audio ML."""

import numpy as np

from app.services.audio_preprocessing import (
    FEATURE_SIZE,
    MFCC_COUNT,
    MEL_COUNT,
    SAMPLE_RATE,
    extract_mfcc_mel_features,
    load_audio_wav_scipy,
)
from app.services.audio_classifier import generate_test_wav
from app.services.ml_training import train_audio_model


def test_feature_dimensions():
    t = np.linspace(0, 2, int(SAMPLE_RATE * 2), endpoint=False)
    signal = np.sin(2 * np.pi * 450 * t)
    features = extract_mfcc_mel_features(signal, SAMPLE_RATE)
    assert features.shape == (FEATURE_SIZE,)
    assert FEATURE_SIZE == MFCC_COUNT + MEL_COUNT


def test_train_audio_model_quality(tmp_path):
    wav = tmp_path / "test450.wav"
    generate_test_wav(wav, 450.0)
    signal, sr = load_audio_wav_scipy(str(wav))
    features = extract_mfcc_mel_features(signal, sr)
    assert features.dtype == np.float32


def test_train_audio_model_metrics(db):
    result = train_audio_model(db, pipeline_name="test-audio")
    assert result.echantillons >= 80
    assert result.accuracy >= 0.70
    assert result.f1_score >= 0.65
    assert result.model_path.endswith(".onnx")
