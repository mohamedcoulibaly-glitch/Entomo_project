from sqlalchemy import create_engine, inspect, text

from app.db.migrations import ensure_schema_compatibility


def test_legacy_campaign_table_is_upgraded(tmp_path):
    database = tmp_path / "legacy.db"
    engine = create_engine(f"sqlite:///{database}")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY)"))
        connection.execute(text("CREATE TABLE campagnes (id INTEGER PRIMARY KEY, nom VARCHAR(200) NOT NULL)"))

    ensure_schema_compatibility(engine)
    ensure_schema_compatibility(engine)  # La migration doit être idempotente.

    columns = {column["name"] for column in inspect(engine).get_columns("campagnes")}
    assert "utilisateur_id" in columns

