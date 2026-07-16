from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime, Boolean
from app.models.base import BaseModel

class Notification(BaseModel):
    __tablename__ = "notifications"
    utilisateur_id = Column(Integer, ForeignKey("users.id"))
    titre = Column(String(200), nullable=False)
    message = Column(Text)
    type_notification = Column(String(50), default="info")  # info, warning, success, error, alerte
    module = Column(String(100))
    lien = Column(String(500))
    lu = Column(Boolean, default=False)
    date_lecture = Column(DateTime)
