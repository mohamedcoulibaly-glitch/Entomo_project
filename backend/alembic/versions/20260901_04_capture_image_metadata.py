"""Add image_metadata JSON column to captures for image ML analysis."""

from alembic import op
import sqlalchemy as sa

revision = "20260901_04"
down_revision = "20260901_03"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("captures"):
        columns = {column["name"] for column in inspector.get_columns("captures")}
        if "image_metadata" not in columns:
            with op.batch_alter_table("captures") as batch:
                batch.add_column(sa.Column("image_metadata", sa.JSON(), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("captures") and "image_metadata" in {
        column["name"] for column in inspector.get_columns("captures")
    }:
        with op.batch_alter_table("captures") as batch:
            batch.drop_column("image_metadata")
