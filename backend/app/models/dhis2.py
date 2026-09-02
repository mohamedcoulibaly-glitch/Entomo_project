from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class DHIS2Config(BaseModel):
    """Configuration de la connexion DHIS2."""
    __tablename__ = "dhis2_config"

    nom = Column(String(200), default="Configuration principale")
    url = Column(String(500), nullable=False)
    username = Column(String(200))
    hashed_password = Column(String(500))       # mot de passe hashé, jamais en clair
    credential_enc = Column(Text)               # mot de passe chiffré pour l'API DHIS2
    org_unit = Column(String(200))
    data_set = Column(String(200))
    periode = Column(String(50))                # hebdomadaire, mensuel…
    actif = Column(Boolean, default=True)

    mappings = relationship("DHIS2Mapping", back_populates="config")
    syncs = relationship("DHIS2Sync", back_populates="config")


class DHIS2Mapping(BaseModel):
    """Règles de correspondance indicateur local → élément DHIS2."""
    __tablename__ = "dhis2_mappings"

    config_id = Column(Integer, ForeignKey("dhis2_config.id"), nullable=False)
    indicateur_local = Column(String(200), nullable=False)   # nom dans notre système
    element_dhis2 = Column(String(200), nullable=False)      # ID ou nom DHIS2
    type_donnee = Column(String(100))                        # nombre, pourcentage, taux…
    actif = Column(Boolean, default=True)

    config = relationship("DHIS2Config", back_populates="mappings")


class DHIS2Sync(BaseModel):
    """Historique des synchronisations DHIS2."""
    __tablename__ = "dhis2_syncs"

    config_id = Column(Integer, ForeignKey("dhis2_config.id"), nullable=False)
    date_sync = Column(DateTime, nullable=False)
    statut = Column(String(50), default="en_attente")  # succes / echec / en_cours
    nb_enregistrements = Column(Integer, default=0)
    message = Column(Text)
    utilisateur_id = Column(Integer, ForeignKey("users.id"))

    config = relationship("DHIS2Config", back_populates="syncs")
