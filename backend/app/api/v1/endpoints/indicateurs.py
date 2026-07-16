from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.crud.indicateur import crud_indicateur
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.indicateur import (
    IndicateurCreate, IndicateurUpdate, IndicateurResponse,
)

router = APIRouter()


from pydantic import BaseModel, model_validator

class ReorderRequest(BaseModel):
    order: List[int] = []

    @model_validator(mode='before')
    @classmethod
    def populate_order(cls, data):
        if isinstance(data, dict):
            if 'ordre' in data and not data.get('order'):
                data['order'] = data['ordre']
        return data


class ResetRequest(BaseModel):
    pass


@router.get("/", response_model=List[IndicateurResponse])
def list_indicateurs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return crud_indicateur.get_multi(db, skip=skip, limit=limit)


@router.post("/", response_model=IndicateurResponse)
def create_indicateur(
    indicateur_in: IndicateurCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return crud_indicateur.create(db, obj_in=indicateur_in)


@router.post("/config")
def save_indicateur_config(
    config: dict,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Sauvegarde la configuration des indicateurs (poids, seuils, etc.)."""
    facteurs = config.get("facteurs", [])
    for f in facteurs:
        fid = f.get("id")
        ind = crud_indicateur.get(db, id=int(fid)) if fid else None
        if ind:
            if "poids" in f:
                ind.formule = f"poids_{f['poids']}"
            if "seuil_alerte" in f:
                ind.seuil_bas = float(f["seuil_alerte"])
            db.commit()
    return {"message": f"Configuration sauvegardée pour {len(facteurs)} indicateur(s)"}


@router.put("/reorder")
def reorder_indicateurs(
    data: ReorderRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Réordonne les indicateurs (met à jour order_index)."""
    from app.models.indicateur import Indicateur as IndicateurModel
    ordre = data.order
    if not ordre or not isinstance(ordre, list):
        raise HTTPException(status_code=400, detail="Liste d'ordre requise")
    for idx, item in enumerate(ordre):
        ind_id = item.get("id") if isinstance(item, dict) else item
        ind = db.query(IndicateurModel).filter(IndicateurModel.id == ind_id).first()
        if ind:
            ind.order_index = idx
    db.commit()
    return {"message": "Ordre mis à jour", "nb_indicateurs": len(ordre)}


@router.post("/reinitialiser")
def reset_indicateurs(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Réinitialise la configuration des indicateurs."""
    inds = crud_indicateur.get_multi(db)
    for ind in inds:
        ind.formule = "poids_10"
        ind.seuil_bas = 10.0
        ind.seuil_moyen = 50.0
        ind.seuil_eleve = 90.0
    db.commit()
    return {"message": "Configuration réinitialisée"}


@router.get("/{indicateur_id}", response_model=IndicateurResponse)
def get_indicateur(
    indicateur_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    indicateur = crud_indicateur.get(db, id=indicateur_id)
    if not indicateur:
        raise HTTPException(status_code=404, detail="Indicateur non trouvé")
    return indicateur


@router.put("/{indicateur_id}", response_model=IndicateurResponse)
def update_indicateur(
    indicateur_id: int,
    indicateur_in: IndicateurUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    indicateur = crud_indicateur.get(db, id=indicateur_id)
    if not indicateur:
        raise HTTPException(status_code=404, detail="Indicateur non trouvé")
    return crud_indicateur.update(db, db_obj=indicateur, obj_in=indicateur_in)


@router.delete("/{indicateur_id}", response_model=IndicateurResponse)
def delete_indicateur(
    indicateur_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    indicateur = crud_indicateur.get(db, id=indicateur_id)
    if not indicateur:
        raise HTTPException(status_code=404, detail="Indicateur non trouvé")
    return crud_indicateur.remove(db, id=indicateur_id)
