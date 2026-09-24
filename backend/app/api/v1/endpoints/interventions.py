from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.intervention import crud_intervention
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.intervention import InterventionCreate, InterventionUpdate, InterventionResponse
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[InterventionResponse])
def list_interventions(
    skip: int = 0, limit: int = 100,
    statut: Optional[str] = Query(None),
    site_id: Optional[int] = Query(None),
    campagne_id: Optional[int] = Query(None),
    db: Session = Depends(get_db), _: User = Depends(get_current_active_user)
):
    from app.models.intervention import Intervention
    query = db.query(Intervention)
    if statut: query = query.filter(Intervention.statut == statut)
    if site_id: query = query.filter(Intervention.site_id == site_id)
    if campagne_id: query = query.filter(Intervention.campagne_id == campagne_id)
    return query.order_by(Intervention.date_prevue.desc()).offset(skip).limit(limit).all()

@router.post("/", response_model=InterventionResponse)
def create_intervention(
    intervention_in: InterventionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not intervention_in.utilisateur_id:
        intervention_in.utilisateur_id = current_user.id
    return crud_intervention.create(db, obj_in=intervention_in)

@router.get("/{intervention_id}", response_model=InterventionResponse)
def get_intervention(intervention_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    from app.models.intervention import Intervention
    i = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not i: raise HTTPException(status_code=404, detail="Intervention non trouvée")
    return i

@router.put("/{intervention_id}", response_model=InterventionResponse)
def update_intervention(intervention_id: int, intervention_in: InterventionUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    from app.models.intervention import Intervention
    i = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not i: raise HTTPException(status_code=404, detail="Intervention non trouvée")
    return crud_intervention.update(db, db_obj=i, obj_in=intervention_in)

@router.delete("/{intervention_id}")
def delete_intervention(intervention_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    from app.models.intervention import Intervention
    i = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not i: raise HTTPException(status_code=404, detail="Intervention non trouvée")
    crud_intervention.remove(db, id=intervention_id)
    return {"message": "Intervention supprimée"}
