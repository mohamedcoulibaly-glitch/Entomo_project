from datetime import datetime, timezone
import json
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.crud.user import crud_user
from app.core.security import create_access_token
from app.core.deps import get_current_active_user
from app.core.permissions import permissions_for_user
from app.models.user import User
from app.models.role import Role
from app.schemas.user import Token, UserResponse
from app.models.audit_log import AuditLog
from app.models.reference import ReferenceData
from app.services.audit_service import audit_service
from app.core.rate_limit import check_login_allowed, record_failed_login, reset_login_attempts

router = APIRouter()


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Authentification — retourne un token JWT Bearer."""
    if not form_data.username.strip() or not form_data.password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Nom d'utilisateur et mot de passe requis",
        )
    client_key = _client_ip(request) or form_data.username
    if not check_login_allowed(client_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Trop de tentatives de connexion. Réessayez dans une minute.",
        )
    user = crud_user.authenticate(db, username=form_data.username, password=form_data.password)
    if not user:
        record_failed_login(client_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nom d'utilisateur ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        record_failed_login(client_key)
        raise HTTPException(status_code=400, detail="Compte désactivé")
    reset_login_attempts(client_key)
    user.last_login = datetime.utcnow()
    db.commit()
    audit_service.log(
        db,
        action="login",
        utilisateur_id=user.id,
        module="auth",
        details={"username": user.username},
        adresse_ip=_client_ip(request),
    )
    token = create_access_token(data={"sub": user.username, "user_id": user.id})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retourne le profil de l'utilisateur connecté avec ses permissions."""
    user = (
        db.query(User)
        .options(joinedload(User.role).joinedload(Role.permissions))
        .filter(User.id == current_user.id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    payload = UserResponse.model_validate(user).model_dump()
    payload["permissions"] = permissions_for_user(user)
    return payload


@router.put("/me")
def update_profile(profile_in: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Mettre à jour son propre profil."""
    allowed_fields = {"full_name", "email", "telephone", "etablissement", "region", "district"}
    update_data = {k: v for k, v in profile_in.items() if k in allowed_fields and v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucun champ valide à mettre à jour")
    for field, value in update_data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/password")
def change_password(passwords: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Changer son mot de passe."""
    from app.core.security import verify_password, get_password_hash
    old = passwords.get("old_password")
    new = passwords.get("new_password")
    if not old or not new:
        raise HTTPException(status_code=400, detail="Ancien et nouveau mot de passe requis")
    if not verify_password(old, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")
    if len(new) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit faire au moins 6 caractères")
    current_user.hashed_password = get_password_hash(new)
    db.commit()
    return {"message": "Mot de passe changé avec succès"}


@router.get("/check-session")
def check_session(current_user: User = Depends(get_current_active_user)):
    """Vérifie si la session est toujours valide. Retourne l'utilisateur."""
    return current_user


@router.get("/me/stats")
def get_my_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Statistiques personnelles de l'utilisateur connecté."""
    from app.models.capture import Capture
    from app.models.intervention import Intervention
    from app.models.report import Rapport
    total_captures = db.query(Capture).filter(Capture.utilisateur_id == current_user.id).count()
    captures_validees = db.query(Capture).filter(Capture.utilisateur_id == current_user.id, Capture.statut == "valide").count()
    total_interventions = db.query(Intervention).filter(Intervention.utilisateur_id == current_user.id).count()
    total_rapports = db.query(Rapport).filter(Rapport.utilisateur_id == current_user.id).count()
    return {
        "total_captures": total_captures,
        "captures_validees": captures_validees,
        "total_interventions": total_interventions,
        "total_rapports": total_rapports,
    }


@router.get("/me/activity")
def get_my_activity(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    logs = db.query(AuditLog).filter(AuditLog.utilisateur_id == current_user.id).order_by(
        AuditLog.created_at.desc()
    ).limit(50).all()
    return [{
        "id": log.id,
        "action": log.action,
        "description": log.details or log.action,
        "module": log.module,
        "date": log.created_at,
        "icon": "history",
    } for log in logs]


@router.get("/me/preferences")
def get_my_preferences(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    item = db.query(ReferenceData).filter(
        ReferenceData.category == "user_preferences",
        ReferenceData.code == str(current_user.id),
    ).first()
    if not item or not item.metadata_json:
        return {}
    try:
        return json.loads(item.metadata_json)
    except json.JSONDecodeError:
        return {}


@router.put("/me/preferences")
def update_my_preferences(preferences: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    allowed = {"theme", "lang", "notif_email", "notif_inapp", "notif_critique"}
    clean = {key: value for key, value in preferences.items() if key in allowed}
    item = db.query(ReferenceData).filter(
        ReferenceData.category == "user_preferences",
        ReferenceData.code == str(current_user.id),
    ).first()
    if not item:
        item = ReferenceData(category="user_preferences", code=str(current_user.id), label=current_user.username)
        db.add(item)
    item.metadata_json = json.dumps(clean, ensure_ascii=False)
    db.commit()
    return clean


@router.post("/logout-all")
def logout_all(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    now = datetime.now(timezone.utc).isoformat()
    item = db.query(ReferenceData).filter(
        ReferenceData.category == "session_revocation",
        ReferenceData.code == str(current_user.id),
    ).first()
    if not item:
        item = ReferenceData(category="session_revocation", code=str(current_user.id), label=now)
        db.add(item)
    else:
        item.label = now
    db.commit()
    audit_service.log_for_user(
        db,
        current_user,
        action="logout_all",
        module="auth",
        adresse_ip=_client_ip(request),
    )
    return {"message": "Toutes les sessions ont été révoquées"}
