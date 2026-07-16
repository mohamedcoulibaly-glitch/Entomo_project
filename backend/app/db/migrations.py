from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_schema_compatibility(engine: Engine) -> None:
    """Apply small, safe compatibility migrations before ORM queries run.

    Alembic remains the long-term migration mechanism. This guard exists for
    development databases created before Alembic was introduced.
    """
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    if not inspector.has_table("campagnes"):
        return

    columns = {column["name"] for column in inspector.get_columns("campagnes")}
    if "utilisateur_id" not in columns:
        with engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE campagnes ADD COLUMN utilisateur_id INTEGER REFERENCES users(id)"
            ))

    if inspector.has_table("sync_preferences"):
        sync_columns = {column["name"] for column in inspector.get_columns("sync_preferences")}
        if "data_types" not in sync_columns:
            with engine.begin() as connection:
                connection.execute(text(
                    "ALTER TABLE sync_preferences ADD COLUMN data_types TEXT NOT NULL "
                    "DEFAULT '[\"new-captures\",\"species-analysis\",\"record-corrections\"]'"
                ))
