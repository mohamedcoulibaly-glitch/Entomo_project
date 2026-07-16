from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Float, Text, Boolean, Table
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Capture(BaseModel):
    __tablename__ = "captures"

    site_id = Column(Integer, ForeignKey("sites_sentinelles.id", ondelete="CASCADE"), nullable=False)
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
    ml_model_id = Column(Integer, ForeignKey("ml_models.id", ondelete="SET NULL"))

    # Workflow validation
    statut = Column(String(50), default="a_valider")  # a_valider / valide / corrige / rejete
    valide = Column(Boolean, default=False)
    utilisateur_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))   # agent terrain
    valideur_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))      # validateur labo

    # Relationships
    site = relationship("SiteSentinelle", back_populates="captures", foreign_keys=[site_id])
    ml_model = relationship("MLModel")
    utilisateur = relationship("User", foreign_keys=[utilisateur_id], back_populates="captures")
    valideur = relationship("User", foreign_keys=[valideur_id])

    @property
    def identification_ia(self):
        return self.espece

    @identification_ia.setter
    def identification_ia(self, value):
        self.espece = value

    @property
    def confiance(self):
        return self.confidence_ia

    @confiance.setter
    def confiance(self, value):
        self.confidence_ia = value

