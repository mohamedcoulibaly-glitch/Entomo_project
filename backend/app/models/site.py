from sqlalchemy import Column, String, Float, Text, Boolean, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class SiteSentinelle(BaseModel):
    __tablename__ = "sites_sentinelles"

    nom = Column(String(200), nullable=False)
    code = Column(String(50), unique=True, index=True)
    region = Column(String(100), index=True)
    district = Column(String(100), index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    description = Column(Text)
    zone_type = Column(String(50))            # urbain / rural / périurbain
    type_environnement = Column(String(100))  # forêt, savane, zone humide…
    responsable = Column(String(200))
    contact = Column(String(200))
    actif = Column(Boolean, default=True)

    captures = relationship("Capture", back_populates="site")
    activites = relationship("SiteActivite", back_populates="site")


class SiteActivite(BaseModel):
    """Journal d'activité d'un site sentinelle (timeline UI)."""
    __tablename__ = "site_activites"

    site_id = Column(Integer, ForeignKey("sites_sentinelles.id"), nullable=False)
    type_activite = Column(String(100), nullable=False)  # capture, maintenance, visite…
    description = Column(Text)
    utilisateur_id = Column(Integer, ForeignKey("users.id"))
    date_activite = Column(DateTime, nullable=False)

    site = relationship("SiteSentinelle", back_populates="activites")
