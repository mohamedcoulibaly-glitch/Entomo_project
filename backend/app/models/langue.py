from sqlalchemy import Column, String, Text, Boolean
from app.models.base import BaseModel


class Langue(BaseModel):
    __tablename__ = "langues"

    code = Column(String(10), unique=True, index=True, nullable=False)
    nom = Column(String(100), nullable=False)
    fichier_traduction = Column(String(500))
    date_format = Column(String(20), default="DD/MM/YYYY")
    timezone = Column(String(50), default="Africa/Dakar")
    active = Column(Boolean, default=False)
