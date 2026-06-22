from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.schemas.base import BaseSchema


class CaptureBase(BaseModel):
    site_id: int
    date_capture: datetime
    espece: str
    espece_corrigee: Optional[str] = None
    nombre_individus: int = 1
    sexe: Optional[str] = None
    stade: Optional[str] = None
    methode_capture: Optional[str] = None
    temperature: Optional[float] = None
    humidite: Optional[float] = None
    notes: Optional[str] = None
    statut: str = "a_valider"


class CaptureCreate(CaptureBase):
    utilisateur_id: Optional[int] = None


class CaptureUpdate(BaseModel):
    espece_corrigee: Optional[str] = None
    nombre_individus: Optional[int] = None
    sexe: Optional[str] = None
    stade: Optional[str] = None
    methode_capture: Optional[str] = None
    temperature: Optional[float] = None
    humidite: Optional[float] = None
    notes: Optional[str] = None
    statut: Optional[str] = None
    valide: Optional[bool] = None
    valideur_id: Optional[int] = None
    ml_model_id: Optional[int] = None
    confidence_ia: Optional[float] = None
    image_path: Optional[str] = None
    audio_path: Optional[str] = None


class CaptureResponse(BaseSchema, CaptureBase):
    valide: bool = False
    confidence_ia: Optional[float] = None
    ml_model_id: Optional[int] = None
    image_path: Optional[str] = None
    audio_path: Optional[str] = None
    utilisateur_id: Optional[int] = None
    valideur_id: Optional[int] = None


class CaptureValidate(BaseModel):
    statut: str  # valide / corrige / rejete
    espece_corrigee: Optional[str] = None
    notes: Optional[str] = None
