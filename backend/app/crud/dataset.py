from typing import List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.dataset import Dataset, Annotation


class CRUDDataset(CRUDBase):
    def get_actifs(self, db: Session) -> List[Dataset]:
        return db.query(Dataset).filter(Dataset.actif == True).all()

    def get_by_user(self, db: Session, *, user_id: int) -> List[Dataset]:
        return db.query(Dataset).filter(Dataset.utilisateur_id == user_id).all()


class CRUDAnnotation(CRUDBase):
    def get_by_dataset(self, db: Session, *, dataset_id: int) -> List[Annotation]:
        return db.query(Annotation).filter(Annotation.dataset_id == dataset_id).all()


crud_dataset = CRUDDataset(Dataset)
crud_annotation = CRUDAnnotation(Annotation)
