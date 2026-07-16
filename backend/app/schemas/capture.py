from typing import Optional
from datetime import datetime
from pydantic import BaseModel, model_validator
from app.schemas.base import BaseSchema


class CaptureBase(BaseModel):
    site_id: int
    date_capture: datetime
    espece: Optional[str] = None
    identification_ia: Optional[str] = None
    confiance: Optional[float] = None
    espece_corrigee: Optional[str] = None
    nombre_individus: int = 1
    sexe: Optional[str] = None
    stade: Optional[str] = None
    methode_capture: Optional[str] = None
    temperature: Optional[float] = None
    humidite: Optional[float] = None
    notes: Optional[str] = None
    statut: str = "a_valider"

    @model_validator(mode='before')
    @classmethod
    def align_fields(cls, data):
        if isinstance(data, dict):
            if 'identification_ia' in data and not data.get('espece'):
                data['espece'] = data['identification_ia']
            elif 'espece' in data and not data.get('identification_ia'):
                data['identification_ia'] = data['espece']
        return data


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
    confiance: Optional[float] = None
    identification_ia: Optional[str] = None
    image_path: Optional[str] = None
    audio_path: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def align_fields(cls, data):
        if isinstance(data, dict):
            if 'confiance' in data and not data.get('confidence_ia'):
                data['confidence_ia'] = data['confiance']
            elif 'confidence_ia' in data and not data.get('confiance'):
                data['confiance'] = data['confidence_ia']
        return data


class CaptureResponse(BaseSchema, CaptureBase):
    valide: bool = False
    confidence_ia: Optional[float] = None
    confiance: Optional[float] = None
    identification_ia: Optional[str] = None
    ml_model_id: Optional[int] = None
    image_path: Optional[str] = None
    audio_path: Optional[str] = None
    utilisateur_id: Optional[int] = None
    valideur_id: Optional[int] = None
    
    @model_validator(mode='before')
    @classmethod
    def align_response_fields(cls, data):
        # Allow validation from SQLAlchemy object (has attr) or dict
        if not isinstance(data, dict):
            # For SQLAlchemy objects, the property getters on the model will return correct values
            return data
        if 'confidence_ia' in data and not data.get('confiance'):
            data['confiance'] = data['confidence_ia']
        elif 'confiance' in data and not data.get('confidence_ia'):
            data['confidence_ia'] = data['confiance']
        if 'espece' in data and not data.get('identification_ia'):
            data['identification_ia'] = data['espece']
        elif 'identification_ia' in data and not data.get('espece'):
            data['espece'] = data['identification_ia']
        return data


class CaptureValidate(BaseModel):
    statut: str  # valide / corrige / rejete
    espece_corrigee: Optional[str] = None
    notes: Optional[str] = None

