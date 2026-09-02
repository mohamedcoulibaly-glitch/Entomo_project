"""Add the campaign owner column to legacy databases."""

from alembic import op
import sqlalchemy as sa

revision = "20260706_01"
down_revision = "20260901_00"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("campagnes"):
        columns = {column["name"] for column in inspector.get_columns("campagnes")}
        if "utilisateur_id" not in columns:
            with op.batch_alter_table("campagnes") as batch:
                batch.add_column(sa.Column("utilisateur_id", sa.Integer(), nullable=True))
                batch.create_foreign_key("fk_campagnes_utilisateur", "users", ["utilisateur_id"], ["id"], ondelete="SET NULL")


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("campagnes") and "utilisateur_id" in {column["name"] for column in inspector.get_columns("campagnes")}:
        with op.batch_alter_table("campagnes") as batch:
            batch.drop_constraint("fk_campagnes_utilisateur", type_="foreignkey")
            batch.drop_column("utilisateur_id")

