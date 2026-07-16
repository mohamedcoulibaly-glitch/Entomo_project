from typing import Optional, List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.reference import ReferenceData


class CRUDReferenceData(CRUDBase):
    def get_by_category(self, db: Session, category: str) -> List[ReferenceData]:
        return (
            db.query(self.model)
            .filter(self.model.category == category, self.model.active == True)
            .order_by(self.model.order_index, self.model.code)
            .all()
        )

    def get_by_code(self, db: Session, category: str, code: str) -> Optional[ReferenceData]:
        return (
            db.query(self.model)
            .filter(self.model.category == category, self.model.code == code)
            .first()
        )


crud_reference_data = CRUDReferenceData(ReferenceData)
