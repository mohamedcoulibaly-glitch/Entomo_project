from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.schemas.base import BaseSchema


class RapportProgrammeBase(BaseModel):
    recurrence: Optional[str] = None
    heure_envoi: Optional[str] = None
    destinataires: Optional[str] = None  # JSON liste d'emails
    actif: bool = True


class RapportProgrammeCreate(RapportProgrammeBase):
    rapport_id: Optional[int] = None


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
    statut: str = "brouillon"
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
    statut: Optional[str] = None


class RapportResponse(BaseSchema, RapportBase):
    date_generation: Optional[datetime] = None
    programmations: List[RapportProgrammeResponse] = []


class RapportGenerationRequest(BaseModel):
    titre: str = Field(min_length=3, max_length=200)
    type: str = "personnalise"
    format_fichier: str = "pdf"
    indicateurs: List[str] = []
    region: Optional[str] = None
    district: Optional[str] = None
    periode_debut: Optional[datetime] = None
    periode_fin: Optional[datetime] = None


class RapportSubmissionRequest(BaseModel):
    email: EmailStr
    commentaire: Optional[str] = None
