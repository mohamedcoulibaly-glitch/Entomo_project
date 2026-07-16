from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import json
from app.db.session import get_db
from app.core.deps import get_current_active_user
from app.models.user import User

router = APIRouter()


class SyncSettings(BaseModel):
    auto_sync: Optional[bool] = None
    frequence: Optional[int] = None
    stockage_max: Optional[int] = None
    wifi_only: Optional[bool] = None
    data_types: Optional[list[str]] = None


DEFAULT_SETTINGS = {
    "auto_sync": True,
    "frequence": 60,
    "stockage_max": 100,
    "wifi_only": False,
    "data_types": ["new-captures", "species-analysis", "record-corrections"],
}


@router.get("/settings")
def get_sync_settings(
    extended: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.models.sync_preference import SyncPreference

    preference = db.query(SyncPreference).filter(
        SyncPreference.utilisateur_id == current_user.id
    ).first()
    if not preference:
        return DEFAULT_SETTINGS if extended else {key: value for key, value in DEFAULT_SETTINGS.items() if key != "data_types"}
    result = {
        "auto_sync": preference.auto_sync,
        "frequence": preference.frequence,
        "stockage_max": preference.stockage_max,
        "wifi_only": preference.wifi_only,
    }
    if extended:
        result["data_types"] = json.loads(preference.data_types or "[]")
    return result


@router.delete("/cache")
def clear_sync_cache(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Vide le cache de synchronisation hors-ligne."""
    from app.models.dhis2 import DHIS2Sync
    db.query(DHIS2Sync).filter(DHIS2Sync.statut == "en_attente").delete()
    db.commit()
    return {"message": "Cache de synchronisation vidé", "cache_vide": True}


@router.post("/settings")
def save_sync_settings(
    settings: SyncSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Sauvegarde les paramètres de synchronisation hors-ligne."""
    from app.models.sync_preference import SyncPreference

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
            "data_types": json.loads(preference.data_types or "[]"),
        },
    }
