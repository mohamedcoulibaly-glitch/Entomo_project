from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.role import Role, Permission


class CRUDRole(CRUDBase):
    def get_by_name(self, db: Session, *, name: str) -> Optional[Role]:
        return db.query(Role).filter(Role.name == name).first()

    def create_with_permissions(self, db: Session, *, name: str, description: str = None, permission_ids: List[int] = None) -> Role:
        role = Role(name=name, description=description)
        if permission_ids:
            perms = db.query(Permission).filter(Permission.id.in_(permission_ids)).all()
            role.permissions = perms
        db.add(role)
        db.commit()
        db.refresh(role)
        return role

    def update_permissions(self, db: Session, *, role: Role, permission_ids: List[int]) -> Role:
        perms = db.query(Permission).filter(Permission.id.in_(permission_ids)).all()
        role.permissions = perms
        db.commit()
        db.refresh(role)
        return role


class CRUDPermission(CRUDBase):
    def get_by_code(self, db: Session, *, code: str) -> Optional[Permission]:
        return db.query(Permission).filter(Permission.code == code).first()

    def get_by_module(self, db: Session, *, module: str) -> List[Permission]:
        return db.query(Permission).filter(Permission.module == module).all()


crud_role = CRUDRole(Role)
crud_permission = CRUDPermission(Permission)
