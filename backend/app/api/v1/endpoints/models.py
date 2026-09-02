from typing import List, Optional
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.model import crud_ml_model, crud_risk_model, crud_pipeline
from app.core.deps import get_current_active_user
from app.models.user import User
from app.models.model import MLModel
from app.schemas.model import (
    MLModelCreate, MLModelUpdate, MLModelResponse,
    RiskModelCreate, RiskModelUpdate, RiskModelResponse,
    ModelPipelineCreate, ModelPipelineUpdate, ModelPipelineResponse,
)
from app.services.pipeline_runner import start_pipeline
from app.services.model_evaluator import evaluate_ml_model
from app.services.epidemic_risk import compute_epidemic_risk
from app.services.audit_service import audit_service
from app.services.model_registry import load_manifest, REGISTRY_ROOT

router = APIRouter()


# ─── Modèles ML visuels/audio ────────────────────────────────────────────────

@router.get("/ml", response_model=List[MLModelResponse])
def list_ml_models(
    skip: int = 0,
    limit: int = 100,
    type_modele: Optional[str] = Query(None, alias="type"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    query = db.query(MLModel)
    if type_modele:
        query = query.filter(MLModel.type_modele == type_modele)
    return query.offset(skip).limit(limit).all()


@router.get("/registry")
def get_model_registry(
    _: User = Depends(get_current_active_user),
):
    """Retourne les manifests ONNX locaux (audio / image)."""
    audio = load_manifest("audio")
    image = load_manifest("image")
    return {
        "root": str(REGISTRY_ROOT),
        "audio": audio,
        "image": image,
        "ready": bool(audio and image),
    }


@router.post("/ml", response_model=MLModelResponse)
def create_ml_model(model_in: MLModelCreate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    return crud_ml_model.create(db, obj_in=model_in)


@router.get("/ml/deployes", response_model=List[MLModelResponse])
def list_deployes(
    type_modele: Optional[str] = Query(None, alias="type"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    query = db.query(MLModel).filter(MLModel.deploye == True)
    if type_modele:
        query = query.filter(MLModel.type_modele == type_modele)
    return query.all()


@router.post("/ml/importer", response_model=MLModelResponse)
async def import_ml_model(
    nom: str = Form(...),
    version: str = Form("1.0.0"),
    type_modele: str = Form("classification"),
    architecture: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    fichier: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Importe un artefact ML et enregistre ses métadonnées en base."""
    suffix = Path(fichier.filename or "").suffix.lower()
    if suffix not in {".pt", ".onnx", ".h5", ".pkl", ".joblib", ".tflite"}:
        raise HTTPException(status_code=400, detail="Format de modèle non pris en charge")

    content = await fichier.read()
    if not content:
        raise HTTPException(status_code=400, detail="Le fichier du modèle est vide")
    if len(content) > 200 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Le fichier dépasse la limite de 200 Mo")

    model_dir = Path("uploads") / "models"
    model_dir.mkdir(parents=True, exist_ok=True)
    stored_path = model_dir / f"{uuid4().hex}{suffix}"
    stored_path.write_bytes(content)
    try:
        return crud_ml_model.create(db, obj_in=MLModelCreate(
            nom=nom,
            version=version,
            type_modele=type_modele,
            architecture=architecture,
            description=description,
            chemin=str(stored_path.as_posix()),
            taille_mb=round(len(content) / (1024 * 1024), 3),
        ))
    except Exception:
        stored_path.unlink(missing_ok=True)
        raise


@router.get("/ml/{model_id}", response_model=MLModelResponse)
def get_ml_model(model_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    model = crud_ml_model.get(db, id=model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Modèle non trouvé")
    return model


@router.put("/ml/{model_id}", response_model=MLModelResponse)
def update_ml_model(model_id: int, model_in: MLModelUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    model = crud_ml_model.get(db, id=model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Modèle non trouvé")
    return crud_ml_model.update(db, db_obj=model, obj_in=model_in)


@router.post("/ml/{model_id}/deployer")
def deployer_model(
    model_id: int,
    request: Request,
    deploye: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = crud_ml_model.deployer(db, model_id=model_id, deploye=deploye)
    if not result:
        raise HTTPException(status_code=404, detail="Modèle non trouvé")
    audit_service.log_for_user(
        db,
        current_user,
        action="model_deploy" if deploye else "model_undeploy",
        module="modeles",
        resource_type="ml_model",
        resource_id=model_id,
        details={"nom": result.nom, "version": result.version, "deploye": deploye},
        adresse_ip=request.client.host if request.client else None,
    )
    action = "déployé" if deploye else "retiré du déploiement"
    return {"message": f"Modèle {action} avec succès"}


@router.delete("/ml/{model_id}")
def delete_ml_model(
    model_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    model = crud_ml_model.get(db, id=model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Modèle non trouvé")
    crud_ml_model.remove(db, id=model_id)
    return {"message": "Modèle supprimé"}


@router.post("/ml/{model_id}/tester")
def tester_ml_model(
    model_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Teste un modèle ML et retourne des métriques d'évaluation réelles."""
    model = crud_ml_model.get(db, id=model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Modèle non trouvé")
    return evaluate_ml_model(db, model)


# ─── Modèles de risque épidémiologique ───────────────────────────────────────

@router.get("/risque", response_model=List[RiskModelResponse])
def list_risk_models(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    return crud_risk_model.get_multi(db, skip=skip, limit=limit)


@router.post("/risque", response_model=RiskModelResponse)
def create_risk_model(model_in: RiskModelCreate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    return crud_risk_model.create(db, obj_in=model_in)


@router.get("/risque/{model_id}", response_model=RiskModelResponse)
def get_risk_model(model_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    model = crud_risk_model.get(db, id=model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Modèle de risque non trouvé")
    return model


@router.put("/risque/{model_id}", response_model=RiskModelResponse)
def update_risk_model(model_id: int, model_in: RiskModelUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    model = crud_risk_model.get(db, id=model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Modèle de risque non trouvé")
    return crud_risk_model.update(db, db_obj=model, obj_in=model_in)


@router.post("/risque/simuler")
def simuler_risque(
    body: dict,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Calcule le risque épidémiologique via un modèle SEIR alimenté par les captures."""
    facteurs = body.get("facteurs", [])
    if isinstance(facteurs, dict):
        facteurs = [{"id": k, "poids": v} for k, v in facteurs.items()]
    return compute_epidemic_risk(db, facteurs)


# ─── Pipelines ML ────────────────────────────────────────────────────────────

@router.get("/pipelines", response_model=List[ModelPipelineResponse])
def list_pipelines(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    return crud_pipeline.get_multi(db, skip=skip, limit=limit)


@router.post("/pipelines", response_model=ModelPipelineResponse)
def create_pipeline(
    pipeline_in: ModelPipelineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not pipeline_in.utilisateur_id:
        pipeline_in.utilisateur_id = current_user.id
    return crud_pipeline.create(db, obj_in=pipeline_in)


@router.get("/pipelines/{pipeline_id}", response_model=ModelPipelineResponse)
def get_pipeline(pipeline_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    p = crud_pipeline.get(db, id=pipeline_id)
    if not p:
        raise HTTPException(status_code=404, detail="Pipeline non trouvé")
    return p


@router.put("/pipelines/{pipeline_id}", response_model=ModelPipelineResponse)
def update_pipeline(pipeline_id: int, pipeline_in: ModelPipelineUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    p = crud_pipeline.get(db, id=pipeline_id)
    if not p:
        raise HTTPException(status_code=404, detail="Pipeline non trouvé")
    return crud_pipeline.update(db, db_obj=p, obj_in=pipeline_in)


@router.post("/pipelines/{pipeline_id}/lancer", response_model=ModelPipelineResponse)
def run_pipeline(pipeline_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    """Démarre un pipeline et lance l'exécution en arrière-plan."""
    p = crud_pipeline.get(db, id=pipeline_id)
    if not p:
        raise HTTPException(status_code=404, detail="Pipeline non trouvé")
    if p.statut == "en_cours":
        raise HTTPException(status_code=400, detail="Le pipeline est déjà en cours d'exécution")
    updated = crud_pipeline.update(
        db,
        db_obj=p,
        obj_in=ModelPipelineUpdate(
            statut="en_cours",
            progression=0,
            logs="Pipeline démarré. Préparation des données et des ressources.",
        ),
    )
    if not start_pipeline(pipeline_id):
        raise HTTPException(status_code=409, detail="Impossible de démarrer le pipeline")
    db.refresh(updated)
    return updated


@router.post("/pipelines/{pipeline_id}/arreter", response_model=ModelPipelineResponse)
def stop_pipeline(pipeline_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    """Arrête proprement un pipeline sans effacer son avancement."""
    p = crud_pipeline.get(db, id=pipeline_id)
    if not p:
        raise HTTPException(status_code=404, detail="Pipeline non trouvé")
    return crud_pipeline.update(
        db,
        db_obj=p,
        obj_in=ModelPipelineUpdate(statut="arrete", logs="Exécution arrêtée par un utilisateur."),
    )
