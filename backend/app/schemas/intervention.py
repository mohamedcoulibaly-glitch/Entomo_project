from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class InterventionBase(BaseModel):
    titre: str
    description: Optional[str] = None
    site_id: Optional[int] = None
    date_prevue: Optional[datetime] = None
    type_intervention: Optional[str] = "pulverisation"
    responsable: Optional[str] = None
    notes: Optional[str] = None
    utilisateur_id: Optional[int] = None

class InterventionCreate(InterventionBase):
    pass

class InterventionUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    site_id: Optional[int] = None
    date_prevue: Optional[datetime] = None
    date_realisee: Optional[datetime] = None
    type_intervention: Optional[str] = None
    responsable: Optional[str] = None
    notes: Optional[str] = None
    statut: Optional[str] = None
    utilisateur_id: Optional[int] = None

class InterventionResponse(InterventionBase):
    id: int
    statut: str
    date_realisee: Optional[datetime] = None
    utilisateur_id: Optional[int] = None
    actif: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config: from_attributes = True
