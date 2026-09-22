"""Utilitaires de permissions granulaires (module × action)."""

from __future__ import annotations

from typing import Iterable, List, Optional, Union

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_active_user, oauth2_scheme_optional
from app.core.route_permissions import AUTH_ONLY, resolve_route_permission
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.role import Role
from app.models.user import User


def permissions_for_user(user: User) -> List[str]:
    if user.is_superuser:
        return ["admin"]
    if user.role and user.role.permissions:
        return sorted({perm.code for perm in user.role.permissions})
    return []


def user_has_permission(user: User, required: str | Iterable[str]) -> bool:
    if user.is_superuser:
        return True
    codes = set(permissions_for_user(user))
    if "admin" in codes:
        return True
    needed = {required} if isinstance(required, str) else set(required)
    return bool(codes & needed)


def _load_user_with_permissions(db: Session, user_id: int) -> Optional[User]:
    return (
        db.query(User)
        .options(joinedload(User.role).joinedload(Role.permissions))
        .filter(User.id == user_id)
        .first()
    )


def require_permission(*required: str):
    """Dépendance FastAPI : exige au moins une des permissions listées."""

    def dependency(current_user: User = Depends(get_current_active_user)) -> User:
        if not user_has_permission(current_user, list(required)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission requise : {', '.join(required)}",
            )
        return current_user

    return dependency


def enforce_route_access(
    request: Request,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme_optional),
) -> None:
    """Middleware de dépendance appliqué au routeur API — vérifie RBAC par route."""
    permission = resolve_route_permission(request.method, request.url.path)
    if permission is None:
        return

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = _load_user_with_permissions(db, int(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Utilisateur inactif",
        )

    if permission == AUTH_ONLY:
        return

    if not user_has_permission(user, permission):
        needed = permission if isinstance(permission, str) else " ou ".join(permission)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission refusée : {needed}",
        )
