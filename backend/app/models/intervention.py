from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime, Boolean, Float, Table
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Intervention(BaseModel):
    __tablename__ = "interventions"
    titre = Column(String(200), nullable=False)
    description = Column(Text)
    site_id = Column(Integer, ForeignKey("sites_sentinelles.id", ondelete="SET NULL"))
    date_prevue = Column(DateTime)
    date_realisee = Column(DateTime)
    statut = Column(String(50), default="planifiee")  # planifiee, en_cours, realisee, annulee
    type_intervention = Column(String(100))  # larvicide, pulverisation, sensibilisation, piégeage
    responsable = Column(String(200))
    notes = Column(Text)
    utilisateur_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    actif = Column(Boolean, default=True)

    # Relationships
    site = relationship("SiteSentinelle", back_populates="interventions", foreign_keys=[site_id])
    utilisateur = relationship("User", back_populates="interventions", foreign_keys=[utilisateur_id])
