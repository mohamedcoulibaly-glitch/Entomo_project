from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class CampagneBase(BaseModel):
    nom: str
    description: Optional[str] = None
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    type_campagne: Optional[str] = "collecte"
    budget: Optional[float] = None
    responsable: Optional[str] = None
    notes: Optional[str] = None
    region: Optional[str] = None

class CampagneCreate(CampagneBase):
    pass

class CampagneUpdate(BaseModel):
    nom: Optional[str] = None
    description: Optional[str] = None
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    type_campagne: Optional[str] = None
    budget: Optional[float] = None
    responsable: Optional[str] = None
    notes: Optional[str] = None
    region: Optional[str] = None
    statut: Optional[str] = None

class CampagneResponse(CampagneBase):
    id: int
    statut: str
    actif: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config: from_attributes = True
