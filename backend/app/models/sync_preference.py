from sqlalchemy import Boolean, Column, ForeignKey, Integer, Text

from app.models.base import BaseModel


class SyncPreference(BaseModel):
    """Préférences hors-ligne propres à chaque utilisateur."""

    __tablename__ = "sync_preferences"

    utilisateur_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    auto_sync = Column(Boolean, default=True, nullable=False)
    frequence = Column(Integer, default=60, nullable=False)
    stockage_max = Column(Integer, default=100, nullable=False)
    wifi_only = Column(Boolean, default=False, nullable=False)
    data_types = Column(Text, default='["new-captures","species-analysis","record-corrections"]', nullable=False)
    cache_expiry_hours = Column(Integer, default=72, nullable=False)
