"""Schéma initial pour bases PostgreSQL vierges."""

from alembic import op
import sqlalchemy as sa

from app.db.session import Base
from app.models import *  # noqa: F401, F403

revision = "20260901_00"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    inspector = sa.inspect(bind)
    if inspector.get_table_names():
        return
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    Base.metadata.drop_all(bind=bind)
