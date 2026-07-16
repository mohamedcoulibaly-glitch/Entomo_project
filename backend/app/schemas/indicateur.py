from typing import Optional
from pydantic import BaseModel
from app.schemas.base import BaseSchema


class IndicateurBase(BaseModel):
    nom: str
    description: Optional[str] = None
    formule: Optional[str] = None
    numerateur: Optional[str] = None
    denominateur: Optional[str] = None
    unite: Optional[str] = None
    seuil_bas: float = 10
    seuil_moyen: float = 50
    seuil_eleve: float = 50
    notifications_actives: bool = True
    statut: str = "configure"


class IndicateurCreate(IndicateurBase):
    pass


class IndicateurUpdate(BaseModel):
    nom: Optional[str] = None
    description: Optional[str] = None
    formule: Optional[str] = None
    numerateur: Optional[str] = None
    denominateur: Optional[str] = None
    unite: Optional[str] = None
    seuil_bas: Optional[float] = None
    seuil_moyen: Optional[float] = None
    seuil_eleve: Optional[float] = None
    notifications_actives: Optional[bool] = None
    statut: Optional[str] = None


class IndicateurResponse(BaseSchema, IndicateurBase):
    pass
