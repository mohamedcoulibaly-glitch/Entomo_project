from sqlalchemy import Column, String, Text, Float, Boolean, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class MLModel(BaseModel):
    """Modèles d'identification visuelle/audio (VGG16, YOLO, ResNet, SSD…)."""
    __tablename__ = "ml_models"

    nom = Column(String(200), nullable=False)
    version = Column(String(50))
    type_modele = Column(String(100))           # classification, détection, segmentation
    architecture = Column(String(100))           # VGG16, YOLO, ResNet50, SSD…
    description = Column(Text)
    chemin = Column(String(500))
    precision = Column(Float)                    # accuracy
    rappel = Column(Float)                       # recall
    f1_score = Column(Float)
    taille_mb = Column(Float)
    contexte_deploiement = Column(String(100))   # serveur_national / passerelle_locale
    actif = Column(Boolean, default=True)
    deploye = Column(Boolean, default=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))

    dataset = relationship("Dataset")


class RiskModel(BaseModel):
    """Modèles de prédiction du risque épidémiologique (XGBoost, LightGBM, RNN…)."""
    __tablename__ = "risk_models"

    nom = Column(String(200), nullable=False)
    version = Column(String(50))
    algorithme = Column(String(100))             # xgboost, lightgbm, rnn, random_forest
    description = Column(Text)
    chemin = Column(String(500))
    precision = Column(Float)
    f1_score = Column(Float)
    parametres = Column(Text)                    # JSON sérialisé des hyperparamètres
    donnees_entree = Column(Text)                # JSON liste des features utilisées
    actif = Column(Boolean, default=True)
    deploye = Column(Boolean, default=False)


class ModelPipeline(BaseModel):
    """Suivi des pipelines d'entraînement ML."""
    __tablename__ = "model_pipelines"

    nom = Column(String(200), nullable=False)
    statut = Column(String(50), default="en_attente")  # en_attente / en_cours / termine / erreur
    type_pipeline = Column(String(100))                # entrainement, évaluation, déploiement
    ml_model_id = Column(Integer, ForeignKey("ml_models.id"))
    progression = Column(Integer, default=0)           # 0-100 %
    logs = Column(Text)
    utilisateur_id = Column(Integer, ForeignKey("users.id"))

    ml_model = relationship("MLModel")
