from typing import List, Optional, Dict
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from app.crud.base import CRUDBase
from app.models.capture import Capture
from app.schemas.capture import CaptureCreate, CaptureUpdate, CaptureValidate
from app.services.audio_classifier import AudioClassificationResult


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

    def list_audio_captures(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        statut: Optional[str] = None,
        site_id: Optional[int] = None,
        methode_capture: Optional[str] = None,
        has_audio: Optional[bool] = None,
        espece: Optional[str] = None,
        date_debut: Optional[datetime] = None,
    ) -> List[Capture]:
        query = db.query(Capture).options(joinedload(Capture.site))
        if methode_capture:
            query = query.filter(Capture.methode_capture.ilike(f"%{methode_capture.strip()}%"))
        if has_audio is True:
            query = query.filter(Capture.audio_path.isnot(None))
        elif has_audio is False:
            query = query.filter(Capture.audio_path.is_(None))
        if statut:
            query = query.filter(Capture.statut == statut)
        if site_id:
            query = query.filter(Capture.site_id == site_id)
        if espece:
            query = query.filter(Capture.espece.ilike(f"%{espece.strip()}%"))
        if date_debut:
            query = query.filter(Capture.date_capture >= date_debut)
        return query.order_by(Capture.date_capture.desc()).offset(skip).limit(limit).all()

    def get_audio_stats(self, db: Session) -> Dict[str, float]:
        captures = db.query(Capture).filter(Capture.audio_path.isnot(None)).all()
        analysed = [c for c in captures if c.audio_metadata]
        if not analysed:
            return {"precision": 0.0, "detection": 0.0, "echantillons": 0}

        y_true = []
        y_pred = []
        for capture in analysed:
            reference = (capture.espece_corrigee or capture.espece or "").strip().lower()
            predicted = (capture.espece or "").strip().lower()
            if reference and predicted:
                y_true.append(reference)
                y_pred.append(predicted)

        if y_true:
            correct = sum(1 for truth, pred in zip(y_true, y_pred) if truth == pred)
            precision = round(correct / len(y_true), 4)
        else:
            confidences = [c.confidence_ia for c in analysed if c.confidence_ia is not None]
            precision = round(sum(confidences) / len(confidences), 4) if confidences else 0.0

        detected = sum(1 for c in analysed if c.espece_detectee)
        detection_rate = round(detected / len(analysed), 4) if analysed else 0.0
        return {
            "precision": precision,
            "detection": detection_rate,
            "echantillons": len(analysed),
        }

    def apply_image_analysis(
        self,
        db: Session,
        *,
        capture_id: int,
        result,
        model_id: Optional[int],
    ) -> Optional[Capture]:
        capture = db.query(Capture).options(joinedload(Capture.site)).filter(Capture.id == capture_id).first()
        if not capture:
            return None
        capture.espece = result.espece_detectee
        capture.confidence_ia = result.confiance
        capture.ml_model_id = model_id
        capture.statut = "a_valider"
        capture.image_metadata = {
            "distribution": result.distribution,
            "modele": result.modele,
            "temps_traitement": result.temps_traitement,
            "analysed_at": datetime.utcnow().isoformat(),
        }
        db.commit()
        db.refresh(capture)
        return capture

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

    def apply_analysis(
        self,
        db: Session,
        *,
        capture_id: int,
        result: AudioClassificationResult,
        model_id: Optional[int],
    ) -> Optional[Capture]:
        capture = db.query(Capture).options(joinedload(Capture.site)).filter(Capture.id == capture_id).first()
        if not capture:
            return None
        capture.espece = result.espece_detectee
        capture.confidence_ia = result.confiance
        capture.ml_model_id = model_id
        capture.statut = "a_valider"
        capture.audio_metadata = {
            "distribution": result.distribution,
            "frequence": result.frequence,
            "duree_sec": result.duree_sec,
            "modele": result.modele,
            "temps_traitement": result.temps_traitement,
            "analysed_at": datetime.utcnow().isoformat(),
        }
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
