from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.schemas.base import BaseSchema


class RapportProgrammeBase(BaseModel):
    recurrence: Optional[str] = None
    heure_envoi: Optional[str] = None
    destinataires: Optional[str] = None  # JSON liste d'emails
    actif: bool = True


class RapportProgrammeCreate(RapportProgrammeBase):
    rapport_id: int


class RapportProgrammeResponse(BaseSchema, RapportProgrammeBase):
    rapport_id: int
    dernier_envoi: Optional[datetime] = None
    prochain_envoi: Optional[datetime] = None


class RapportBase(BaseModel):
    titre: str
    type: Optional[str] = None
    contenu: Optional[str] = None
    chemin_fichier: Optional[str] = None
    format_fichier: Optional[str] = None
    utilisateur_id: Optional[int] = None
    periode_debut: Optional[datetime] = None
    periode_fin: Optional[datetime] = None


class RapportCreate(RapportBase):
    pass


class RapportUpdate(BaseModel):
    titre: Optional[str] = None
    type: Optional[str] = None
    contenu: Optional[str] = None
    chemin_fichier: Optional[str] = None
    format_fichier: Optional[str] = None


class RapportResponse(BaseSchema, RapportBase):
    date_generation: Optional[datetime] = None
    programmations: List[RapportProgrammeResponse] = []
