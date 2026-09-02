import os, sys
from pathlib import Path
from typing import Generator, Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Ensure backend is on path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Use a fixed path for test DB so cleanup is reliable
TEST_DB_PATH = os.path.join(str(Path(__file__).parent), "test_entomo.db")
TEST_DB_URL = f"sqlite:///{TEST_DB_PATH}"

os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["TESTING"] = "True"

from app.core.config import settings as original_settings
original_settings.DATABASE_URL = TEST_DB_URL

from app.db.session import Base, get_db
from main import app
from app.core.security import get_password_hash, create_access_token
from app.core.deps import get_current_user, get_current_active_user, get_current_superuser


test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def db():
    """Drop and recreate all tables, then open a session for seeding."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    session = TestSessionLocal()
    yield session
    session.close()
    test_engine.dispose()
    # Clean up DB file
    try:
        os.unlink(TEST_DB_PATH)
    except PermissionError:
        pass


@pytest.fixture(scope="session", autouse=True)
def seed_db(db: Session):
    from app.models.role import Role, Permission
    from app.models.user import User
    from app.models.site import SiteSentinelle
    from app.models.model import MLModel, RiskModel

    permissions_data = [
        ("captures:voir", "captures", "voir"),
        ("captures:creer", "captures", "creer"),
        ("captures:modifier", "captures", "modifier"),
        ("captures:valider", "captures", "valider"),
        ("captures:exporter", "captures", "exporter"),
        ("captures:supprimer", "captures", "supprimer"),
        ("sites:voir", "sites", "voir"),
        ("sites:creer", "sites", "creer"),
        ("sites:modifier", "sites", "modifier"),
        ("sites:supprimer", "sites", "supprimer"),
        ("users:voir", "users", "voir"),
        ("users:creer", "users", "creer"),
        ("users:modifier", "users", "modifier"),
        ("users:supprimer", "users", "supprimer"),
        ("roles:voir", "roles", "voir"),
        ("roles:creer", "roles", "creer"),
        ("roles:modifier", "roles", "modifier"),
        ("roles:supprimer", "roles", "supprimer"),
        ("rapports:voir", "rapports", "voir"),
        ("rapports:creer", "rapports", "creer"),
        ("rapports:supprimer", "rapports", "supprimer"),
        ("dashboard:voir", "dashboard", "voir"),
        ("dhis2:gestion", "dhis2", "gestion"),
        ("interventions:gestion", "interventions", "gestion"),
        ("campagnes:gestion", "campagnes", "gestion"),
        ("langues:gestion", "langues", "gestion"),
        ("notifications:gestion", "notifications", "gestion"),
        ("audit:voir", "audit", "voir"),
        ("reference:gestion", "reference", "gestion"),
        ("datasets:gestion", "datasets", "gestion"),
        ("modeles:gestion", "modeles", "gestion"),
        ("indicateurs:gestion", "indicateurs", "gestion"),
        ("sync:gestion", "sync", "gestion"),
        ("admin", "admin", "tout"),
    ]
    perms = {}
    for code, module, action in permissions_data:
        p = Permission(name=code, code=code, module=module, action=action)
        db.add(p)
        perms[code] = p
    db.flush()

    admin_role = Role(name="Super Administrateur", description="Accès complet", is_system=True)
    admin_role.permissions = list(perms.values())
    db.add(admin_role)

    labo_role = Role(name="Technicien Laboratoire", description="Validation des captures")
    labo_role.permissions = [perms[c] for c in [
        "captures:voir", "captures:creer", "captures:valider", "captures:modifier",
    ]]
    db.add(labo_role)

    user_role = Role(name="Utilisateur", description="Accès limité")
    user_role.permissions = [perms[c] for c in ["captures:voir", "sites:voir"]]
    db.add(user_role)
    db.flush()

    admin = User(
        email="admin@test.entomo.sn", username="admin",
        hashed_password=get_password_hash("Admin@2024"),
        full_name="Admin Test", region="Dakar",
        is_active=True, is_superuser=True, role_id=admin_role.id,
    )
    db.add(admin)
    labo = User(
        email="labo@test.entomo.sn", username="labo1",
        hashed_password=get_password_hash("Labo@2024"),
        full_name="Dr. Labo", region="Dakar", district="Pikine",
        is_active=True, role_id=labo_role.id,
    )
    db.add(labo)
    inactive = User(
        email="inactive@test.entomo.sn", username="inactive",
        hashed_password=get_password_hash("Inactive@2024"),
        full_name="Inactive User", region="Dakar",
        is_active=False, role_id=user_role.id,
    )
    db.add(inactive)
    limited = User(
        email="limited@test.entomo.sn", username="limited",
        hashed_password=get_password_hash("Limited@2024"),
        full_name="Limited User", region="Dakar",
        is_active=True, is_superuser=False, role_id=user_role.id,
    )
    db.add(limited)
    db.flush()

    sites = [
        SiteSentinelle(nom="Site Test 1", code="TST-001", region="Dakar", district="Dakar",
                       latitude=14.7, longitude=-17.4, zone_type="urbain", type_environnement="zone humide", actif=True),
        SiteSentinelle(nom="Site Test 2", code="TST-002", region="Thiès", district="Thiès",
                       latitude=14.8, longitude=-16.9, zone_type="rural", type_environnement="savane", actif=True),
    ]
    for s in sites:
        db.add(s)
    db.flush()

    ml = MLModel(nom="TestModel v1", version="1.0", type_modele="classification",
                 architecture="ResNet50", precision=0.95, rappel=0.93, f1_score=0.94,
                 taille_mb=98.3, actif=True, deploye=True)
    db.add(ml)
    risk = RiskModel(nom="TestRisk v1", version="1.0", algorithme="xgboost",
                     precision=0.88, f1_score=0.87, actif=True, deploye=True)
    db.add(risk)
    db.commit()

    seed_db._admin_id = admin.id
    seed_db._labo_id = labo.id
    seed_db._inactive_id = inactive.id
    seed_db._limited_id = limited.id
    seed_db._site1_id = sites[0].id
    seed_db._site2_id = sites[1].id
    seed_db._ml_model_id = ml.id
    seed_db._risk_model_id = risk.id

    yield

    # Cleanup test DB
    db.close()
    test_engine.dispose()
    try:
        os.unlink(TEST_DB_PATH)
    except PermissionError:
        pass


@pytest.fixture
def client() -> Generator:
    with TestClient(app) as c:
        yield c


@pytest.fixture
def admin_token_headers() -> Dict[str, str]:
    token = create_access_token({"user_id": seed_db._admin_id, "sub": "admin"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def labo_token_headers() -> Dict[str, str]:
    token = create_access_token({"user_id": seed_db._labo_id, "sub": "labo1"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def limited_token_headers() -> Dict[str, str]:
    """Utilisateur avec accès captures/sites lecture seule."""
    token = create_access_token({"user_id": seed_db._limited_id, "sub": "limited"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def inactive_token_headers() -> Dict[str, str]:
    token = create_access_token({"user_id": seed_db._inactive_id, "sub": "inactive"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_id() -> int:
    return seed_db._admin_id


@pytest.fixture
def labo_id() -> int:
    return seed_db._labo_id


@pytest.fixture
def site1_id() -> int:
    return seed_db._site1_id


@pytest.fixture
def site2_id() -> int:
    return seed_db._site2_id


@pytest.fixture
def ml_model_id() -> int:
    return seed_db._ml_model_id


@pytest.fixture
def risk_model_id() -> int:
    return seed_db._risk_model_id


def pytest_configure(config):
    config.addinivalue_line("markers", "dhis2_e2e: tests E2E contre instance DHIS2 Play réelle")
