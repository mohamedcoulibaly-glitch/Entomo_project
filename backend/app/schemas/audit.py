from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class AuditLogBase(BaseModel):
    action: str
    module: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    details: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    utilisateur_id: int
    adresse_ip: Optional[str] = None

class AuditLogResponse(AuditLogBase):
    id: int
    utilisateur_id: int
    adresse_ip: Optional[str] = None
    created_at: Optional[datetime] = None
    class Config: from_attributes = True
