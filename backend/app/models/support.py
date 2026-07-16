from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class SupportTicket(BaseModel):
    __tablename__ = "support_tickets"

    utilisateur_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sujet = Column(String(200), nullable=False)
    categorie = Column(String(80), nullable=False, default="assistance")
    priorite = Column(String(30), nullable=False, default="normale")
    message = Column(Text, nullable=False)
    statut = Column(String(30), nullable=False, default="ouvert")
    reponse = Column(Text)

    utilisateur = relationship("User")
