from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.base import BaseSchema


class SupportTicketCreate(BaseModel):
    sujet: str = Field(min_length=3, max_length=200)
    categorie: str = Field(default="assistance", max_length=80)
    priorite: str = Field(default="normale", pattern="^(basse|normale|haute|critique)$")
    message: str = Field(min_length=10, max_length=5000)


class SupportTicketUpdate(BaseModel):
    statut: Optional[str] = Field(default=None, pattern="^(ouvert|en_cours|resolu|ferme)$")
    reponse: Optional[str] = Field(default=None, max_length=5000)


class SupportTicketResponse(BaseSchema):
    utilisateur_id: int
    sujet: str
    categorie: str
    priorite: str
    message: str
    statut: str
    reponse: Optional[str] = None
