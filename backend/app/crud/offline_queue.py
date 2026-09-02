from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.offline_queue import OfflineQueueItem
from app.services.http_retry import compute_queue_backoff_seconds

MAX_QUEUE_RETRIES = 5


class CRUDOfflineQueue(CRUDBase):
    def list_for_user(self, db: Session, *, user_id: int, statut: Optional[str] = None) -> List[OfflineQueueItem]:
        query = db.query(OfflineQueueItem).filter(OfflineQueueItem.utilisateur_id == user_id)
        if statut:
            query = query.filter(OfflineQueueItem.statut == statut)
        return query.order_by(OfflineQueueItem.created_at.desc()).all()

    def list_ready_for_processing(
        self, db: Session, *, user_id: int, limit: int = 50
    ) -> List[OfflineQueueItem]:
        now = datetime.now(timezone.utc)
        return (
            db.query(OfflineQueueItem)
            .filter(
                OfflineQueueItem.utilisateur_id == user_id,
                OfflineQueueItem.statut == "pending",
                OfflineQueueItem.retry_count < MAX_QUEUE_RETRIES,
                (OfflineQueueItem.next_retry_at.is_(None)) | (OfflineQueueItem.next_retry_at <= now),
            )
            .order_by(OfflineQueueItem.created_at.asc())
            .limit(limit)
            .all()
        )

    def mark_synced(self, db: Session, item: OfflineQueueItem) -> OfflineQueueItem:
        item.statut = "synced"
        item.error_message = None
        item.next_retry_at = None
        db.commit()
        db.refresh(item)
        return item

    def mark_error(self, db: Session, item: OfflineQueueItem, message: str) -> OfflineQueueItem:
        item.statut = "error"
        item.error_message = message
        item.retry_count = (item.retry_count or 0) + 1
        if item.retry_count >= MAX_QUEUE_RETRIES:
            item.next_retry_at = None
        else:
            delay = compute_queue_backoff_seconds(item.retry_count)
            item.next_retry_at = datetime.now(timezone.utc) + timedelta(seconds=delay)
        db.commit()
        db.refresh(item)
        return item

    def mark_conflict(self, db: Session, item: OfflineQueueItem, message: str) -> OfflineQueueItem:
        item.statut = "conflict"
        item.error_message = message
        db.commit()
        db.refresh(item)
        return item

    def reset_for_retry(self, db: Session, item: OfflineQueueItem) -> OfflineQueueItem:
        item.statut = "pending"
        item.error_message = None
        item.next_retry_at = None
        db.commit()
        db.refresh(item)
        return item


crud_offline_queue = CRUDOfflineQueue(OfflineQueueItem)
