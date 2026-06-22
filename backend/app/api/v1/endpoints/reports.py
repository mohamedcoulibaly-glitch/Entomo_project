from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.session import get_db
from app.crud.report import crud_rapport, crud_rapport_programme
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.report import (
    RapportCreate, RapportUpdate, RapportResponse,
    RapportProgrammeCreate, RapportProgrammeResponse,
)

router = APIRouter()


@router.get("/", response_model=List[RapportResponse])
def list_rapports(
    skip: int = 0,
    limit: int = 100,
    type_rapport: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    from app.models.report import Rapport
    query = db.query(Rapport)
    if type_rapport:
        query = query.filter(Rapport.type == type_rapport)
    return query.order_by(Rapport.date_generation.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=RapportResponse)
def create_rapport(
    rapport_in: RapportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not rapport_in.utilisateur_id:
        rapport_in.utilisateur_id = current_user.id
    rapport_data = rapport_in.model_dump()
    from app.models.report import Rapport
    rapport = Rapport(**rapport_data, date_generation=datetime.utcnow())
    db.add(rapport)
    db.commit()
    db.refresh(rapport)
    return rapport


@router.get("/{rapport_id}", response_model=RapportResponse)
def get_rapport(rapport_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    rapport = crud_rapport.get(db, id=rapport_id)
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    return rapport


@router.put("/{rapport_id}", response_model=RapportResponse)
def update_rapport(rapport_id: int, rapport_in: RapportUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    rapport = crud_rapport.get(db, id=rapport_id)
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    return crud_rapport.update(db, db_obj=rapport, obj_in=rapport_in)


@router.delete("/{rapport_id}")
def delete_rapport(rapport_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    rapport = crud_rapport.get(db, id=rapport_id)
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    crud_rapport.remove(db, id=rapport_id)
    return {"message": "Rapport supprimé"}


@router.post("/{rapport_id}/programmer", response_model=RapportProgrammeResponse)
def programmer_rapport(
    rapport_id: int,
    prog_in: RapportProgrammeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    prog_in.rapport_id = rapport_id
    return crud_rapport_programme.create(db, obj_in=prog_in)


@router.get("/programmes/actifs", response_model=List[RapportProgrammeResponse])
def list_programmes_actifs(db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    return crud_rapport_programme.get_actifs(db)
