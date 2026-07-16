from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Rapport(BaseModel):
    """Rapports générés (OMS, PNLP, personnalisés)."""
    __tablename__ = "rapports"

    titre = Column(String(200), nullable=False)
    type = Column(String(100))                  # oms, pnlp, personnalise
    contenu = Column(Text)
    chemin_fichier = Column(String(500))
    format_fichier = Column(String(20))         # pdf, xlsx, csv
    statut = Column(String(50), default="brouillon")  # brouillon, en_cours, pret, genere, erreur
    utilisateur_id = Column(Integer, ForeignKey("users.id"))
    date_generation = Column(DateTime)
    periode_debut = Column(DateTime)
    periode_fin = Column(DateTime)

    programmations = relationship("RapportProgramme", back_populates="rapport")


class RapportProgramme(BaseModel):
    """Programmation automatique de génération et envoi d'un rapport."""
    __tablename__ = "rapports_programmes"

    rapport_id = Column(Integer, ForeignKey("rapports.id"))
    recurrence = Column(String(50))             # quotidien, hebdomadaire, mensuel
    heure_envoi = Column(String(10))            # HH:MM
    destinataires = Column(Text)                # JSON liste d'emails
    actif = Column(Boolean, default=True)
    dernier_envoi = Column(DateTime)
    prochain_envoi = Column(DateTime)

    rapport = relationship("Rapport", back_populates="programmations")
