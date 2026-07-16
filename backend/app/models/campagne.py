from sqlalchemy import Column, String, Text, Integer, DateTime, Boolean, Float, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Campagne(BaseModel):
    __tablename__ = "campagnes"
    nom = Column(String(200), nullable=False)
    description = Column(Text)
    date_debut = Column(DateTime)
    date_fin = Column(DateTime)
    statut = Column(String(50), default="planifiee")  # planifiee, en_cours, terminee, annulee
    type_campagne = Column(String(100))  # pulverisation, larvicide, sensibilisation, collecte
    budget = Column(Float)
    responsable = Column(String(200))
    notes = Column(Text)
    region = Column(String(100))
    utilisateur_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    actif = Column(Boolean, default=True)

    # Relationships
    utilisateur = relationship("User", back_populates="campagnes")
