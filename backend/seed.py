from datetime import datetime, timedelta
import random
from app.core.security import get_password_hash

# Importez les modèles après avoir changé d'environnement
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.user import User
from app.models.role import Role, Permission
from app.models.site import SiteSentinelle, SiteActivite
from app.models.capture import Capture
from app.models.dataset import Dataset
from app.models.model import MLModel
from app.models.dhis2 import DHIS2Config
from app.models.report import Rapport
from app.models.indicateur import Indicateur
from app.models.langue import Langue
from app.models.campagne import Campagne
from app.models.intervention import Intervention
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.models.reference import ReferenceData
from app.models import Base
from app.db.session import engine
from app.db.migrations import ensure_schema_compatibility

# Le seed doit aussi fonctionner sur une base neuve, sans dépendre du fait que
# le serveur FastAPI ait déjà démarré.
ensure_schema_compatibility(engine)
Base.metadata.create_all(bind=engine)

# Importez la session de base
try:
    from app.db.session import SessionLocal
    db = SessionLocal()
    
    print("🌱 Création de la base de données avec des données de seed...\n")
    
    # Nettoyer les données existantes (optionnel)
    # db.query(ReferenceData).delete()
    # db.query(AuditLog).delete()
    # db.query(Intervention).delete()
    # db.query(Campagne).delete()
    # db.query(Notification).delete()
    # db.query(Intervention).delete()
    # db.query(DHIS2Config).delete()
    # db.query(MLModel).delete()
    # db.query(Dataset).delete()
    # db.query(Capture).delete()
    # db.query(SiteSentinelle).delete()
    # db.query(User).delete()
    # db.query(Role).delete()
    # db.query(Permission).delete()
    
    print("1️⃣ Création des permissions")
    permissions_data = [
        # Captures
        {"name": "Voir les captures", "code": "captures:voir", "module": "captures", "action": "voir"},
        {"name": "Créer une capture", "code": "captures:creer", "module": "captures", "action": "creer"},
        {"name": "Modifier une capture", "code": "captures:modifier", "module": "captures", "action": "modifier"},
        {"name": "Valider une capture", "code": "captures:valider", "module": "captures", "action": "valider"},
        {"name": "Supprimer une capture", "code": "captures:supprimer", "module": "captures", "action": "supprimer"},
        
        # Sites
        {"name": "Voir les sites", "code": "sites:voir", "module": "sites", "action": "voir"},
        {"name": "Créer un site", "code": "sites:creer", "module": "sites", "action": "creer"},
        {"name": "Modifier un site", "code": "sites:modifier", "module": "sites", "action": "modifier"},
        {"name": "Supprimer un site", "code": "sites:supprimer", "module": "sites", "action": "supprimer"},
        
        # Utilisateurs
        {"name": "Voir les utilisateurs", "code": "users:voir", "module": "users", "action": "voir"},
        {"name": "Créer un utilisateur", "code": "users:creer", "module": "users", "action": "creer"},
        {"name": "Modifier un utilisateur", "code": "users:modifier", "module": "users", "action": "modifier"},
        {"name": "Supprimer un utilisateur", "code": "users:supprimer", "module": "users", "action": "supprimer"},
        
        # Rôles et Permissions
        {"name": "Voir les rôles", "code": "roles:voir", "module": "roles", "action": "voir"},
        {"name": "Créer un rôle", "code": "roles:creer", "module": "roles", "action": "creer"},
        {"name": "Modifier un rôle", "code": "roles:modifier", "module": "roles", "action": "modifier"},
        {"name": "Supprimer un rôle", "code": "roles:supprimer", "module": "roles", "action": "supprimer"},
        
        # Rapports
        {"name": "Voir les rapports", "code": "rapports:voir", "module": "rapports", "action": "voir"},
        {"name": "Créer un rapport", "code": "rapports:creer", "module": "rapports", "action": "creer"},
        {"name": "Supprimer un rapport", "code": "rapports:supprimer", "module": "rapports", "action": "supprimer"},
        
        # Dashboard
        {"name": "Voir le dashboard", "code": "dashboard:voir", "module": "dashboard", "action": "voir"},
        
        # DHIS2
        {"name": "Gérer DHIS2", "code": "dhis2:gestion", "module": "dhis2", "action": "gestion"},
        
        # Interventions
        {"name": "Gérer les interventions", "code": "interventions:gestion", "module": "interventions", "action": "gestion"},
        
        # Campagnes
        {"name": "Gérer les campagnes", "code": "campagnes:gestion", "module": "campagnes", "action": "gestion"},
        
        # Langues
        {"name": "Gérer les langues", "code": "langues:gestion", "module": "langues", "action": "gestion"},
        
        # Notifications
        {"name": "Gérer les notifications", "code": "notifications:gestion", "module": "notifications", "action": "gestion"},
        
        # Audit
        {"name": "Voir les logs d'audit", "code": "audit:voir", "module": "audit", "action": "voir"},
        
        # Données de référence
        {"name": "Gérer les données de référence", "code": "reference:gestion", "module": "reference", "action": "gestion"},
        
        # Datasets
        {"name": "Gérer les datasets", "code": "datasets:gestion", "module": "datasets", "action": "gestion"},
        
        # Modèles ML
        {"name": "Gérer les modèles ML", "code": "modeles:gestion", "module": "modeles", "action": "gestion"},
        
        # Indicateurs
        {"name": "Gérer les indicateurs", "code": "indicateurs:gestion", "module": "indicateurs", "action": "gestion"},
        
        # Synchronisation
        {"name": "Gérer la sync", "code": "sync:gestion", "module": "sync", "action": "gestion"},
        
        # Admin (tout)
        {"name": "Accès admin", "code": "admin", "module": "admin", "action": "tout"},
    ]
    
    permissions_created = []
    for perm_data in permissions_data:
        existing = db.query(Permission).filter_by(code=perm_data["code"]).first()
        if not existing:
            perm = Permission(**perm_data)
            db.add(perm)
            db.flush()
            print(f"   ✅ Permission créée: {perm_data['code']}")
        else:
            perm = existing
        permissions_created.append(perm)
    
    print(f"\n📋 Permissions créées: {len(permissions_created)}\n")
    
    print("2️⃣ Création des rôles de base")
    roles_data = [
        {
            "name": "Super Administrateur",
            "description": "Accès complet à toutes les fonctionnalités",
            "is_system": "oui",
            "permission_ids": [p.id for p in permissions_created]
        },
        {
            "name": "Administrateur",
            "description": "Accès complet sauf supression de super-administrateurs",
            "is_system": "oui",
            "permission_ids": [p.id for p in permissions_created if p.code != "admin"]
        },
        {
            "name": "Gestionnaire de Terrain",
            "description": "Gérer les captures, les sites et les interventions",
            "is_system": "non",
            "permission_ids": [
                p.id for p in permissions_created if p.module in ["captures", "sites", "interventions"]
                and p.action in ["voir", "creer", "modifier"]
            ]
        },
        {
            "name": "Laboratoire",
            "description": "Valider les captures, gérer les espèces et indiquer les diagnostics",
            "is_system": "non",
            "permission_ids": [
                p.id for p in permissions_created if p.code in [
                    "captures:voir", "captures:valider", "captures:modifier"
                ]
            ]
        },
        {
            "name": "Analyste de Données",
            "description": "Consulter les dashboards et générer des rapports",
            "is_system": "non",
            "permission_ids": [
                p.id for p in permissions_created if p.code in [
                    "dashboard:voir", "rapports:voir", "rapports:creer",
                    "indicateurs:gestion", "datasets:gestion"
                ]
            ]
        },
        {
            "name": "Utilisateur Standard",
            "description": "Accès limité pour la création de captures",
            "is_system": "non",
            "permission_ids": [
                p.id for p in permissions_created if p.code in [
                    "captures:voir", "captures:creer", "sites:voir"
                ]
            ]
        },
    ]
    
    roles_created = []
    for role_data in roles_data:
        existing = db.query(Role).filter_by(name=role_data["name"]).first()
        if not existing:
            role = Role(
                name=role_data["name"],
                description=role_data["description"],
                is_system=role_data["is_system"]
            )
            db.add(role)
            db.flush()
            print(f"   ✅ Rôle créé: {role_data['name']} ({len(role_data['permission_ids'])} permissions)")
        else:
            role = existing
            role.description = role_data["description"]
            role.is_system = role_data["is_system"]
        role.permissions = db.query(Permission).filter(Permission.id.in_(role_data["permission_ids"])).all() if role_data["permission_ids"] else []
        roles_created.append(role)

    roles_by_name = {role.name: role for role in roles_created}
    
    print(f"\n👥 Rôles créés: {len(roles_created)}\n")
    
    print("3️⃣ Création de l'utilisateur administrateur")
    admin_user_data = {
        "email": "admin@entomo.example.com",
        "username": "admin",
        "full_name": "Administrateur Système",
        "hashed_password": get_password_hash("Admin@2024"),
        "etablissement": "Hôpital Central",
        "region": "Central",
        "district": "Dakar",
        "telephone": "+221 77 123 4567",
        "is_active": True,
        "is_superuser": True,
        "role_id": roles_by_name["Super Administrateur"].id,
        "last_login": datetime.utcnow()
    }
    
    existing_admin = db.query(User).filter((User.email == admin_user_data["email"]) | 
                                          (User.username == admin_user_data["username"])).first()
    if not existing_admin:
        admin_user = User(**admin_user_data)
        db.add(admin_user)
        db.flush()
        print("   ✅ Administrateur créé: admin / Admin@2024")
    else:
        # Ce compte est explicitement un compte de démonstration annoncé par
        # start.py et login.html : le seed doit donc garantir ses identifiants.
        existing_admin.hashed_password = get_password_hash("Admin@2024")
        existing_admin.is_active = True
        existing_admin.is_superuser = True
        existing_admin.role_id = roles_by_name["Super Administrateur"].id
        print(f"   ✅ Compte de démonstration administrateur synchronisé")
    demo_admin = existing_admin or admin_user
    
    print("\n4️⃣ Création de quelques sites sentinelles d'exemple")
    sites_data = [
        {"nom": "Site Kédougou-1", "code": "SITE-KDG-01", "region": "Kédougou", 
         "district": "Kédougou", "latitude": 12.5574, "longitude": -12.1752, "actif": True},
        {"nom": "Site Dakar-1", "code": "SITE-DAK-01", "region": "Dakar", 
         "district": "Dakar", "latitude": 14.7167, "longitude": -17.4677, "actif": True},
        {"nom": "Site Thiès-1", "code": "SITE-THS-01", "region": "Thiès", 
         "district": "Thiès", "latitude": 14.2420, "longitude": -16.7567, "actif": True},
        {"nom": "Site Saint-Louis-1", "code": "SITE-SLO-01", "region": "Saint-Louis", 
         "district": "Saint-Louis", "latitude": 16.0304, "longitude": -16.4952, "actif": True},
        {"nom": "Site Ziguinchor-1", "code": "SITE-ZIG-01", "region": "Ziguinchor", 
         "district": "Ziguinchor", "latitude": 12.5843, "longitude": -16.2722, "actif": True},
    ]
    
    sites_created = []
    for site_data in sites_data:
        existing = db.query(SiteSentinelle).filter_by(code=site_data["code"]).first()
        if not existing:
            site = SiteSentinelle(**site_data)
            db.add(site)
            db.flush()
            sites_created.append(site)
            print(f"   ✅ Site créé: {site.code} - {site.nom}")
        else:
            sites_created.append(existing)
    
    print(f"\n🏥 Sites créés: {len(sites_created)}\n")
    
    print("5️⃣ Création de données de référence statiques (spécies, régions, méthodes, etc.)")
    reference_categories = [
        ("especes", [
            {"code": "an_gambiae", "label": "An. gambiae s.s."},
            {"code": "an_gambiae_sl", "label": "An. gambiae s.l."},
            {"code": "an_funestus", "label": "An. funestus"},
            {"code": "an_arabiensis", "label": "An. arabiensis"},
            {"code": "ae_aegypti", "label": "Ae. aegypti"},
            {"code": "ae_albopictus", "label": "Ae. albopictus"},
        ]),
        ("regions", [
            {"code": "dakar", "label": "Dakar"},
            {"code": "thies", "label": "Thiès"},
            {"code": "diourbel", "label": "Diourbel"},
            {"code": "fatick", "label": "Fatick"},
            {"code": "kaolack", "label": "Kaolack"},
            {"code": "kaffrine", "label": "Kaffrine"},
            {"code": "kedougou", "label": "Kédougou"},
            {"code": "tambacounda", "label": "Tambacounda"},
            {"code": "ziguinchor", "label": "Ziguinchor"},
            {"code": "sedhiou", "label": "Sédhiou"},
            {"code": "kolda", "label": "Kolda"},
            {"code": "saint_louis", "label": "Saint-Louis"},
            {"code": "louga", "label": "Louga"},
            {"code": "matam", "label": "Matam"},
        ]),
        ("methodes_capture", [
            {"code": "cdc_light_trap", "label": "CDC Light Trap"},
            {"code": "bg_sentinel", "label": "BG-Sentinel"},
            {"code": "filet", "label": "Filet à moustiques"},
            {"code": "aspirateur", "label": "Aspirateur à bouche"},
            {"code": "psc", "label": "PSC (Pulvérisation intra-domiciliaire)"},
            {"code": "cdc_gravid_trap", "label": "CDC Gravid Trap"},
            {"code": "pieges_lumineux", "label": "Pièges lumineux"},
            {"code": "audio", "label": "Surveillance audio"},
        ]),
        ("types_zones", [
            {"code": "urbain", "label": "Urbain"},
            {"code": "periurbain", "label": "Périurbain"},
            {"code": "rural", "label": "Rural"},
            {"code": "foret", "label": "Forêt"},
            {"code": "zone_humide", "label": "Zone humide"},
            {"code": "zone_agricole", "label": "Zone agricole"},
            {"code": "mangrove", "label": "Mangrove"},
        ]),
        ("genres", [
            {"code": "femelle", "label": "Femelle"},
            {"code": "male", "label": "Mâle"},
            {"code": "indetermine", "label": "Indéterminé"},
        ]),
        ("statuts_capture", [
            {"code": "a_valider", "label": "À valider"},
            {"code": "valide", "label": "Validé"},
            {"code": "corrige", "label": "Corrigé"},
            {"code": "rejete", "label": "Rejeté"},
            {"code": "analyse", "label": "Analysé"},
        ]),
        ("environnements", [
            {"code": "interieur", "label": "Intérieur"},
            {"code": "exterieur", "label": "Extérieur"},
            {"code": "semi_ouvert", "label": "Semi-ouvert"},
        ]),
        ("niveaux_risque", [
            {"code": "faible", "label": "Faible"},
            {"code": "modere", "label": "Modéré"},
            {"code": "eleve", "label": "Élevé"},
            {"code": "critique", "label": "Critique"},
        ]),
    ]
    
    ref_created = []
    for category, items in reference_categories:
        existing = db.query(ReferenceData).filter_by(category=category).first()
        if not existing:
            for item in items:
                ref_item = ReferenceData(
                    category=category,
                    code=item["code"],
                    label=item["label"],
                    description=f"Donnée de référence pour la catégorie {category}"
                )
                db.add(ref_item)
            db.flush()
            print(f"   ✅ Références créées: {category} ({len(items)} items)")
    
    print("\n6️⃣ Création d'utilisateurs de test")
    test_users_data = [
        {
            "email": "m.dethie@entomo.example.com",
            "username": "mouss.dethie",
            "full_name": "Mouss Dethie Sarr",
            "hashed_password": get_password_hash("Test123!"),
            "etablissement": "Poste de Santé de Kédougou",
            "region": "Kédougou",
            "district": "Kédougou",
            "telephone": "+221 77 123 4567",
            "is_active": True,
            "is_superuser": False,
            "role_id": roles_by_name["Analyste de Données"].id,
        },
        {
            "email": "o.faye@entomo.example.com",
            "username": "ousmane.faye",
            "full_name": "Ousmane Faye",
            "hashed_password": get_password_hash("Test123!"),
            "etablissement": "Hôpital Régional de Thiès",
            "region": "Thiès",
            "district": "Thiès",
            "telephone": "+221 78 234 5678",
            "is_active": True,
            "is_superuser": False,
            "role_id": roles_by_name["Analyste de Données"].id,
        },
        {
            "email": "f.ndiaye@entomo.example.com",
            "username": "fatou.ndiaye",
            "full_name": "Fatou Ndiaye",
            "hashed_password": get_password_hash("Test123!"),
            "etablissement": "Bureau Régional de Dakar",
            "region": "Dakar",
            "district": "Dakar",
            "telephone": "+221 76 345 6789",
            "is_active": False,
            "is_superuser": False,
            "role_id": roles_by_name["Utilisateur Standard"].id,
        },
    ]
    
    for user_data in test_users_data:
        existing = db.query(User).filter((User.email == user_data["email"]) | 
                                         (User.username == user_data["username"])).first()
        if not existing:
            user = User(**user_data)
            db.add(user)
            print(f"   ✅ Utilisateur créé: {user.username} ({user.email})")
    
    print("\n7️⃣ Création de captures d'exemple")
    espece_list = ["An. gambiae", "An. funestus", "Ae. aegypti", "Cx. quinquefasciatus", "An. arabiensis"]
    methode_list = ["CDC Light Trap", "BG-Sentinel", "Filet à moustiques", "Aspirateur à bouche"]
    sexe_list = ["M", "F", "Indéterminé"]
    
    captures_created = 0
    if db.query(Capture).count() == 0:
      for i, site in enumerate(sites_created[:3]):
        for j in range(random.randint(3, 8)):
            espece = random.choice(espece_list)
            sexe = random.choice(sexe_list)
            methode = random.choice(methode_list)
            
            capture = Capture(
                site_id=site.id,
                date_capture=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
                espece=espece,
                espece_corrigee=None,
                nombre_individus=random.randint(1, 15),
                sexe=sexe,
                stade=random.choice(["adulte", "larve", "nymphe"]),
                methode_capture=methode,
                temperature=round(random.uniform(25.0, 32.0), 1),
                humidite=round(random.uniform(60.0, 85.0), 1),
                notes="" if random.random() > 0.7 else "Observation: mosquitos abondants dans la zone",
                image_path=f"uploads/captures/capture_{i}_{j}_image.jpg" if random.random() > 0.5 else None,
                audio_path=f"uploads/captures/capture_{i}_{j}_audio.wav" if random.random() > 0.7 else None,
                confidence_ia=round(random.uniform(0.7, 0.99), 2) if random.random() > 0.3 else None,
                ml_model_id=None,
                statut=random.choices(["a_valider", "valide", "corrige", "rejete"], weights=[20, 50, 15, 5])[0],
                valide=(random.random() > 0.3),
                utilisateur_id=random.choice([1, 2, 3]) if random.random() > 0.3 else None,
                valideur_id=random.choice([1]) if random.random() > 0.7 else None,
            )
            db.add(capture)
            captures_created += 1
    
    print(f"   📊 {captures_created} captures créées")
    
    print("\n8️⃣ Création d'interventions d'exemple")
    intervention_types = ["larvicide", "pulverisation", "sensibilisation", "piégeage"]
    interventions_created = 0
    if db.query(Intervention).count() == 0:
      for site in sites_created:
        for i in range(random.randint(1, 3)):
            intervention = Intervention(
                titre=f"Intervention {i+1} - {site.nom}",
                description=f"Lutte anti-vectorielle type {random.choice(intervention_types)} dans la zone",
                site_id=site.id,
                date_prevue=datetime.utcnow() + timedelta(days=random.randint(1, 14)),
                date_realisee=datetime.utcnow() - timedelta(days=random.randint(0, 7)) if random.random() > 0.5 else None,
                statut=random.choices(["planifiee", "en_cours", "realisee"], weights=[30, 40, 30])[0],
                type_intervention=random.choice(intervention_types),
                responsable=f"Responsable équipe {i+1}",
                notes="" if random.random() > 0.7 else "Nécessite un suivi",
                utilisateur_id=random.choice([1, 2]) if random.random() > 0.4 else None,
                actif=True,
            )
            db.add(intervention)
            interventions_created += 1
    
    print(f"   🌱 {interventions_created} interventions créées")
    
    print("\n9️⃣ Création de données campagnes d'exemple")
    campagne_types = ["pulverisation", "larvicide", "sensibilisation", "collecte"]
    campagnes_created = 0
    if db.query(Campagne).count() == 0:
      for i in range(3):
        campagne = Campagne(
            nom=f"Campagne Anti-Paludisme {2026}-{i+1}",
            description=f"Campagne de lutte contre le paludisme dans la région de {random.choice(['Dakar', 'Kédougou', 'Thiès'])}",
            date_debut=datetime.utcnow() - timedelta(days=random.randint(0, 60)),
            date_fin=datetime.utcnow() + timedelta(days=random.randint(30, 90)),
            statut=random.choices(["planifiee", "en_cours", "terminee"], weights=[20, 40, 40])[0],
            type_campagne=random.choice(campagne_types),
            budget=round(random.uniform(1000000, 5000000), 0),
            responsable=f"Chef de campagne {i+1}",
            notes="" if random.random() > 0.5 else "Objectif: réduction de 40% des indices",
            region=random.choice(["Dakar", "Kédougou", "Thiès", "Saint-Louis"]),
            actif=True,
        )
        db.add(campagne)
        campagnes_created += 1
    
    print(f"   📋 {campagnes_created} campagnes créées")

    print("\n9️⃣ bis Création des jeux de données, rapports et activités d'exemple")
    if db.query(Dataset).count() == 0:
        for index, (nom, statut, images) in enumerate([
            ("Captures Sénégal 2026", "pret", 420),
            ("Annotations Anophèles", "en_cours", 185),
            ("Validation laboratoire", "en_preparation", 96),
        ], start=1):
            db.add(Dataset(
                nom=nom,
                description=f"Jeu de données de démonstration {index}",
                chemin=f"uploads/datasets/dataset_{index}.zip",
                taille=images * 250_000,
                type="images",
                version="1.0",
                source_annotations="Ento-App Afrique",
                images_count=images,
                statut=statut,
                utilisateur_id=demo_admin.id,
                actif=True,
            ))

    if db.query(Rapport).count() == 0:
        for index, rapport_type in enumerate(["oms", "pnlp", "personnalise"], start=1):
            db.add(Rapport(
                titre=f"Rapport {rapport_type.upper()} de démonstration {index}",
                type=rapport_type,
                contenu="Rapport généré à partir des données de surveillance entomologique.",
                format_fichier="pdf",
                statut="pret",
                utilisateur_id=demo_admin.id,
                date_generation=datetime.utcnow() - timedelta(days=index),
                periode_debut=datetime.utcnow() - timedelta(days=30),
                periode_fin=datetime.utcnow(),
            ))

    if db.query(SiteActivite).count() == 0:
        for index, site in enumerate(sites_created):
            db.add(SiteActivite(
                site_id=site.id,
                type_activite="visite_terrain",
                description="Visite de contrôle et maintenance des pièges.",
                utilisateur_id=demo_admin.id,
                date_activite=datetime.utcnow() - timedelta(days=index),
            ))

    if db.query(Notification).count() == 0:
        for titre, message, notification_type in [
            ("Bienvenue dans Ento-App", "Votre environnement de surveillance est opérationnel.", "success"),
            ("Captures à valider", "Des captures de démonstration attendent une validation laboratoire.", "warning"),
            ("Synchronisation DHIS2", "Vérifiez la configuration avant le premier envoi.", "info"),
        ]:
            db.add(Notification(
                utilisateur_id=demo_admin.id,
                titre=titre,
                message=message,
                type_notification=notification_type,
                module="systeme",
                lu=False,
            ))
    
    print("\n🔟 Création de données DHIS2 d'exemple")
    dhis2_config = db.query(DHIS2Config).first()
    if not dhis2_config:
        dhis2_config = DHIS2Config(
            nom="Configuration principale DHIS2",
            url="https://dhis2.example.com",
            username="api_user",
            hashed_password=get_password_hash("DHIS2Api123!"),
            org_unit="OU_123456",
            data_set="DS_789012",
            periode="mensuel",
            actif=True,
        )
        db.add(dhis2_config)
        db.flush()
        print(f"   🌐 Configuration DHIS2 créée (ID: {dhis2_config.id})")
    else:
        print(f"   ℹ️  Configuration DHIS2 déjà présente (ID: {dhis2_config.id})")

    print("\n1️⃣1️⃣ Création des langues de base")
    for language_data in [
        {"code": "fr", "nom": "Français", "active": True, "date_format": "DD/MM/YYYY", "timezone": "Africa/Dakar"},
        {"code": "wo", "nom": "Wolof", "active": False, "date_format": "DD/MM/YYYY", "timezone": "Africa/Dakar"},
        {"code": "en", "nom": "English", "active": False, "date_format": "MM/DD/YYYY", "timezone": "Africa/Dakar"},
    ]:
        language = db.query(Langue).filter(Langue.code == language_data["code"]).first()
        if not language:
            db.add(Langue(**language_data))

    # Sans commit, close() annule silencieusement toutes les insertions.
    db.commit()
    
    print("\n✅ Initialisation de la base de données terminée avec succès!")
    print(f"   - Permissions: {len(permissions_created)}")
    print(f"   - Rôles: {len(roles_created)}")
    print(f"   - Sites: {len(sites_created)}")
    print(f"   - Utilisateurs: 1 administrateur + 2 test + 1 inactif")
    print(f"   - Captures créées: {captures_created}")
    print(f"   - Interventions créées: {interventions_created}")
    print(f"   - Campagnes créées: {campagnes_created}")
    print(f"   - Données de référence: 6 catégories")
    print(f"   - Configuration DHIS2: 1")
    
    print("\n🔑 Identifiants importants:")
    print("   Admin: admin / Admin@2024")
    print("   Utilisateur 2: m.dethie@entomo.example.com / Test123!")
    print("   Utilisateur 3: o.faye@entomo.example.com / Test123!")
    
except Exception as e:
    db.rollback()
    print(f"❌ Erreur lors de la création de la base de données: {e}")
    import traceback
    traceback.print_exc()
    raise
finally:
    db.close()
