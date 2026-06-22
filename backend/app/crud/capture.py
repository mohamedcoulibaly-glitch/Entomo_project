from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.capture import Capture
from app.schemas.capture import CaptureCreate, CaptureUpdate, CaptureValidate


class CRUDCapture(CRUDBase):
    def get_by_site(self, db: Session, *, site_id: int, skip: int = 0, limit: int = 100) -> List[Capture]:
        return (
            db.query(Capture)
            .filter(Capture.site_id == site_id)
            .order_by(Capture.date_capture.desc())
            .offset(skip).limit(limit).all()
        )

    def get_by_statut(self, db: Session, *, statut: str, skip: int = 0, limit: int = 100) -> List[Capture]:
        return (
            db.query(Capture)
            .filter(Capture.statut == statut)
            .order_by(Capture.date_capture.desc())
            .offset(skip).limit(limit).all()
        )

    def get_a_valider(self, db: Session, skip: int = 0, limit: int = 100) -> List[Capture]:
        return self.get_by_statut(db, statut="a_valider", skip=skip, limit=limit)

    def valider(self, db: Session, *, capture_id: int, validation: CaptureValidate, valideur_id: int) -> Optional[Capture]:
        capture = self.get(db, id=capture_id)
        if not capture:
            return None
        capture.statut = validation.statut
        capture.valide = validation.statut == "valide"
        capture.valideur_id = valideur_id
        if validation.espece_corrigee:
            capture.espece_corrigee = validation.espece_corrigee
        if validation.notes:
            capture.notes = (capture.notes or "") + f"\n[Validation] {validation.notes}"
        db.commit()
        db.refresh(capture)
        return capture

    def update_media(self, db: Session, *, capture_id: int, image_path: str = None, audio_path: str = None) -> Optional[Capture]:
        capture = self.get(db, id=capture_id)
        if not capture:
            return None
        if image_path:
            capture.image_path = image_path
        if audio_path:
            capture.audio_path = audio_path
        db.commit()
        db.refresh(capture)
        return capture


crud_capture = CRUDCapture(Capture)
