from sqlalchemy import Column, ForeignKey, Integer, String, Text

from app.models.base import BaseModel


class DataImport(BaseModel):
    """Trace persistante d'un import de données effectué depuis l'interface."""

    __tablename__ = "data_imports"

    filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)
    statut = Column(String(30), nullable=False, default="en_cours")
    total = Column(Integer, nullable=False, default=0)
    imported = Column(Integer, nullable=False, default=0)
    rejected = Column(Integer, nullable=False, default=0)
    errors_json = Column(Text)
    utilisateur_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
