from app.crud.base import CRUDBase
from app.models.notification import Notification


class CRUDNotification(CRUDBase):
    def get_by_user(self, db, user_id: int, skip: int = 0, limit: int = 100):
        return db.query(self.model).filter(self.model.utilisateur_id == user_id).order_by(self.model.created_at.desc()).offset(skip).limit(limit).all()
    
    def get_unread_count(self, db, user_id: int):
        return db.query(self.model).filter(self.model.utilisateur_id == user_id, self.model.lu == False).count()
    
    def mark_as_read(self, db, notif_id: int, user_id: int):
        notif = db.query(self.model).filter(self.model.id == notif_id, self.model.utilisateur_id == user_id).first()
        if notif:
            from datetime import datetime
            notif.lu = True
            notif.date_lecture = datetime.utcnow()
            db.commit()
            db.refresh(notif)
        return notif
    
    def mark_all_read(self, db, user_id: int):
        from datetime import datetime
        db.query(self.model).filter(self.model.utilisateur_id == user_id, self.model.lu == False).update({"lu": True, "date_lecture": datetime.utcnow()})
        db.commit()
        return True

crud_notification = CRUDNotification(Notification)
