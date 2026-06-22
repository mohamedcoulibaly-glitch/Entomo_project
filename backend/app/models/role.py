from sqlalchemy import Column, String, Text, Integer, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

# Table d'association Role ↔ Permission
role_permission = Table(
    "role_permission",
    BaseModel.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE")),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE")),
)


class Role(BaseModel):
    __tablename__ = "roles"

    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text)
    is_system = Column(String(10), default="non")  # rôles système non supprimables

    users = relationship("User", back_populates="role")
    permissions = relationship("Permission", secondary=role_permission, back_populates="roles")


class Permission(BaseModel):
    """Granularité : module × action (voir/créer/modifier/valider/exporter)."""
    __tablename__ = "permissions"

    name = Column(String(200), unique=True, index=True, nullable=False)
    code = Column(String(200), unique=True, index=True, nullable=False)
    module = Column(String(100))        # captures, sites, datasets, modeles, rapports, admin…
    action = Column(String(50))         # voir, creer, modifier, valider, exporter, supprimer
    description = Column(Text)

    roles = relationship("Role", secondary=role_permission, back_populates="permissions")
