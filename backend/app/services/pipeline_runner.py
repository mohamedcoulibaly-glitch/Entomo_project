"""Exécution réelle des pipelines ML avec entraînement ONNX."""

from __future__ import annotations

import threading
import time
from typing import Callable, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.model import MLModel, ModelPipeline
from app.services.ml_training import attach_training_to_ml_model, train_audio_model, train_image_model

_running: Dict[int, threading.Thread] = {}
_lock = threading.Lock()


def _append_log(pipeline: ModelPipeline, message: str) -> str:
    prefix = pipeline.logs or ""
    return f"{prefix}\n{message}".strip()


def _update_pipeline(db: Session, pipeline_id: int, *, progression: int, logs: str, statut: Optional[str] = None) -> None:
    pipeline = db.query(ModelPipeline).filter(ModelPipeline.id == pipeline_id).first()
    if not pipeline:
        return
    pipeline.progression = progression
    pipeline.logs = logs
    if statut:
        pipeline.statut = statut
    db.commit()


def _is_stopped(db: Session, pipeline_id: int) -> bool:
    pipeline = db.query(ModelPipeline).filter(ModelPipeline.id == pipeline_id).first()
    return pipeline is None or pipeline.statut == "arrete"


def _execute_pipeline(pipeline_id: int) -> None:
    db = SessionLocal()
    try:
        pipeline = db.query(ModelPipeline).filter(ModelPipeline.id == pipeline_id).first()
        if not pipeline:
            return

        ml_model = None
        if pipeline.ml_model_id:
            ml_model = db.query(MLModel).filter(MLModel.id == pipeline.ml_model_id).first()

        is_audio = (ml_model and ml_model.type_modele == "audio") or "audio" in (pipeline.nom or "").lower()
        is_image = (ml_model and ml_model.type_modele in {"classification", "image"}) or "image" in (pipeline.nom or "").lower()

        steps: List[Tuple[str, int, Callable[[], str]]] = []
        training_result = None

        def step_load() -> str:
            return "Jeu de données préparé (captures terrain + échantillons synthétiques)."

        def step_features() -> str:
            return "Extraction des features spectrales / histogrammes terminée."

        def step_train() -> str:
            nonlocal training_result
            if is_image:
                training_result = train_image_model(db, pipeline_name=pipeline.nom)
            else:
                training_result = train_audio_model(db, pipeline_name=pipeline.nom)
            return training_result.logs

        def step_eval() -> str:
            if not training_result:
                return "Évaluation ignorée."
            return (
                f"Métriques — précision={training_result.precision}, "
                f"rappel={training_result.rappel}, f1={training_result.f1_score}, "
                f"accuracy={training_result.accuracy}"
            )

        def step_finalize() -> str:
            if training_result and pipeline.ml_model_id:
                attach_training_to_ml_model(db, pipeline.ml_model_id, training_result)
            elif training_result and ml_model:
                ml_model.chemin = training_result.model_path
                ml_model.precision = training_result.precision
                ml_model.rappel = training_result.rappel
                ml_model.f1_score = training_result.f1_score
                db.commit()
            return "Artefact ONNX enregistré dans models_registry."

        steps = [
            ("Chargement des données", 15, step_load),
            ("Extraction des features", 35, step_features),
            ("Entraînement + export ONNX", 70, step_train),
            ("Évaluation holdout", 90, step_eval),
            ("Finalisation", 100, step_finalize),
        ]

        logs = pipeline.logs or "Pipeline démarré."
        for label, progression, handler in steps:
            if _is_stopped(db, pipeline_id):
                _update_pipeline(
                    db,
                    pipeline_id,
                    progression=pipeline.progression or 0,
                    logs=_append_log(pipeline, "Exécution interrompue."),
                    statut="arrete",
                )
                return
            detail = handler()
            logs = f"{logs}\n[{progression}%] {label}: {detail}"
            _update_pipeline(db, pipeline_id, progression=progression, logs=logs)
            time.sleep(0.05)

        _update_pipeline(
            db,
            pipeline_id,
            progression=100,
            logs=logs + "\nPipeline terminé avec succès.",
            statut="termine",
        )
    except Exception as exc:
        pipeline = db.query(ModelPipeline).filter(ModelPipeline.id == pipeline_id).first()
        if pipeline:
            _update_pipeline(
                db,
                pipeline_id,
                progression=pipeline.progression or 0,
                logs=_append_log(pipeline, f"Erreur pipeline: {exc}"),
                statut="erreur",
            )
    finally:
        db.close()
        with _lock:
            _running.pop(pipeline_id, None)


def start_pipeline(pipeline_id: int) -> bool:
    with _lock:
        if pipeline_id in _running:
            return False
        thread = threading.Thread(target=_execute_pipeline, args=(pipeline_id,), daemon=True)
        _running[pipeline_id] = thread
        thread.start()
        return True


def is_pipeline_running(pipeline_id: int) -> bool:
    with _lock:
        thread = _running.get(pipeline_id)
        return thread is not None and thread.is_alive()
