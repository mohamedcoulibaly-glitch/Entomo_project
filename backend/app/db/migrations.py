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

    if inspector.has_table("captures"):
        capture_columns = {column["name"] for column in inspector.get_columns("captures")}
        if "audio_metadata" not in capture_columns:
            with engine.begin() as connection:
                connection.execute(text(
                    "ALTER TABLE captures ADD COLUMN audio_metadata JSON"
                ))

    if inspector.has_table("dhis2_config"):
        dhis2_columns = {column["name"] for column in inspector.get_columns("dhis2_config")}
        if "credential_enc" not in dhis2_columns:
            with engine.begin() as connection:
                connection.execute(text(
                    "ALTER TABLE dhis2_config ADD COLUMN credential_enc TEXT"
                ))

        # Réparer les configs seed créées avant l'introduction de credential_enc
        with engine.begin() as connection:
            rows = connection.execute(text(
                "SELECT id, url, username, credential_enc FROM dhis2_config "
                "WHERE credential_enc IS NULL OR credential_enc = ''"
            )).fetchall()
            if rows:
                from app.core.crypto import encrypt_secret
                for row in rows:
                    row_id, url, username, _ = row
                    if username and url and "dhis2.example.com" in str(url):
                        connection.execute(
                            text("UPDATE dhis2_config SET credential_enc = :enc WHERE id = :id"),
                            {"enc": encrypt_secret("DHIS2Api123!"), "id": row_id},
                        )

    if inspector.has_table("sync_preferences"):
        sync_columns = {column["name"] for column in inspector.get_columns("sync_preferences")}
        if "cache_expiry_hours" not in sync_columns:
            with engine.begin() as connection:
                connection.execute(text(
                    "ALTER TABLE sync_preferences ADD COLUMN cache_expiry_hours INTEGER NOT NULL DEFAULT 72"
                ))

    if inspector.has_table("offline_queue"):
        queue_columns = {column["name"] for column in inspector.get_columns("offline_queue")}
        if "client_id" not in queue_columns:
            with engine.begin() as connection:
                connection.execute(text(
                    "ALTER TABLE offline_queue ADD COLUMN client_id VARCHAR(64)"
                ))
        if "next_retry_at" not in queue_columns:
            with engine.begin() as connection:
                connection.execute(text(
                    "ALTER TABLE offline_queue ADD COLUMN next_retry_at DATETIME"
                ))

    if inspector.has_table("captures"):
        capture_columns = {column["name"] for column in inspector.get_columns("captures")}
        if "image_metadata" not in capture_columns:
            with engine.begin() as connection:
                connection.execute(text(
                    "ALTER TABLE captures ADD COLUMN image_metadata JSON"
                ))
