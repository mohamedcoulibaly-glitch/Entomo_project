from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.campagne import crud_campagne
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.campagne import CampagneCreate, CampagneUpdate, CampagneResponse

router = APIRouter()

@router.get("/", response_model=List[CampagneResponse])
def list_campagnes(
    skip: int = 0, limit: int = 100,
    statut: Optional[str] = Query(None),
    db: Session = Depends(get_db), _: User = Depends(get_current_active_user)
):
    from app.models.campagne import Campagne
    query = db.query(Campagne)
    if statut: query = query.filter(Campagne.statut == statut)
    return query.order_by(Campagne.date_debut.desc()).offset(skip).limit(limit).all()

@router.post("/", response_model=CampagneResponse)
def create_campagne(campagne_in: CampagneCreate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    return crud_campagne.create(db, obj_in=campagne_in)

@router.get("/{campagne_id}", response_model=CampagneResponse)
def get_campagne(campagne_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    from app.models.campagne import Campagne
    c = db.query(Campagne).filter(Campagne.id == campagne_id).first()
    if not c: raise HTTPException(status_code=404, detail="Campagne non trouvée")
    return c

@router.put("/{campagne_id}", response_model=CampagneResponse)
def update_campagne(campagne_id: int, campagne_in: CampagneUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    from app.models.campagne import Campagne
    c = db.query(Campagne).filter(Campagne.id == campagne_id).first()
    if not c: raise HTTPException(status_code=404, detail="Campagne non trouvée")
    return crud_campagne.update(db, db_obj=c, obj_in=campagne_in)

@router.delete("/{campagne_id}")
def delete_campagne(campagne_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    from app.models.campagne import Campagne
    c = db.query(Campagne).filter(Campagne.id == campagne_id).first()
    if not c: raise HTTPException(status_code=404, detail="Campagne non trouvée")
    crud_campagne.remove(db, id=campagne_id)
    return {"message": "Campagne supprimée"}
