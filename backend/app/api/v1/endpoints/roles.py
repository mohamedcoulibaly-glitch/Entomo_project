from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.role import crud_role, crud_permission
from app.core.deps import get_current_superuser
from app.models.user import User
from app.schemas.role import RoleCreate, RoleUpdate, RoleResponse, PermissionCreate, PermissionResponse

router = APIRouter()


# ─── Permissions ────────────────────────────────────────────────────────────

@router.get("/permissions", response_model=List[PermissionResponse])
def list_permissions(db: Session = Depends(get_db), _: User = Depends(get_current_superuser)):
    return crud_permission.get_multi(db)


@router.post("/permissions", response_model=PermissionResponse)
def create_permission(perm_in: PermissionCreate, db: Session = Depends(get_db), _: User = Depends(get_current_superuser)):
    existing = crud_permission.get_by_code(db, code=perm_in.code)
    if existing:
        raise HTTPException(status_code=400, detail="Code de permission déjà utilisé")
    return crud_permission.create(db, obj_in=perm_in)


# ─── Rôles ──────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[RoleResponse])
def list_roles(db: Session = Depends(get_db), _: User = Depends(get_current_superuser)):
    return crud_role.get_multi(db)


@router.post("/", response_model=RoleResponse)
def create_role(role_in: RoleCreate, db: Session = Depends(get_db), _: User = Depends(get_current_superuser)):
    if crud_role.get_by_name(db, name=role_in.name):
        raise HTTPException(status_code=400, detail="Nom de rôle déjà utilisé")
    return crud_role.create_with_permissions(
        db, name=role_in.name, description=role_in.description, permission_ids=role_in.permission_ids
    )


@router.get("/{role_id}", response_model=RoleResponse)
def get_role(role_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_superuser)):
    role = crud_role.get(db, id=role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Rôle non trouvé")
    return role


@router.put("/{role_id}", response_model=RoleResponse)
def update_role(role_id: int, role_in: RoleUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_superuser)):
    role = crud_role.get(db, id=role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Rôle non trouvé")
    if role_in.name:
        role.name = role_in.name
    if role_in.description is not None:
        role.description = role_in.description
    if role_in.permission_ids is not None:
        crud_role.update_permissions(db, role=role, permission_ids=role_in.permission_ids)
    else:
        from app.db.session import SessionLocal
        db.commit()
        db.refresh(role)
    return role


@router.delete("/{role_id}")
def delete_role(role_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_superuser)):
    role = crud_role.get(db, id=role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Rôle non trouvé")
    crud_role.remove(db, id=role_id)
    return {"message": "Rôle supprimé"}
