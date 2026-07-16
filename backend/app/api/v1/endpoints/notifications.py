from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.notification import crud_notification
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.notification import NotificationResponse

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
def list_notifications(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return crud_notification.get_by_user(db, user_id=current_user.id, skip=skip, limit=limit)

@router.get("/non-lues")
def unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return {"count": crud_notification.get_unread_count(db, user_id=current_user.id)}

@router.post("/{notif_id}/lire")
def mark_read(notif_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    n = crud_notification.mark_as_read(db, notif_id=notif_id, user_id=current_user.id)
    if not n: return {"message": "Notification non trouvée"}
    return {"message": "Notification marquée comme lue"}

@router.post("/tout-lire")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    crud_notification.mark_all_read(db, user_id=current_user.id)
    return {"message": "Toutes les notifications marquées comme lues"}
