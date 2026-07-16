from typing import Optional
from pydantic import BaseModel
from app.schemas.base import BaseSchema


class LangueBase(BaseModel):
    code: str
    nom: str
    fichier_traduction: Optional[str] = None
    date_format: str = "DD/MM/YYYY"
    timezone: str = "Africa/Dakar"
    active: bool = False


class LangueCreate(LangueBase):
    pass


class LangueUpdate(BaseModel):
    code: Optional[str] = None
    nom: Optional[str] = None
    fichier_traduction: Optional[str] = None
    date_format: Optional[str] = None
    timezone: Optional[str] = None
    active: Optional[bool] = None


class LangueResponse(BaseSchema, LangueBase):
    pass


class LangueFormatUpdate(BaseModel):
    date_format: str = "DD/MM/YYYY"
    timezone: str = "Africa/Dakar"
