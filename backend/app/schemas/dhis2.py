from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.schemas.base import BaseSchema


class DHIS2MappingBase(BaseModel):
    indicateur_local: str
    element_dhis2: str
    type_donnee: Optional[str] = None
    actif: bool = True


class DHIS2MappingCreate(DHIS2MappingBase):
    config_id: Optional[int] = None


class DHIS2MappingResponse(BaseSchema, DHIS2MappingBase):
    config_id: int


class DHIS2ConfigBase(BaseModel):
    nom: Optional[str] = "Configuration principale"
    url: str
    username: Optional[str] = None
    org_unit: Optional[str] = None
    data_set: Optional[str] = None
    periode: Optional[str] = None
    actif: bool = True


class DHIS2ConfigCreate(DHIS2ConfigBase):
    password: str   # mot de passe en clair à l'entrée, hashé avant stockage


class DHIS2ConfigUpdate(BaseModel):
    nom: Optional[str] = None
    url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    org_unit: Optional[str] = None
    data_set: Optional[str] = None
    periode: Optional[str] = None
    actif: Optional[bool] = None


class DHIS2ConfigResponse(BaseSchema, DHIS2ConfigBase):
    mappings: List[DHIS2MappingResponse] = []


class DHIS2SyncResponse(BaseSchema):
    config_id: int
    date_sync: datetime
    statut: str
    nb_enregistrements: int
    message: Optional[str] = None
    utilisateur_id: Optional[int] = None


class DHIS2SyncTrigger(BaseModel):
    config_id: int
    periode: Optional[str] = None
    password: Optional[str] = None


class DHIS2TestConnectionRequest(BaseModel):
    config_id: int
    password: Optional[str] = None


class DHIS2TestConnectionResponse(BaseModel):
    success: bool
    message: str
    system_info: Optional[dict] = None


class DHIS2PendingCapture(BaseModel):
    id: int
    type: str
    code: str
    statut: str
    espece: Optional[str] = None
    site_nom: Optional[str] = None
    nombre_individus: Optional[int] = None
    date_capture: Optional[datetime] = None
    modified_at: Optional[datetime] = None
