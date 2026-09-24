"""Relie les interventions à une campagne (campagne_id)."""

from alembic import op
import sqlalchemy as sa

revision = "20260924_00_intervention_campagne_link"
down_revision = "20260901_05_offline_queue_retry"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "interventions",
        sa.Column("campagne_id", sa.Integer(), sa.ForeignKey("campagnes.id", ondelete="SET NULL"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("interventions", "campagne_id")
