from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.site import SiteSentinelle, SiteActivite
from app.schemas.site import SiteSentinelleCreate, SiteSentinelleUpdate, SiteActiviteCreate


class CRUDSite(CRUDBase):
    def get_by_code(self, db: Session, *, code: str) -> Optional[SiteSentinelle]:
        return db.query(SiteSentinelle).filter(SiteSentinelle.code == code).first()

    def get_by_region(self, db: Session, *, region: str) -> List[SiteSentinelle]:
        return db.query(SiteSentinelle).filter(SiteSentinelle.region == region).all()

    def get_actifs(self, db: Session) -> List[SiteSentinelle]:
        return db.query(SiteSentinelle).filter(SiteSentinelle.actif == True).all()

    def add_activite(self, db: Session, *, obj_in: SiteActiviteCreate) -> SiteActivite:
        db_obj = SiteActivite(**obj_in.model_dump())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_activites(self, db: Session, *, site_id: int) -> List[SiteActivite]:
        return (
            db.query(SiteActivite)
            .filter(SiteActivite.site_id == site_id)
            .order_by(SiteActivite.date_activite.desc())
            .all()
        )


crud_site = CRUDSite(SiteSentinelle)
