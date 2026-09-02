"""Traitement centralisé de la file hors-ligne."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional, Tuple

from sqlalchemy.orm import Session

from app.crud.capture import crud_capture
from app.crud.dhis2 import crud_dhis2_config
from app.crud.offline_queue import crud_offline_queue, MAX_QUEUE_RETRIES
from app.models.offline_queue import OfflineQueueItem
from app.models.user import User
from app.schemas.capture import CaptureCreate, CaptureUpdate, CaptureValidate
from app.schemas.site import SiteSentinelleCreate
from app.services.dhis2_client import push_capture_to_dhis2, push_data_values


def _payloads_equal(a: Optional[dict], b: Optional[dict]) -> bool:
    if not a and not b:
        return True
    if not a or not b:
        return False
    return json.dumps(a, sort_keys=True, default=str) == json.dumps(b, sort_keys=True, default=str)


def _find_duplicate(
    db: Session,
    *,
    user_id: int,
    client_id: Optional[str],
) -> Optional[OfflineQueueItem]:
    if not client_id:
        return None
    return (
        db.query(OfflineQueueItem)
        .filter(
            OfflineQueueItem.utilisateur_id == user_id,
            OfflineQueueItem.client_id == client_id,
            OfflineQueueItem.statut == "synced",
        )
        .first()
    )


def _check_capture_update_conflict(
    db: Session,
    item: OfflineQueueItem,
    capture_id: int,
    payload: dict,
) -> Optional[str]:
    capture = crud_capture.get(db, id=capture_id)
    if not capture:
        return None
    client_ts = payload.get("client_updated_at") or payload.get("updated_at")
    if not client_ts or not capture.updated_at:
        return None
    try:
        client_dt = datetime.fromisoformat(str(client_ts).replace("Z", "+00:00"))
        server_dt = capture.updated_at
        if server_dt.tzinfo is None:
            server_dt = server_dt.replace(tzinfo=timezone.utc)
        if server_dt > client_dt:
            return (
                f"Conflit: la capture #{capture_id} a été modifiée sur le serveur "
                f"({server_dt.isoformat()}) après votre version locale."
            )
    except (ValueError, TypeError):
        return None
    return None


def replay_queue_item(
    db: Session,
    item: OfflineQueueItem,
    user: User,
    *,
    force: bool = False,
) -> Tuple[OfflineQueueItem, bool]:
    """Rejoue un élément de file. Retourne (item, success)."""
    if item.statut == "conflict" and not force:
        return item, False

    if item.payload and item.payload.get("client_id"):
        duplicate = _find_duplicate(db, user_id=user.id, client_id=item.payload["client_id"])
        if duplicate:
            if _payloads_equal(duplicate.payload, item.payload):
                return crud_offline_queue.mark_synced(db, item), True
            return crud_offline_queue.mark_conflict(
                db, item, "Conflit: un enregistrement identique existe déjà avec des données différentes."
            ), False

    try:
        if item.resource_type == "capture":
            return _replay_capture(db, item, user, force=force)
        if item.resource_type == "site":
            return _replay_site(db, item, user)
        if item.resource_type == "dhis2":
            return _replay_dhis2(db, item, user)
        if item.resource_type == "intervention":
            return _replay_intervention(db, item, user)
    except Exception as exc:
        return crud_offline_queue.mark_error(db, item, str(exc)), False

    return crud_offline_queue.mark_error(
        db, item, f"Type non supporté: {item.resource_type}/{item.action}"
    ), False


def _replay_capture(
    db: Session,
    item: OfflineQueueItem,
    user: User,
    *,
    force: bool = False,
) -> Tuple[OfflineQueueItem, bool]:
    payload = dict(item.payload or {})
    if item.action == "create":
        capture_in = CaptureCreate(**payload)
        if not capture_in.utilisateur_id:
            capture_in.utilisateur_id = user.id
        crud_capture.create(db, obj_in=capture_in)
        return crud_offline_queue.mark_synced(db, item), True
    if item.action == "update" and item.resource_id:
        if not force:
            conflict = _check_capture_update_conflict(db, item, item.resource_id, payload)
            if conflict:
                return crud_offline_queue.mark_conflict(db, item, conflict), False
        payload.pop("client_updated_at", None)
        payload.pop("updated_at", None)
        capture_in = CaptureUpdate(**payload)
        updated = crud_capture.update(
            db, db_obj=crud_capture.get(db, id=item.resource_id), obj_in=capture_in
        )
        if not updated:
            return crud_offline_queue.mark_error(db, item, "Capture introuvable"), False
        return crud_offline_queue.mark_synced(db, item), True
    if item.action in {"validate", "valider"} and item.resource_id:
        validation = CaptureValidate(**payload)
        result = crud_capture.valider(
            db,
            capture_id=item.resource_id,
            validation=validation,
            valideur_id=user.id,
        )
        if not result:
            return crud_offline_queue.mark_error(db, item, "Capture introuvable"), False
        return crud_offline_queue.mark_synced(db, item), True
    return crud_offline_queue.mark_error(db, item, "Action capture non supportée"), False


def _replay_site(db: Session, item: OfflineQueueItem, user: User) -> Tuple[OfflineQueueItem, bool]:
    from app.crud.site import crud_site

    if item.action != "create":
        return crud_offline_queue.mark_error(db, item, "Action site non supportée"), False
    site_in = SiteSentinelleCreate(**(item.payload or {}))
    crud_site.create(db, obj_in=site_in)
    return crud_offline_queue.mark_synced(db, item), True


def _replay_dhis2(db: Session, item: OfflineQueueItem, user: User) -> Tuple[OfflineQueueItem, bool]:
    config = crud_dhis2_config.get_actif(db)
    if not config:
        return crud_offline_queue.mark_error(db, item, "Aucune configuration DHIS2 active"), False
    capture_id = item.resource_id or (item.payload or {}).get("capture_id")
    if capture_id:
        ok, message, _, count = push_capture_to_dhis2(db, config, int(capture_id))
    else:
        ok, message, _, count = push_data_values(db, config)
    if ok:
        return crud_offline_queue.mark_synced(db, item), True
    return crud_offline_queue.mark_error(db, item, message), False


def _replay_intervention(db: Session, item: OfflineQueueItem, user: User) -> Tuple[OfflineQueueItem, bool]:
    from app.crud.intervention import crud_intervention
    from app.schemas.intervention import InterventionCreate

    if item.action != "create":
        return crud_offline_queue.mark_error(db, item, "Action intervention non supportée"), False
    data = dict(item.payload or {})
    if not data.get("utilisateur_id"):
        data["utilisateur_id"] = user.id
    intervention_in = InterventionCreate(**data)
    crud_intervention.create(db, obj_in=intervention_in)
    return crud_offline_queue.mark_synced(db, item), True


def process_user_queue(db: Session, user: User, *, limit: int = 50) -> dict:
    items = crud_offline_queue.list_ready_for_processing(db, user_id=user.id, limit=limit)
    synced = 0
    errors = 0
    conflicts = 0
    skipped = 0
    for item in items:
        _, success = replay_queue_item(db, item, user)
        db.refresh(item)
        if success:
            synced += 1
        elif item.statut == "conflict":
            conflicts += 1
        elif item.statut == "error":
            errors += 1
        else:
            skipped += 1
    return {
        "processed": len(items),
        "synced": synced,
        "errors": errors,
        "conflicts": conflicts,
        "skipped": skipped,
        "max_retries": MAX_QUEUE_RETRIES,
    }


def resolve_queue_conflict(
    db: Session,
    item: OfflineQueueItem,
    user: User,
    strategy: str,
) -> Tuple[OfflineQueueItem, bool]:
    """Résout un conflit: keep_local (force replay) ou discard."""
    if item.statut != "conflict":
        return item, item.statut == "synced"
    if strategy == "discard":
        item.statut = "synced"
        item.error_message = "Conflit résolu: version locale abandonnée"
        db.commit()
        db.refresh(item)
        return item, True
    if strategy == "keep_local":
        crud_offline_queue.reset_for_retry(db, item)
        return replay_queue_item(db, item, user, force=True)
    return crud_offline_queue.mark_error(db, item, f"Stratégie invalide: {strategy}"), False
