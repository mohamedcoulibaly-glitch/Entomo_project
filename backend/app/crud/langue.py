from typing import Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.langue import Langue


class CRUDLangue(CRUDBase):
    def get_active(self, db: Session) -> Optional[Langue]:
        return db.query(Langue).filter(Langue.active == True).first()

    def get_by_code(self, db: Session, code: str) -> Optional[Langue]:
        return db.query(Langue).filter(Langue.code == code).first()

    def set_active(self, db: Session, langue_id: int) -> Optional[Langue]:
        db.query(Langue).filter(Langue.active == True).update({"active": False})
        langue = self.get(db, id=langue_id)
        if langue:
            langue.active = True
            db.commit()
            db.refresh(langue)
        return langue


crud_langue = CRUDLangue(Langue)
