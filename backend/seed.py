"""
Script de seed — peuple la base de données avec des données initiales.
Exécuter : python seed.py
"""
from app.db.session import SessionLocal, engine
from app.models import Base
from app.models.role import Role, Permission
from app.models.user import User
from app.models.site import SiteSentinelle
from app.models.model import MLModel, RiskModel
from app.core.security import get_password_hash
from datetime import datetime

Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    # ── Permissions ─────────────────────────────────────────────────────────
    modules = ["captures", "sites", "datasets", "modeles", "rapports", "dhis2", "admin"]
    actions = ["voir", "creer", "modifier", "valider", "exporter", "supprimer"]
    permissions = {}
    for mod in modules:
        for act in actions:
            code = f"{mod}:{act}"
            p = db.query(Permission).filter(Permission.code == code).first()
            if not p:
                p = Permission(name=f"{act.capitalize()} {mod}", code=code, module=mod, action=act)
                db.add(p)
            permissions[code] = p
    db.flush()

    # ── Rôles ────────────────────────────────────────────────────────────────
    def get_or_create_role(name, description, perm_codes):
        role = db.query(Role).filter(Role.name == name).first()
        if not role:
            role = Role(name=name, description=description)
            role.permissions = [permissions[c] for c in perm_codes if c in permissions]
            db.add(role)
        return role

    admin_role = get_or_create_role(
        "Super Administrateur", "Accès complet",
        [f"{m}:{a}" for m in modules for a in actions]
    )
    coordo_role = get_or_create_role(
        "Coordinateur Terrain", "Gestion des sites et captures",
        ["sites:voir", "sites:creer", "sites:modifier",
         "captures:voir", "captures:creer", "captures:modifier"]
    )
    labo_role = get_or_create_role(
        "Technicien Laboratoire", "Validation des captures",
        ["captures:voir", "captures:creer", "captures:valider", "captures:modifier"]
    )
    chercheur_role = get_or_create_role(
        "Chercheur", "Analyse et export des données",
        ["captures:voir", "captures:exporter", "datasets:voir", "datasets:exporter",
         "rapports:voir", "rapports:creer", "rapports:exporter"]
    )
    db.flush()

    # ── Utilisateurs ─────────────────────────────────────────────────────────
    if not db.query(User).filter(User.username == "admin").first():
        admin = User(
            email="admin@entomo.sn",
            username="admin",
            hashed_password=get_password_hash("Admin@2024"),
            full_name="Administrateur Système",
            etablissement="PNLP Sénégal",
            region="Dakar",
            is_active=True,
            is_superuser=True,
            role_id=admin_role.id,
        )
        db.add(admin)

    if not db.query(User).filter(User.username == "labo1").first():
        labo = User(
            email="labo@entomo.sn",
            username="labo1",
            hashed_password=get_password_hash("Labo@2024"),
            full_name="Dr. Amadou Diallo",
            etablissement="Laboratoire d'Entomologie — ISED",
            region="Dakar",
            district="Pikine",
            is_active=True,
            role_id=labo_role.id,
        )
        db.add(labo)

    # ── Sites sentinelles ─────────────────────────────────────────────────────
    sites_data = [
        {"nom": "Site Kedougou 1", "code": "KED-001", "region": "Kédougou", "district": "Kédougou",
         "latitude": 12.5578, "longitude": -12.1750, "zone_type": "rural", "type_environnement": "forêt galerie"},
        {"nom": "Site Ziguinchor Central", "code": "ZIG-001", "region": "Ziguinchor", "district": "Ziguinchor",
         "latitude": 12.5623, "longitude": -16.2726, "zone_type": "urbain", "type_environnement": "zone humide"},
        {"nom": "Site Kolda Nord", "code": "KOL-001", "region": "Kolda", "district": "Kolda",
         "latitude": 12.8975, "longitude": -14.9408, "zone_type": "rural", "type_environnement": "savane arborée"},
        {"nom": "Site Tambacounda 2", "code": "TAM-002", "region": "Tambacounda", "district": "Tambacounda",
         "latitude": 13.7707, "longitude": -13.6673, "zone_type": "périurbain", "type_environnement": "savane"},
        {"nom": "Site Thiès Périurbain", "code": "THI-001", "region": "Thiès", "district": "Thiès",
         "latitude": 14.7910, "longitude": -16.9355, "zone_type": "périurbain", "type_environnement": "savane arborée"},
    ]
    for s in sites_data:
        if not db.query(SiteSentinelle).filter(SiteSentinelle.code == s["code"]).first():
            db.add(SiteSentinelle(**s, actif=True))

    # ── Modèles ML ────────────────────────────────────────────────────────────
    if not db.query(MLModel).filter(MLModel.nom == "AnophelesNet v2.1").first():
        db.add(MLModel(
            nom="AnophelesNet v2.1",
            version="2.1.0",
            type_modele="classification",
            architecture="ResNet50",
            description="Identification visuelle des espèces d'anophèles",
            precision=0.947,
            rappel=0.932,
            f1_score=0.939,
            taille_mb=98.3,
            contexte_deploiement="serveur_national",
            actif=True,
            deploye=True,
        ))

    if not db.query(RiskModel).filter(RiskModel.nom == "RisquePalu-XGB v1.0").first():
        db.add(RiskModel(
            nom="RisquePalu-XGB v1.0",
            version="1.0.0",
            algorithme="xgboost",
            description="Prédiction du risque épidémique paludisme",
            precision=0.887,
            f1_score=0.879,
            actif=True,
            deploye=True,
        ))

    db.commit()
    print("✅ Base de données peuplée avec succès !")
    print("   Utilisateur admin : admin / Admin@2024")
    print("   Utilisateur labo  : labo1 / Labo@2024")

except Exception as e:
    db.rollback()
    print(f"❌ Erreur lors du seed : {e}")
    raise
finally:
    db.close()
