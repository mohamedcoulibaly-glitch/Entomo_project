from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime
from app.models.base import BaseModel

class AuditLog(BaseModel):
    __tablename__ = "audit_logs"
    utilisateur_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(200), nullable=False)
    module = Column(String(100))
    resource_type = Column(String(100))
    resource_id = Column(Integer)
    details = Column(Text)
    adresse_ip = Column(String(50))
