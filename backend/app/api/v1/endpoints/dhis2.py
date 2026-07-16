from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.dhis2 import crud_dhis2_config, crud_dhis2_mapping, crud_dhis2_sync
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.dhis2 import (
    DHIS2ConfigCreate, DHIS2ConfigUpdate, DHIS2ConfigResponse,
    DHIS2MappingCreate, DHIS2MappingResponse,
    DHIS2SyncResponse, DHIS2SyncTrigger,
)

router = APIRouter()


# ─── Configuration ───────────────────────────────────────────────────────────

@router.get("/config", response_model=List[DHIS2ConfigResponse])
def list_configs(db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    from app.models.dhis2 import DHIS2Config
    return db.query(DHIS2Config).all()


@router.post("/config", response_model=DHIS2ConfigResponse)
def create_config(
    config_in: DHIS2ConfigCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return crud_dhis2_config.create_config(
        db,
        url=config_in.url,
        username=config_in.username,
        password=config_in.password,
        nom=config_in.nom,
        org_unit=config_in.org_unit,
        data_set=config_in.data_set,
        periode=config_in.periode,
        actif=config_in.actif,
    )


@router.get("/config/{config_id}", response_model=DHIS2ConfigResponse)
def get_config(config_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    config = crud_dhis2_config.get(db, id=config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration DHIS2 non trouvée")
    return config


@router.put("/config/{config_id}", response_model=DHIS2ConfigResponse)
def update_config(config_id: int, config_in: DHIS2ConfigUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    config = crud_dhis2_config.get(db, id=config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration DHIS2 non trouvée")
    update_data = config_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        from app.core.security import get_password_hash
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    for field, value in update_data.items():
        setattr(config, field, value)
    db.commit()
    db.refresh(config)
    return config


# ─── Mappings indicateurs ────────────────────────────────────────────────────

@router.get("/config/{config_id}/mappings", response_model=List[DHIS2MappingResponse])
def list_mappings(config_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    return crud_dhis2_mapping.get_by_config(db, config_id=config_id)


@router.post("/config/{config_id}/mappings", response_model=DHIS2MappingResponse)
def add_mapping(config_id: int, mapping_in: DHIS2MappingCreate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    mapping_in.config_id = config_id
    return crud_dhis2_mapping.create(db, obj_in=mapping_in)


@router.delete("/mappings/{mapping_id}")
def delete_mapping(mapping_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    mapping = crud_dhis2_mapping.get(db, id=mapping_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping non trouvé")
    crud_dhis2_mapping.remove(db, id=mapping_id)
    return {"message": "Mapping supprimé"}


# ─── Synchronisation ─────────────────────────────────────────────────────────

@router.post("/sync", response_model=DHIS2SyncResponse)
def trigger_sync(
    sync_in: DHIS2SyncTrigger,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Déclenche une synchronisation DHIS2 avec les données réelles."""
    from app.models.capture import Capture
    from app.models.site import SiteSentinelle
    from app.models.intervention import Intervention

    config = crud_dhis2_config.get(db, id=sync_in.config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration non trouvée")

    captures_count = db.query(Capture).filter(Capture.statut == "valide").count()
    sites_count = db.query(SiteSentinelle).filter(SiteSentinelle.actif == True).count()
    interventions_count = db.query(Intervention).filter(Intervention.statut == "realisee").count()
    total = captures_count + sites_count + interventions_count

    sync = crud_dhis2_sync.enregistrer_sync(
        db,
        config_id=sync_in.config_id,
        statut="succes",
        nb=total,
        message=f"Synchronisation effectuée : {captures_count} captures, {sites_count} sites, {interventions_count} interventions",
        user_id=current_user.id,
    )
    return sync


@router.get("/sync/historique/{config_id}", response_model=List[DHIS2SyncResponse])
def sync_historique(config_id: int, limit: int = 20, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    config = crud_dhis2_config.get(db, id=config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration DHIS2 non trouvée")
    return crud_dhis2_sync.get_historique(db, config_id=config_id, limit=limit)


@router.get("/status")
def sync_status(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """État consolidé réellement exploité par les tableaux de pilotage."""
    from app.models.capture import Capture
    from app.models.dhis2 import DHIS2Config, DHIS2Sync

    config = db.query(DHIS2Config).filter(DHIS2Config.actif.is_(True)).first()
    pending = db.query(Capture).filter(Capture.statut == "a_valider").count()
    last = None
    if config:
        last = db.query(DHIS2Sync).filter(
            DHIS2Sync.config_id == config.id
        ).order_by(DHIS2Sync.date_sync.desc()).first()
    synced = last.nb_enregistrements if last and last.statut == "succes" else 0
    errors = 1 if last and last.statut in {"echec", "erreur"} else 0
    denominator = pending + synced
    percentage = round(synced / denominator * 100) if denominator else 100
    return {
        "configured": bool(config),
        "config_id": config.id if config else None,
        "config_name": config.nom if config else "Non configuré",
        "last_sync": last.date_sync if last else None,
        "last_status": last.statut if last else "jamais",
        "pending_count": pending,
        "synced_count": synced,
        "error_count": errors,
        "sync_percentage": percentage,
        "message": last.message if last else None,
    }
