"""Ajoute next_retry_at à offline_queue pour backoff."""

from alembic import op
import sqlalchemy as sa

revision = "20260901_05_offline_queue_retry"
down_revision = "20260901_04_capture_image_metadata"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "offline_queue",
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("offline_queue", "next_retry_at")
