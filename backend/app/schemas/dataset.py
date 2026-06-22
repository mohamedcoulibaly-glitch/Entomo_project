from typing import Optional, List
from pydantic import BaseModel
from app.schemas.base import BaseSchema


class AnnotationBase(BaseModel):
    label: str
    notes: Optional[str] = None
    chemin_fichier: Optional[str] = None
    utilisateur_id: Optional[int] = None


class AnnotationCreate(AnnotationBase):
    dataset_id: int


class AnnotationResponse(BaseSchema, AnnotationBase):
    dataset_id: int


class DatasetBase(BaseModel):
    nom: str
    description: Optional[str] = None
    chemin: Optional[str] = None
    taille: Optional[int] = None
    type: Optional[str] = None
    actif: bool = True
    utilisateur_id: Optional[int] = None


class DatasetCreate(DatasetBase):
    pass


class DatasetUpdate(BaseModel):
    nom: Optional[str] = None
    description: Optional[str] = None
    chemin: Optional[str] = None
    taille: Optional[int] = None
    type: Optional[str] = None
    actif: Optional[bool] = None


class DatasetResponse(BaseSchema, DatasetBase):
    annotations: List[AnnotationResponse] = []
