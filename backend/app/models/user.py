from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


# Table d'association User ↔ Notification (Many-to-many)
user_notification = Table(
    "user_notification",
    BaseModel.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("notification_id", Integer, ForeignKey("notifications.id", ondelete="CASCADE"), primary_key=True),
)


class User(BaseModel):
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200))
    etablissement = Column(String(200))
    region = Column(String(100))
    district = Column(String(100))
    telephone = Column(String(50))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"))
    last_login = Column(DateTime, nullable=True)

    # Relationships
    role = relationship("Role", back_populates="users")
    notifications = relationship("Notification", secondary=user_notification)
    notifications_sent = relationship("Notification", foreign_keys="Notification.utilisateur_id")
    audits = relationship("AuditLog")
    captures = relationship("Capture", foreign_keys="Capture.utilisateur_id", back_populates="utilisateur")
    interventions = relationship("Intervention", back_populates="utilisateur")
    campagnes = relationship("Campagne", back_populates="utilisateur")

