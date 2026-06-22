from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.model import crud_ml_model, crud_risk_model, crud_pipeline
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.model import (
    MLModelCreate, MLModelUpdate, MLModelResponse,
    RiskModelCreate, RiskModelUpdate, RiskModelResponse,
    ModelPipelineCreate, ModelPipelineResponse,
)

router = APIRouter()


# ─── Modèles ML visuels/audio ────────────────────────────────────────────────

@router.get("/ml", response_model=List[MLModelResponse])
def list_ml_models(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    return crud_ml_model.get_multi(db, skip=skip, limit=limit)


@router.post("/ml", response_model=MLModelResponse)
def create_ml_model(model_in: MLModelCreate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    return crud_ml_model.create(db, obj_in=model_in)


@router.get("/ml/deployes", response_model=List[MLModelResponse])
def list_deployes(db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    return crud_ml_model.get_deployes(db)


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
def deployer_model(model_id: int, deploye: bool = True, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    result = crud_ml_model.deployer(db, model_id=model_id, deploye=deploye)
    if not result:
        raise HTTPException(status_code=404, detail="Modèle non trouvé")
    action = "déployé" if deploye else "retiré du déploiement"
    return {"message": f"Modèle {action} avec succès"}


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
def update_pipeline(pipeline_id: int, pipeline_in: ModelPipelineCreate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    p = crud_pipeline.get(db, id=pipeline_id)
    if not p:
        raise HTTPException(status_code=404, detail="Pipeline non trouvé")
    return crud_pipeline.update(db, db_obj=p, obj_in=pipeline_in)
