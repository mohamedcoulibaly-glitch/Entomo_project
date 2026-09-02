"""Offline queue, DHIS2 credential encryption, sync cache expiry."""

from alembic import op
import sqlalchemy as sa

revision = "20260901_03"
down_revision = "20260901_02"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("dhis2_config"):
        columns = {column["name"] for column in inspector.get_columns("dhis2_config")}
        if "credential_enc" not in columns:
            with op.batch_alter_table("dhis2_config") as batch:
                batch.add_column(sa.Column("credential_enc", sa.Text(), nullable=True))

    if inspector.has_table("sync_preferences"):
        columns = {column["name"] for column in inspector.get_columns("sync_preferences")}
        if "cache_expiry_hours" not in columns:
            with op.batch_alter_table("sync_preferences") as batch:
                batch.add_column(sa.Column("cache_expiry_hours", sa.Integer(), nullable=False, server_default="72"))

    if not inspector.has_table("offline_queue"):
        op.create_table(
            "offline_queue",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.Column("utilisateur_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("resource_type", sa.String(length=100), nullable=False),
            sa.Column("resource_id", sa.Integer(), nullable=True),
            sa.Column("action", sa.String(length=50), nullable=False, server_default="sync"),
            sa.Column("payload", sa.JSON(), nullable=True),
            sa.Column("statut", sa.String(length=50), nullable=False, server_default="pending"),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        )
        op.create_index("ix_offline_queue_utilisateur_id", "offline_queue", ["utilisateur_id"])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("offline_queue"):
        op.drop_index("ix_offline_queue_utilisateur_id", table_name="offline_queue")
        op.drop_table("offline_queue")
    if inspector.has_table("sync_preferences") and "cache_expiry_hours" in {
        column["name"] for column in inspector.get_columns("sync_preferences")
    }:
        with op.batch_alter_table("sync_preferences") as batch:
            batch.drop_column("cache_expiry_hours")
    if inspector.has_table("dhis2_config") and "credential_enc" in {
        column["name"] for column in inspector.get_columns("dhis2_config")
    }:
        with op.batch_alter_table("dhis2_config") as batch:
            batch.drop_column("credential_enc")
