from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.base import BaseSchema


class MLModelBase(BaseModel):
    nom: str
    version: Optional[str] = None
    type_modele: Optional[str] = None
    architecture: Optional[str] = None
    description: Optional[str] = None
    chemin: Optional[str] = None
    precision: Optional[float] = None
    rappel: Optional[float] = None
    f1_score: Optional[float] = None
    taille_mb: Optional[float] = None
    contexte_deploiement: Optional[str] = None
    actif: bool = True
    deploye: bool = False
    dataset_id: Optional[int] = None


class MLModelCreate(MLModelBase):
    pass


class MLModelUpdate(BaseModel):
    nom: Optional[str] = None
    version: Optional[str] = None
    description: Optional[str] = None
    precision: Optional[float] = None
    rappel: Optional[float] = None
    f1_score: Optional[float] = None
    actif: Optional[bool] = None
    deploye: Optional[bool] = None
    contexte_deploiement: Optional[str] = None
    type_modele: Optional[str] = None
    architecture: Optional[str] = None
    chemin: Optional[str] = None
    taille_mb: Optional[float] = None
    dataset_id: Optional[int] = None


class MLModelResponse(BaseSchema, MLModelBase):
    pass


class RiskModelBase(BaseModel):
    nom: str
    version: Optional[str] = None
    algorithme: Optional[str] = None
    description: Optional[str] = None
    chemin: Optional[str] = None
    precision: Optional[float] = None
    f1_score: Optional[float] = None
    parametres: Optional[str] = None
    donnees_entree: Optional[str] = None
    actif: bool = True
    deploye: bool = False


class RiskModelCreate(RiskModelBase):
    pass


class RiskModelUpdate(BaseModel):
    nom: Optional[str] = None
    algorithme: Optional[str] = None
    description: Optional[str] = None
    parametres: Optional[str] = None
    donnees_entree: Optional[str] = None
    actif: Optional[bool] = None
    deploye: Optional[bool] = None


class RiskModelResponse(BaseSchema, RiskModelBase):
    pass


class ModelPipelineBase(BaseModel):
    nom: str
    type_pipeline: Optional[str] = None
    statut: str = "en_attente"
    ml_model_id: Optional[int] = None
    progression: int = Field(default=0, ge=0, le=100)
    logs: Optional[str] = None
    utilisateur_id: Optional[int] = None


class ModelPipelineCreate(ModelPipelineBase):
    pass


class ModelPipelineUpdate(BaseModel):
    nom: Optional[str] = None
    type_pipeline: Optional[str] = None
    statut: Optional[str] = None
    ml_model_id: Optional[int] = None
    progression: Optional[int] = Field(default=None, ge=0, le=100)
    logs: Optional[str] = None
    utilisateur_id: Optional[int] = None


class ModelPipelineResponse(BaseSchema, ModelPipelineBase):
    pass
