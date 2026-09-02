"""Tests du dataset ML terrain validé par experts."""

import pytest


def test_expert_labels_generated():
    from pathlib import Path
    labels_path = Path(__file__).parents[1] / "data" / "ml_terrain" / "expert_labels.json"
    assert labels_path.is_file(), "expert_labels.json manquant — exécuter generate_expert_labels.py"
    import json
    labels = json.loads(labels_path.read_text(encoding="utf-8"))
    assert len(labels) >= 100
    species = {entry["species"] for entry in labels}
    assert len(species) >= 5


def test_terrain_dataset_loads():
    from app.services.terrain_dataset import load_terrain_dataset, ensure_terrain_audio_files

    created = ensure_terrain_audio_files()
    assert created >= 0

    x_data, y_labels, meta = load_terrain_dataset()
    assert len(x_data) >= 50, f"Dataset terrain insuffisant: {len(x_data)} échantillons"
    assert len(set(y_labels.tolist())) >= 5
    assert x_data.shape[1] == 77  # MFCC + mel
    assert all(entry.get("expert_validator") for entry in meta[:5])


def test_terrain_dataset_used_in_training(db):
    from app.services.ml_training import _load_audio_dataset_from_captures
    from app.services.terrain_dataset import terrain_dataset_available

    if not terrain_dataset_available():
        pytest.skip("Dataset terrain non disponible")

    x_data, y_labels = _load_audio_dataset_from_captures(db)
    assert len(x_data) >= 50
    assert len(set(y_labels.tolist())) >= 5


def test_terrain_manifest_has_experts():
    from app.services.terrain_dataset import get_terrain_stats

    stats = get_terrain_stats()
    assert stats["available"] is True
    assert stats["total_samples"] >= 100
    assert len(stats["experts"]) >= 2
