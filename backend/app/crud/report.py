from typing import List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.report import Rapport, RapportProgramme


class CRUDRapport(CRUDBase):
    def get_by_type(self, db: Session, *, type_rapport: str) -> List[Rapport]:
        return db.query(Rapport).filter(Rapport.type == type_rapport).all()

    def get_by_user(self, db: Session, *, user_id: int) -> List[Rapport]:
        return db.query(Rapport).filter(Rapport.utilisateur_id == user_id).all()


class CRUDRapportProgramme(CRUDBase):
    def get_actifs(self, db: Session) -> List[RapportProgramme]:
        return db.query(RapportProgramme).filter(RapportProgramme.actif == True).all()


crud_rapport = CRUDRapport(Rapport)
crud_rapport_programme = CRUDRapportProgramme(RapportProgramme)
