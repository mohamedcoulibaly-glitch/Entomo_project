from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.base import BaseSchema


class SiteActiviteBase(BaseModel):
    type_activite: str
    description: Optional[str] = None
    utilisateur_id: Optional[int] = None
    date_activite: datetime


class SiteActiviteCreate(SiteActiviteBase):
    site_id: Optional[int] = None


class SiteActiviteResponse(BaseSchema, SiteActiviteBase):
    site_id: int


class SiteSentinelleBase(BaseModel):
    nom: str
    code: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    zone_type: Optional[str] = None
    type_environnement: Optional[str] = None
    type_zone: Optional[str] = None
    environnement: Optional[str] = None
    responsable: Optional[str] = None
    contact: Optional[str] = None
    actif: bool = True


class SiteSentinelleCreate(SiteSentinelleBase):
    pass


class SiteSentinelleUpdate(BaseModel):
    nom: Optional[str] = None
    code: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    zone_type: Optional[str] = None
    type_environnement: Optional[str] = None
    type_zone: Optional[str] = None
    environnement: Optional[str] = None
    responsable: Optional[str] = None
    contact: Optional[str] = None
    actif: Optional[bool] = None


class SiteSentinelleResponse(BaseSchema, SiteSentinelleBase):
    activites: List[SiteActiviteResponse] = []
