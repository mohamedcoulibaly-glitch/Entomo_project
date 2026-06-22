from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.site import crud_site
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.site import (
    SiteSentinelleCreate, SiteSentinelleUpdate, SiteSentinelleResponse,
    SiteActiviteCreate, SiteActiviteResponse,
)

router = APIRouter()


@router.get("/", response_model=List[SiteSentinelleResponse])
def list_sites(
    skip: int = 0,
    limit: int = 100,
    region: Optional[str] = Query(None),
    actif: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    from app.models.site import SiteSentinelle
    query = db.query(SiteSentinelle)
    if region:
        query = query.filter(SiteSentinelle.region == region)
    if actif is not None:
        query = query.filter(SiteSentinelle.actif == actif)
    return query.offset(skip).limit(limit).all()


@router.post("/", response_model=SiteSentinelleResponse)
def create_site(
    site_in: SiteSentinelleCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    if site_in.code and crud_site.get_by_code(db, code=site_in.code):
        raise HTTPException(status_code=400, detail="Code de site déjà utilisé")
    return crud_site.create(db, obj_in=site_in)


@router.get("/{site_id}", response_model=SiteSentinelleResponse)
def get_site(site_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    site = crud_site.get(db, id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site non trouvé")
    return site


@router.put("/{site_id}", response_model=SiteSentinelleResponse)
def update_site(
    site_id: int,
    site_in: SiteSentinelleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    site = crud_site.get(db, id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site non trouvé")
    return crud_site.update(db, db_obj=site, obj_in=site_in)


@router.delete("/{site_id}")
def delete_site(site_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    site = crud_site.get(db, id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site non trouvé")
    crud_site.remove(db, id=site_id)
    return {"message": "Site supprimé"}


@router.post("/{site_id}/activites", response_model=SiteActiviteResponse)
def add_activite(
    site_id: int,
    activite_in: SiteActiviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    activite_in.site_id = site_id
    if not activite_in.utilisateur_id:
        activite_in.utilisateur_id = current_user.id
    return crud_site.add_activite(db, obj_in=activite_in)


@router.get("/{site_id}/activites", response_model=List[SiteActiviteResponse])
def get_activites(site_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    return crud_site.get_activites(db, site_id=site_id)
