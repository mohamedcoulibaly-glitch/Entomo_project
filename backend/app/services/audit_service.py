"""Service centralisé d'écriture des journaux d'audit."""

from __future__ import annotations

import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User


class AuditService:
    @staticmethod
    def log(
        db: Session,
        *,
        action: str,
        utilisateur_id: Optional[int] = None,
        module: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
        details: Optional[str | dict[str, Any]] = None,
        adresse_ip: Optional[str] = None,
    ) -> AuditLog:
        if isinstance(details, dict):
            details = json.dumps(details, ensure_ascii=False, default=str)

        entry = AuditLog(
            utilisateur_id=utilisateur_id,
            action=action,
            module=module,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            adresse_ip=adresse_ip,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def log_for_user(
        db: Session,
        user: User,
        *,
        action: str,
        module: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
        details: Optional[str | dict[str, Any]] = None,
        adresse_ip: Optional[str] = None,
    ) -> AuditLog:
        return AuditService.log(
            db,
            action=action,
            utilisateur_id=user.id,
            module=module,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            adresse_ip=adresse_ip,
        )


audit_service = AuditService()
