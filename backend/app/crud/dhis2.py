from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.dhis2 import DHIS2Config, DHIS2Mapping, DHIS2Sync
from app.core.security import get_password_hash


class CRUDDHIS2Config(CRUDBase):
    def get_actif(self, db: Session) -> Optional[DHIS2Config]:
        return db.query(DHIS2Config).filter(DHIS2Config.actif == True).first()

    def create_config(self, db: Session, *, url: str, username: str, password: str, **kwargs) -> DHIS2Config:
        config = DHIS2Config(
            url=url,
            username=username,
            hashed_password=get_password_hash(password),
            **kwargs,
        )
        db.add(config)
        db.commit()
        db.refresh(config)
        return config


class CRUDDHIS2Mapping(CRUDBase):
    def get_by_config(self, db: Session, *, config_id: int) -> List[DHIS2Mapping]:
        return db.query(DHIS2Mapping).filter(DHIS2Mapping.config_id == config_id).all()


class CRUDDHIS2Sync(CRUDBase):
    def enregistrer_sync(
        self, db: Session, *, config_id: int, statut: str, nb: int = 0, message: str = None, user_id: int = None
    ) -> DHIS2Sync:
        sync = DHIS2Sync(
            config_id=config_id,
            date_sync=datetime.utcnow(),
            statut=statut,
            nb_enregistrements=nb,
            message=message,
            utilisateur_id=user_id,
        )
        db.add(sync)
        db.commit()
        db.refresh(sync)
        return sync

    def get_historique(self, db: Session, *, config_id: int, limit: int = 20) -> List[DHIS2Sync]:
        return (
            db.query(DHIS2Sync)
            .filter(DHIS2Sync.config_id == config_id)
            .order_by(DHIS2Sync.date_sync.desc())
            .limit(limit)
            .all()
        )


crud_dhis2_config = CRUDDHIS2Config(DHIS2Config)
crud_dhis2_mapping = CRUDDHIS2Mapping(DHIS2Mapping)
crud_dhis2_sync = CRUDDHIS2Sync(DHIS2Sync)
