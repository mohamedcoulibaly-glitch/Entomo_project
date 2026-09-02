from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user
from app.crud.offline_queue import crud_offline_queue
from app.db.session import get_db
from app.models.offline_queue import OfflineQueueItem
from app.models.user import User
from app.schemas.base import BaseSchema
from app.services.dhis2_client import push_data_values
from app.crud.dhis2 import crud_dhis2_config
from app.services.offline_queue_service import process_user_queue, replay_queue_item, resolve_queue_conflict

router = APIRouter()


class SyncSettings(BaseModel):
    auto_sync: Optional[bool] = None
    frequence: Optional[int] = None
    stockage_max: Optional[int] = None
    wifi_only: Optional[bool] = None
    data_types: Optional[list[str]] = None
    cache_expiry_hours: Optional[int] = None


class OfflineQueueCreate(BaseModel):
    resource_type: str
    resource_id: Optional[int] = None
    action: str = "sync"
    payload: Optional[dict] = None
    client_id: Optional[str] = None


class OfflineQueueItemCreate(BaseModel):
    utilisateur_id: int
    resource_type: str
    resource_id: Optional[int] = None
    client_id: Optional[str] = None
    action: str = "sync"
    payload: Optional[dict] = None
    statut: str = "pending"
    retry_count: int = 0


class OfflineQueueResponse(BaseSchema):
    utilisateur_id: int
    resource_type: str
    resource_id: Optional[int] = None
    client_id: Optional[str] = None
    action: str
    payload: Optional[dict] = None
    statut: str
    error_message: Optional[str] = None
    retry_count: int = 0
    next_retry_at: Optional[str] = None


class QueueResolveRequest(BaseModel):
    strategy: str  # keep_local | discard


DEFAULT_SETTINGS = {
    "auto_sync": True,
    "frequence": 60,
    "stockage_max": 100,
    "wifi_only": False,
    "cache_expiry_hours": 72,
    "data_types": ["new-captures", "species-analysis", "record-corrections"],
}


@router.get("/settings")
def get_sync_settings(
    extended: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.models.sync_preference import SyncPreference
    import json

    preference = db.query(SyncPreference).filter(
        SyncPreference.utilisateur_id == current_user.id
    ).first()
    if not preference:
        return DEFAULT_SETTINGS if extended else {
            key: value for key, value in DEFAULT_SETTINGS.items() if key != "data_types"
        }
    result = {
        "auto_sync": preference.auto_sync,
        "frequence": preference.frequence,
        "stockage_max": preference.stockage_max,
        "wifi_only": preference.wifi_only,
    }
    if extended:
        result["cache_expiry_hours"] = preference.cache_expiry_hours
        result["data_types"] = json.loads(preference.data_types or "[]")
    return result


@router.delete("/cache")
def clear_sync_cache(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.models.dhis2 import DHIS2Sync

    db.query(OfflineQueueItem).filter(
        OfflineQueueItem.utilisateur_id == current_user.id,
        OfflineQueueItem.statut.in_(["pending", "error", "conflict"]),
    ).delete()
    db.query(DHIS2Sync).filter(DHIS2Sync.statut == "en_attente").delete()
    db.commit()
    return {"message": "Cache de synchronisation vidé", "cache_vide": True}


@router.post("/settings")
def save_sync_settings(
    settings: SyncSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.models.sync_preference import SyncPreference
    import json

    preference = db.query(SyncPreference).filter(
        SyncPreference.utilisateur_id == current_user.id
    ).first()
    if not preference:
        defaults = {**DEFAULT_SETTINGS, "data_types": json.dumps(DEFAULT_SETTINGS["data_types"])}
        preference = SyncPreference(utilisateur_id=current_user.id, **defaults)
        db.add(preference)
    update = settings.model_dump(exclude_none=True)
    if "data_types" in update:
        update["data_types"] = json.dumps(update["data_types"])
    for key, value in update.items():
        setattr(preference, key, value)
    db.commit()
    db.refresh(preference)
    return {
        "message": "Paramètres de synchronisation sauvegardés",
        "sauvegarde": True,
        "settings": {
            "auto_sync": preference.auto_sync,
            "frequence": preference.frequence,
            "stockage_max": preference.stockage_max,
            "wifi_only": preference.wifi_only,
            "cache_expiry_hours": preference.cache_expiry_hours,
            "data_types": json.loads(preference.data_types or "[]"),
        },
    }


@router.get("/queue", response_model=List[OfflineQueueResponse])
def list_offline_queue(
    statut: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return crud_offline_queue.list_for_user(db, user_id=current_user.id, statut=statut)


@router.post("/queue", response_model=OfflineQueueResponse)
def enqueue_offline_item(
    item_in: OfflineQueueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return crud_offline_queue.create(db, obj_in=OfflineQueueItemCreate(
        utilisateur_id=current_user.id,
        resource_type=item_in.resource_type,
        resource_id=item_in.resource_id,
        client_id=item_in.client_id,
        action=item_in.action,
        payload=item_in.payload,
    ))


@router.post("/queue/{item_id}/replay", response_model=OfflineQueueResponse)
def replay_offline_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    item = crud_offline_queue.get(db, id=item_id)
    if not item or item.utilisateur_id != current_user.id:
        raise HTTPException(status_code=404, detail="Élément de file introuvable")

    updated, success = replay_queue_item(db, item, current_user)
    if not success:
        raise HTTPException(status_code=502, detail=updated.error_message or "Échec du replay")
    return updated


@router.post("/queue/{item_id}/resolve", response_model=OfflineQueueResponse)
def resolve_offline_conflict(
    item_id: int,
    body: QueueResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    item = crud_offline_queue.get(db, id=item_id)
    if not item or item.utilisateur_id != current_user.id:
        raise HTTPException(status_code=404, detail="Élément de file introuvable")
    updated, success = resolve_queue_conflict(db, item, current_user, body.strategy)
    if not success and updated.statut == "conflict":
        raise HTTPException(status_code=409, detail=updated.error_message or "Conflit non résolu")
    if not success:
        raise HTTPException(status_code=502, detail=updated.error_message or "Échec de résolution")
    return updated


@router.post("/queue/process")
def process_offline_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return process_user_queue(db, current_user)
