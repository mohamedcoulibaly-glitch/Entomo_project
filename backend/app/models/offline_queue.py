from sqlalchemy import Column, String, Integer, ForeignKey, Text, JSON, DateTime

from app.models.base import BaseModel


class OfflineQueueItem(BaseModel):
    """File d'attente de synchronisation hors-ligne."""

    __tablename__ = "offline_queue"

    utilisateur_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(Integer, nullable=True)
    client_id = Column(String(64), nullable=True, index=True)
    action = Column(String(50), nullable=False, default="sync")
    payload = Column(JSON, nullable=True)
    statut = Column(String(50), default="pending", nullable=False)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
