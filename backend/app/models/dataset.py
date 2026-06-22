from sqlalchemy import Column, String, Text, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Dataset(BaseModel):
    __tablename__ = "datasets"
    
    nom = Column(String(200), nullable=False)
    description = Column(Text)
    chemin = Column(String(500))
    taille = Column(Integer)
    type = Column(String(100))
    utilisateur_id = Column(Integer, ForeignKey("users.id"))
    actif = Column(Boolean, default=True)
    
    annotations = relationship("Annotation", back_populates="dataset")


class Annotation(BaseModel):
    __tablename__ = "annotations"
    
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    label = Column(String(200), nullable=False)
    notes = Column(Text)
    chemin_fichier = Column(String(500))
    utilisateur_id = Column(Integer, ForeignKey("users.id"))
    
    dataset = relationship("Dataset", back_populates="annotations")
