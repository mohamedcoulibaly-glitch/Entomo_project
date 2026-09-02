from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.dhis2 import crud_dhis2_config, crud_dhis2_mapping, crud_dhis2_sync
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.dhis2 import (
    DHIS2ConfigCreate, DHIS2ConfigUpdate, DHIS2ConfigResponse,
    DHIS2MappingCreate, DHIS2MappingResponse,
    DHIS2SyncResponse, DHIS2SyncTrigger, DHIS2TestConnectionRequest,
    DHIS2TestConnectionResponse, DHIS2PendingCapture,
)
from app.services.dhis2_client import test_connection, push_data_values, build_data_value_set, credentials_ready, push_capture_to_dhis2, fetch_catalog
from app.services.audit_service import audit_service

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
        from app.core.crypto import encrypt_secret
        plain_password = update_data.pop("password")
        update_data["hashed_password"] = get_password_hash(plain_password)
        update_data["credential_enc"] = encrypt_secret(plain_password)
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

@router.post("/test-connection", response_model=DHIS2TestConnectionResponse)
def test_dhis2_connection(
    body: DHIS2TestConnectionRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    config = crud_dhis2_config.get(db, id=body.config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration non trouvée")
    ok, message, info = test_connection(config, password=body.password)
    return DHIS2TestConnectionResponse(success=ok, message=message, system_info=info)


@router.get("/catalog/{config_id}")
def get_dhis2_catalog(
    config_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Charge orgUnits, dataElements et dataSets depuis l'instance DHIS2."""
    config = crud_dhis2_config.get(db, id=config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration non trouvée")
    ok, message, catalog = fetch_catalog(config)
    if not ok:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message, **catalog}


@router.get("/pending", response_model=List[DHIS2PendingCapture])
def list_pending_captures(db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    from app.models.capture import Capture
    from sqlalchemy.orm import joinedload

    captures = (
        db.query(Capture)
        .options(joinedload(Capture.site))
        .filter(Capture.statut == "a_valider")
        .order_by(Capture.date_capture.desc())
        .all()
    )
    return [
        DHIS2PendingCapture(
            id=capture.id,
            type="Capture entomologique",
            code=f"SPN-{capture.id:05d}",
            statut=capture.statut,
            espece=capture.espece,
            site_nom=capture.site_nom,
            date_capture=capture.date_capture,
            modified_at=capture.updated_at or capture.date_capture,
        )
        for capture in captures
    ]


@router.post("/sync", response_model=DHIS2SyncResponse)
def trigger_sync(
    sync_in: DHIS2SyncTrigger,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Déclenche une synchronisation DHIS2 réelle (dataValueSets)."""
    config = crud_dhis2_config.get(db, id=sync_in.config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration non trouvée")

    if not credentials_ready(config, sync_in.password):
        raise HTTPException(
            status_code=400,
            detail="Identifiants DHIS2 incomplets — configurez l'utilisateur et le mot de passe dans Paramètres DHIS2.",
        )

    ok, message, payload, count = push_data_values(db, config, password=sync_in.password)
    sync = crud_dhis2_sync.enregistrer_sync(
        db,
        config_id=sync_in.config_id,
        statut="succes" if ok else "echec",
        nb=count,
        message=message if ok else f"{message} | payload={len(payload.get('dataValues', []))} valeur(s)",
        user_id=current_user.id,
    )
    audit_service.log_for_user(
        db,
        current_user,
        action="dhis2_sync",
        module="dhis2",
        resource_type="dhis2_config",
        resource_id=sync_in.config_id,
        details={"statut": sync.statut, "nb_enregistrements": count, "message": message},
        adresse_ip=request.client.host if request.client else None,
    )
    if not ok:
        raise HTTPException(status_code=502, detail=message)
    return sync


@router.post("/sync/capture/{capture_id}", response_model=DHIS2SyncResponse)
def sync_single_capture(
    capture_id: int,
    request: Request,
    password: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Synchronise une capture validée vers DHIS2."""
    config = crud_dhis2_config.get_actif(db)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration DHIS2 active introuvable")
    if not credentials_ready(config, password):
        raise HTTPException(status_code=400, detail="Identifiants DHIS2 incomplets")

    ok, message, _, count = push_capture_to_dhis2(db, config, capture_id, password=password)
    sync = crud_dhis2_sync.enregistrer_sync(
        db,
        config_id=config.id,
        statut="succes" if ok else "echec",
        nb=count,
        message=message,
        user_id=current_user.id,
    )
    audit_service.log_for_user(
        db,
        current_user,
        action="dhis2_sync_capture",
        module="dhis2",
        resource_type="capture",
        resource_id=capture_id,
        details={"statut": sync.statut, "message": message},
        adresse_ip=request.client.host if request.client else None,
    )
    if not ok:
        raise HTTPException(status_code=502, detail=message)
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
    current_user: User = Depends(get_current_active_user),
):
    """État consolidé réellement exploité par les tableaux de pilotage."""
    from app.models.capture import Capture
    from app.models.dhis2 import DHIS2Config, DHIS2Sync
    from app.models.offline_queue import OfflineQueueItem

    config = db.query(DHIS2Config).filter(DHIS2Config.actif.is_(True)).first()
    pending = db.query(Capture).filter(Capture.statut == "a_valider").count()
    queue_pending = db.query(OfflineQueueItem).filter(
        OfflineQueueItem.utilisateur_id == current_user.id,
        OfflineQueueItem.statut == "pending",
    ).count()
    queue_errors = db.query(OfflineQueueItem).filter(
        OfflineQueueItem.utilisateur_id == current_user.id,
        OfflineQueueItem.statut == "error",
    ).count()
    queue_conflicts = db.query(OfflineQueueItem).filter(
        OfflineQueueItem.utilisateur_id == current_user.id,
        OfflineQueueItem.statut == "conflict",
    ).count()
    queue_synced = db.query(OfflineQueueItem).filter(
        OfflineQueueItem.utilisateur_id == current_user.id,
        OfflineQueueItem.statut == "synced",
    ).count()
    last = None
    if config:
        last = db.query(DHIS2Sync).filter(
            DHIS2Sync.config_id == config.id
        ).order_by(DHIS2Sync.date_sync.desc()).first()
    dhis2_synced = last.nb_enregistrements if last and last.statut == "succes" else 0
    dhis2_errors = 1 if last and last.statut in {"echec", "erreur"} else 0
    total_work = pending + queue_pending + queue_errors + queue_conflicts + queue_synced
    completed = queue_synced + dhis2_synced
    percentage = round(completed / total_work * 100) if total_work else 100
    creds_ready = credentials_ready(config) if config else False
    return {
        "configured": bool(config),
        "credentials_ready": creds_ready,
        "config_id": config.id if config else None,
        "config_name": config.nom if config else "Non configuré",
        "last_sync": last.date_sync if last else None,
        "last_status": last.statut if last else "jamais",
        "pending_count": pending + queue_pending,
        "capture_pending_count": pending,
        "queue_pending_count": queue_pending,
        "synced_count": queue_synced + dhis2_synced,
        "queue_synced_count": queue_synced,
        "dhis2_synced_count": dhis2_synced,
        "error_count": queue_errors + dhis2_errors,
        "queue_error_count": queue_errors,
        "conflict_count": queue_conflicts,
        "sync_percentage": min(100, percentage),
        "message": last.message if last else None,
    }
