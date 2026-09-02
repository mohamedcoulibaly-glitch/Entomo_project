"""Tests Phase 4 — DHIS2 retry, file offline backoff, statut consolidé."""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.crud.offline_queue import crud_offline_queue, MAX_QUEUE_RETRIES
from app.models.offline_queue import OfflineQueueItem
from app.services.http_retry import compute_queue_backoff_seconds, request_with_retry
from app.services.offline_queue_service import process_user_queue, resolve_queue_conflict


def test_compute_queue_backoff_seconds():
    assert compute_queue_backoff_seconds(1) == 30
    assert compute_queue_backoff_seconds(2) == 60
    assert compute_queue_backoff_seconds(10) == 900


def test_request_with_retry_on_503():
    client = MagicMock()
    bad = httpx.Response(503, request=httpx.Request("GET", "http://test"))
    good = httpx.Response(200, request=httpx.Request("GET", "http://test"))
    client.request.side_effect = [bad, good]
    with patch("app.services.http_retry.time.sleep"):
        response = request_with_retry(client, "GET", "http://test", max_attempts=3)
    assert response.status_code == 200
    assert client.request.call_count == 2


def test_mark_error_schedules_next_retry(db):
    item = OfflineQueueItem(
        utilisateur_id=1,
        resource_type="capture",
        action="create",
        statut="pending",
        payload={"espece": "An. gambiae"},
        retry_count=0,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    updated = crud_offline_queue.mark_error(db, item, "erreur test")
    assert updated.statut == "error"
    assert updated.retry_count == 1
    assert updated.next_retry_at is not None


def test_list_ready_skips_future_retry(db):
    item = OfflineQueueItem(
        utilisateur_id=1,
        resource_type="capture",
        action="create",
        statut="pending",
        payload={},
        retry_count=1,
        next_retry_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(item)
    db.commit()
    ready = crud_offline_queue.list_ready_for_processing(db, user_id=1, limit=10)
    assert ready == []


def test_dhis2_status_separates_conflicts(client, admin_token_headers, db):
  from app.models.offline_queue import OfflineQueueItem

  db.add(OfflineQueueItem(
      utilisateur_id=1,
      resource_type="capture",
      action="update",
      statut="conflict",
      payload={},
  ))
  db.add(OfflineQueueItem(
      utilisateur_id=1,
      resource_type="capture",
      action="update",
      statut="error",
      payload={},
  ))
  db.commit()

  res = client.get("/api/v1/dhis2/status", headers=admin_token_headers)
  assert res.status_code == 200
  data = res.json()
  assert data["conflict_count"] >= 1
  assert data["queue_error_count"] >= 1
  assert data["conflict_count"] != data["queue_error_count"] or data["conflict_count"] == 1


def test_resolve_queue_conflict_discard(db, admin_id):
    from app.models.user import User

    user = db.query(User).filter(User.id == admin_id).first()
    item = OfflineQueueItem(
        utilisateur_id=user.id,
        resource_type="capture",
        action="update",
        statut="conflict",
        payload={"notes": "local"},
        resource_id=1,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    updated, ok = resolve_queue_conflict(db, item, user, "discard")
    assert ok
    assert updated.statut == "synced"


def test_process_queue_returns_conflicts(db, admin_id):
    from app.models.user import User

    user = db.query(User).filter(User.id == admin_id).first()
    item = OfflineQueueItem(
        utilisateur_id=user.id,
        resource_type="unknown_type",
        action="sync",
        statut="pending",
        payload={},
    )
    db.add(item)
    db.commit()

    result = process_user_queue(db, user, limit=5)
    assert result["processed"] >= 1
    assert result["errors"] >= 1
    assert "conflicts" in result
