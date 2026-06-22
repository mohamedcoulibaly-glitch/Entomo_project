from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.user import crud_user
from app.core.deps import get_current_active_user, get_current_superuser
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    region: Optional[str] = Query(None),
    role_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Liste des utilisateurs avec filtres optionnels."""
    query = db.query(User)
    if region:
        query = query.filter(User.region == region)
    if role_id:
        query = query.filter(User.role_id == role_id)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    return query.offset(skip).limit(limit).all()


@router.post("/", response_model=UserResponse)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Créer un nouvel utilisateur (superuser requis)."""
    if crud_user.get_by_email(db, email=user_in.email):
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    if crud_user.get_by_username(db, username=user_in.username):
        raise HTTPException(status_code=400, detail="Nom d'utilisateur déjà utilisé")
    return crud_user.create(db, obj_in=user_in)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Mettre à jour un utilisateur (soi-même ou superuser)."""
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if user.id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Action non autorisée")
    return crud_user.update(db, db_obj=user, obj_in=user_in)


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    crud_user.remove(db, id=user_id)
    return {"message": "Utilisateur supprimé"}
