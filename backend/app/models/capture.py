from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Float, Text, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Capture(BaseModel):
    __tablename__ = "captures"

    site_id = Column(Integer, ForeignKey("sites_sentinelles.id"), nullable=False)
    date_capture = Column(DateTime, nullable=False)
    espece = Column(String(200), nullable=False)
    espece_corrigee = Column(String(200))           # correction humaine post-IA
    nombre_individus = Column(Integer, default=1)
    sexe = Column(String(10))                       # M / F / Indéterminé
    stade = Column(String(50))                      # adulte, larve, nymphe
    methode_capture = Column(String(100))            # piège lumineux, CDC, aspiration…
    temperature = Column(Float)
    humidite = Column(Float)
    notes = Column(Text)

    # Fichiers médias
    image_path = Column(String(500))
    audio_path = Column(String(500))

    # Identification IA
    confidence_ia = Column(Float)                   # score 0-1
    ml_model_id = Column(Integer, ForeignKey("ml_models.id"))

    # Workflow validation
    statut = Column(String(50), default="a_valider")  # a_valider / valide / corrige / rejete
    valide = Column(Boolean, default=False)
    utilisateur_id = Column(Integer, ForeignKey("users.id"))   # agent terrain
    valideur_id = Column(Integer, ForeignKey("users.id"))      # validateur labo

    site = relationship("SiteSentinelle", back_populates="captures")
    ml_model = relationship("MLModel")
