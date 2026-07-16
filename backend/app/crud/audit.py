from app.crud.base import CRUDBase
from app.models.audit_log import AuditLog


class CRUDAuditLog(CRUDBase):
    def get_by_user(self, db, user_id: int, skip: int = 0, limit: int = 100):
        return db.query(self.model).filter(self.model.utilisateur_id == user_id).order_by(self.model.created_at.desc()).offset(skip).limit(limit).all()
    
    def get_by_module(self, db, module: str, skip: int = 0, limit: int = 100):
        return db.query(self.model).filter(self.model.module == module).order_by(self.model.created_at.desc()).offset(skip).limit(limit).all()

crud_audit = CRUDAuditLog(AuditLog)
