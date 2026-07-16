from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.audit import crud_audit
from app.core.deps import get_current_active_user, get_current_superuser
from app.models.user import User
from app.schemas.audit import AuditLogResponse

router = APIRouter()

@router.get("/", response_model=List[AuditLogResponse])
def list_audit_logs(
    skip: int = 0, limit: int = 100,
    module: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser)
):
    if module: return crud_audit.get_by_module(db, module=module, skip=skip, limit=limit)
    return crud_audit.get_multi(db, skip=skip, limit=limit)

@router.get("/user/{user_id}", response_model=List[AuditLogResponse])
def get_user_audit_logs(user_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _: User = Depends(get_current_superuser)):
    return crud_audit.get_by_user(db, user_id=user_id, skip=skip, limit=limit)
