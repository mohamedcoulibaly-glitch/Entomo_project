from sqlalchemy import Column, String, Text, Integer, Float, Boolean
from app.models.base import BaseModel


class Indicateur(BaseModel):
    """Indicateurs de rapport OMS - configuration des formules et seuils."""
    __tablename__ = "indicateurs"

    nom = Column(String(200), nullable=False)
    description = Column(Text)
    formule = Column(String(500))
    numerateur = Column(String(200))
    denominateur = Column(String(200))
    unite = Column(String(50))
    seuil_bas = Column(Float, default=10)
    seuil_moyen = Column(Float, default=50)
    seuil_eleve = Column(Float, default=50)
    notifications_actives = Column(Boolean, default=True)
    statut = Column(String(50), default="configure")
