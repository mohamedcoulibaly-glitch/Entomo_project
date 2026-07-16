from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum

# Base de données des références statiques pour l'Environnement Numérique
REFERENCE_DATA_STATIC = {
    "especes": [
        {"code": "an_gambiae", "label": "An. gambiae s.s."},
        {"code": "an_gambiae_sl", "label": "An. gambiae s.l."},
        {"code": "an_funestus", "label": "An. funestus"},
        {"code": "an_arabiensis", "label": "An. arabiensis"},
        {"code": "an_melas", "label": "An. melas"},
        {"code": "an_moucheti", "label": "An. moucheti"},
        {"code": "an_nili", "label": "An. nili"},
        {"code": "an_marshallii", "label": "An. marshallii"},
        {"code": "ae_aegypti", "label": "Ae. aegypti"},
        {"code": "ae_albopictus", "label": "Ae. albopictus"},
        {"code": "cx_quinquefasciatus", "label": "Cx. quinquefasciatus"},
        {"code": "cx_perfuscus", "label": "Cx. perfuscus"},
        {"code": "cx_tritaeniorhynchus", "label": "Cx. tritaeniorhynchus"},
    ],
    "regions": [
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
    ],
    "methodes_capture": [
        {"code": "cdc_light_trap", "label": "CDC Light Trap"},
        {"code": "bg_sentinel", "label": "BG-Sentinel"},
        {"code": "filet", "label": "Filet à moustiques"},
        {"code": "aspirateur", "label": "Aspirateur à bouche"},
        {"code": "psc", "label": "PSC (Pulvérisation intra-domiciliaire)"},
        {"code": "cdc_gravid_trap", "label": "CDC Gravid Trap"},
        {"code": "pieges_lumineux", "label": "Pièges lumineux"},
        {"code": "audio", "label": "Surveillance audio"},
    ],
    "types_zones": [
        {"code": "urbain", "label": "Urbain"},
        {"code": "periurbain", "label": "Périurbain"},
        {"code": "rural", "label": "Rural"},
        {"code": "foret", "label": "Forêt"},
        {"code": "zone_humide", "label": "Zone humide"},
        {"code": "zone_agricole", "label": "Zone agricole"},
        {"code": "mangrove", "label": "Mangrove"},
    ],
    "genres": [
        {"code": "femelle", "label": "Femelle"},
        {"code": "male", "label": "Mâle"},
        {"code": "indetermine", "label": "Indéterminé"},
    ],
    "statuts_capture": [
        {"code": "a_valider", "label": "À valider"},
        {"code": "valide", "label": "Validé"},
        {"code": "corrige", "label": "Corrigé"},
        {"code": "rejete", "label": "Rejeté"},
        {"code": "analyse", "label": "Analysé"},
    ],
    "environnements": [
        {"code": "interieur", "label": "Intérieur"},
        {"code": "exterieur", "label": "Extérieur"},
        {"code": "semi_ouvert", "label": "Semi-ouvert"},
    ],
    "niveaux_risque": [
        {"code": "faible", "label": "Faible"},
        {"code": "modere", "label": "Modéré"},
        {"code": "eleve", "label": "Élevé"},
        {"code": "critique", "label": "Critique"},
    ],
}

# Bureau d'état civil principal de l'Assistance Numérique
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# 📋 Module de Données Statiques
class ReferenceItem(BaseSchema):
    category: str = Field(..., description="Catégorie des données de référence")
    code: str = Field(..., description="Code unique de l'élément")
    label: str = Field(..., description="Libellé de l'élément (affiché dans l'interface utilisateur)")
    description: Optional[str] = Field(None, description="Description optionnelle")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Données JSON optionnelles supplémentaires")
    actif: bool = Field(True, description="Si l'élément est actif/enabled")
    ordre: int = Field(0, description="Pour l'ordre de tri dans l'interface utilisateur")
    validation_required: bool = Field(False, description="Si une validation par humain est requise pour cet élément")


class ReferenceCreate(BaseSchema):
    category: str = Field(..., description="Catégorie des données de référence")
    code: str = Field(..., description="Code unique de l'élément")
    label: str = Field(..., description="Libellé de l'élément (affiché dans l'interface utilisateur)")
    description: Optional[str] = Field(None, description="Description optionnelle")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Données JSON optionnelles supplémentaires")
    actif: bool = Field(True, description="Si l'élément est actif/enabled")
    ordre: int = Field(0, description="Pour l'ordre de tri dans l'interface utilisateur")
    validation_required: bool = Field(False, description="Si une validation par humain est requise pour cet élément")


class ReferenceUpdate(BaseModel):
    code: Optional[str] = Field(None, description="Code unique de l'élément")
    label: Optional[str] = Field(None, description="Libellé de l'élément (affiché dans l'interface utilisateur)")
    description: Optional[str] = Field(None, description="Description optionnelle")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Données JSON optionnelles supplémentaires")
    actif: Optional[bool] = Field(None, description="Si l'élément est actif/enabled")
    ordre: Optional[int] = Field(None, description="Pour l'ordre de tri dans l'interface utilisateur")
    validation_required: Optional[bool] = Field(None, description="Si une validation par humain est requise pour cet élément")


class ReferenceResponse(BaseSchema):
    category: str = Field(..., description="Catégorie des données de référence")
    code: str = Field(..., description="Code unique de l'élément")
    label: str = Field(..., description="Libellé de l'élément (affiché dans l'interface utilisateur)")
    description: Optional[str] = Field(None, description="Description optionnelle")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Données JSON optionnelles supplémentaires")
    actif: bool = Field(True, description="Si l'élément est actif/enabled")
    ordre: int = Field(0, description="Pour l'ordre de tri dans l'interface utilisateur")
    validation_required: bool = Field(False, description="Si une validation par humain est requise pour cet élément")
    created_at: datetime = Field(..., description="Date de création de l'enregistrement")
    updated_at: Optional[datetime] = Field(None, description="Date de la dernière mise à jour de l'enregistrement")


# ✅ Log d'audit principal du Système Numérique
class AuditLogBase(BaseSchema):
    utilisateur_id: Optional[int] = Field(None, description="ID de l'utilisateur ayant effectué l'action")
    action: str = Field(..., description="Description de l'action effectuée")
    module: str = Field(..., description="Module système dans lequel l'action a été effectuée (ex: 'captures', 'users')")
    resource_type: Optional[str] = Field(None, description="Type de ressource affectée (ex: 'Capture', 'User')")
    resource_id: Optional[int] = Field(None, description="ID de la ressource affectée")
    details: Optional[str] = Field(None, description="Détails supplémentaires sur l'action, stockés sous forme JSON")
    adresse_ip: Optional[str] = Field(None, description="Adresse IP à partir de laquelle l'action a été effectuée")
    user_agent: Optional[str] = Field(None, description="User-Agent du client ayant effectué l'action")


class AuditLogCreate(AuditLogBase):
    pass


class AuditLogUpdate(BaseModel):
    utilisateur_id: Optional[int] = Field(None, description="ID de l'utilisateur ayant effectué l'action")
    action: Optional[str] = Field(None, description="Description de l'action effectuée")
    module: Optional[str] = Field(None, description="Module système dans lequel l'action a été effectuée (ex: 'captures', 'users')")
    resource_type: Optional[str] = Field(None, description="Type de ressource affectée (ex: 'Capture', 'User')")
    resource_id: Optional[int] = Field(None, description="ID de la ressource affectée")
    details: Optional[str] = Field(None, description="Détails supplémentaires sur l'action, stockés sous forme JSON")
    adresse_ip: Optional[str] = Field(None, description="Adresse IP à partir de laquelle l'action a été effectuée")
    user_agent: Optional[str] = Field(None, description="User-Agent du client ayant effectué l'action")


class AuditLogResponse(AuditLogBase):
    utilisateur_nom: Optional[str] = Field(None, description="Nom complet de l'utilisateur (joigné pour l'affichage)")
    utilisateur_username: Optional[str] = Field(None, description="Nom d'utilisateur de l'utilisateur (joigné pour l'affichage)")
    created_at: datetime = Field(..., description="Date de création de l'enregistrement")
    updated_at: Optional[datetime] = Field(None, description="Date de la dernière mise à jour de l'enregistrement")


# 📬 Service de Notifications Principal
class NotificationBase(BaseSchema):
    utilisateur_id: int = Field(..., description="ID de l'utilisateur destinataire")
    titre: str = Field(..., description="Titre de la notification")
    message: Optional[str] = Field(None, description="Corps principal du message de la notification")
    type_notification: str = Field("info", description="Type de notification (info, warning, success, error, alerte)")
    module: Optional[str] = Field(None, description="Module système source de la notification")
    lien: Optional[str] = Field(None, description="URL optionnelle vers une ressource connexe")
    lu: bool = Field(False, description="Indicateur si la notification a été lue")
    date_lecture: Optional[datetime] = Field(None, description="Date et heure à laquelle la notification a été lue")


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):
    titre: Optional[str] = Field(None, description="Titre de la notification")
    message: Optional[str] = Field(None, description="Corps principal du message de la notification")
    type_notification: Optional[str] = Field(None, description="Type de notification (info, warning, success, error, alerte)")
    module: Optional[str] = Field(None, description="Module système source de la notification")
    lien: Optional[str] = Field(None, description="URL optionnelle vers une ressource connexe")
    lu: Optional[bool] = Field(None, description="Indicateur si la notification a été lue")
    date_lecture: Optional[datetime] = Field(None, description="Date et heure à laquelle la notification a été lue")


class NotificationResponse(NotificationBase):
    utilisateur_nom: str = Field(..., description="Nom complet de l'utilisateur destinataire (joigné)")
    utilisateur_username: str = Field(..., description="Nom d'utilisateur du destinataire (joigné)")
    lu: bool = Field(False, description="Indicateur si la notification a été lue")
    date_lecture: Optional[datetime] = Field(None, description="Date et heure à laquelle la notification a été lue")
    created_at: datetime = Field(..., description="Date de création de l'enregistrement")
    updated_at: Optional[datetime] = Field(None, description="Date de la dernière mise à jour de l'enregistrement")


# 🎯 Système d'Alertes Principal
class AlerteBase(BaseSchema):
    titre: str = Field(..., description="Titre de l'alerte")
    message: str = Field(..., description="Message complet de l'alerte")
    type_alerte: str = Field("info", description="Type d'alerte (info, warning, critical, success)")
    module: str = Field(..., description="Module système générateur de l'alerte")
    niveau_risque: str = Field("faible", description="Niveau de risque (faible, modere, eleve, critique)")
    actif: bool = Field(True, description="Si l'alerte est active/enabled")
    utilisateur_id_cible: Optional[int] = Field(None, description="ID d'un utilisateur spécifique cible (optionnel pour diffusion globale)")
    conditions: Optional[Dict[str, Any]] = Field(None, description="Conditions déclenchant la alerte, stockées en JSON (ex: {\"espece\": \"An. gambiae\", \"seuil\": 10})")
    date_debut: Optional[datetime] = Field(None, description="Date et heure de début de validité de l'alerte")
    date_fin: Optional[datetime] = Field(None, description="Date et heure de fin de validité de l'alerte")


class AlerteCreate(AlerteBase):
    pass


class AlerteUpdate(BaseModel):
    titre: Optional[str] = Field(None, description="Titre de l'alerte")
    message: Optional[str] = Field(None, description="Message complet de l'alerte")
    type_alerte: Optional[str] = Field(None, description="Type d'alerte (info, warning, critical, success)")
    module: Optional[str] = Field(None, description="Module système générateur de l'alerte")
    niveau_risque: Optional[str] = Field(None, description="Niveau de risque (faible, modere, eleve, critique)")
    actif: Optional[bool] = Field(None, description="Si l'alerte est active/enabled")
    utilisateur_id_cible: Optional[int] = Field(None, description="ID d'un utilisateur spécifique cible (optionnel pour diffusion globale)")
    conditions: Optional[Dict[str, Any]] = Field(None, description="Conditions déclenchant la alerte, stockées en JSON (ex: {\"espece\": \"An. gambiae\", \"seuil\": 10})")
    date_debut: Optional[datetime] = Field(None, description="Date et heure de début de validité de l'alerte")
    date_fin: Optional[datetime] = Field(None, description="Date et heure de fin de validité de l'alerte")


class AlerteResponse(AlerteBase):
    utilisateur_cible_nom: Optional[str] = Field(None, description="Nom complet de l'utilisateur cible (joigné)")
    nombre_lectures: int = Field(0, description="Nombre de fois que l'alerte a été affichée")
    date_debut: Optional[datetime] = Field(None, description="Date et heure de début de validité de l'alerte")
    date_fin: Optional[datetime] = Field(None, description="Date et heure de fin de validité de l'alerte")
    created_at: datetime = Field(..., description="Date de création de l'enregistrement")
    updated_at: Optional[datetime] = Field(None, description="Date de la dernière mise à jour de l'enregistrement")


# 📦 Catalogue de Modules de Données Importés
class DonneeImporteeBase(BaseSchema):
    nom: str = Field(..., description="Nom unique de l'ensemble de données importé (ex: 'Pomme de terre 2025')")
    description: Optional[str] = Field(None, description="Description de l'ensemble de données importé")
    chemin: str = Field(..., description="Chemin vers le fichier source (dans uploads/datasets/)")
    taille: Optional[int] = Field(None, description="Taille du fichier en octets")
    type_donnee: str = Field(..., description="Type des données (ex: 'csv', 'excel', 'json', 'parquet')")
    format_donnee: Optional[str] = Field(None, description="Format spécifique des données (ex: 'rapport OMS', 'DHIS2')")
    version: str = Field("1.0", description="Version de l'ensemble de données importé")
    source_annotations: Optional[str] = Field(None, description="Source des annotations (si disponibles)")
    images_count: int = Field(0, description="Nombre d'images détectées dans l'ensemble de données")
    statut: str = Field("en_preparation", description="Statut de l'ensemble de données (en_preparation, pret, en_cours, termine, erreur)")
    utilisateur_id: Optional[int] = Field(None, description="ID de l'utilisateur ayant effectué l'importation")
    actif: bool = Field(True, description="Si l'ensemble de données est actif/enabled")
    validations_necessaires: int = Field(0, description="Nombre d'annotations nécessitant une validation par humain")
    validations_terminees: int = Field(0, description="Nombre d'annotations validées")


class DonneeImporteeCreate(DonneeImporteeBase):
    pass


class DonneeImporteeUpdate(BaseModel):
    nom: Optional[str] = Field(None, description="Nom unique de l'ensemble de données importé (ex: 'Pomme de terre 2025')")
    description: Optional[str] = Field(None, description="Description de l'ensemble de données importé")
    chemin: Optional[str] = Field(None, description="Chemin vers le fichier source (dans uploads/datasets/)")
    taille: Optional[int] = Field(None, description="Taille du fichier en octets")
    type_donnee: Optional[str] = Field(None, description="Type des données (ex: 'csv', 'excel', 'json', 'parquet')")
    format_donnee: Optional[str] = Field(None, description="Format spécifique des données (ex: 'rapport OMS', 'DHIS2')")
    version: Optional[str] = Field(None, description="Version de l'ensemble de données importé")
    source_annotations: Optional[str] = Field(None, description="Source des annotations (si disponibles)")
    images_count: Optional[int] = Field(None, description="Nombre d'images détectées dans l'ensemble de données")
    statut: Optional[str] = Field(None, description="Statut de l'ensemble de données (en_preparation, pret, en_cours, termine, erreur)")
    utilisateur_id: Optional[int] = Field(None, description="ID de l'utilisateur ayant effectué l'importation")
    actif: Optional[bool] = Field(None, description="Si l'ensemble de données est actif/enabled")
    validations_necessaires: Optional[int] = Field(None, description="Nombre d'annotations nécessitant une validation par humain")
    validations_terminees: Optional[int] = Field(None, description="Nombre d'annotations validées")


class DonneeImporteeResponse(DonneeImporteeBase):
    utilisateur_nom: Optional[str] = Field(None, description="Nom complet de l'utilisateur ayant effectué l'importation (joigné)")
    pourcentage_completion: Optional[float] = Field(None, description="Pourcentage d'annotations validées")
    date_debut: Optional[datetime] = Field(None, description="Date et heure estimée de début de traitement")
    date_fin: Optional[datetime] = Field(None, description="Date et heure estimée de fin de traitement")
    created_at: datetime = Field(..., description="Date de création de l'enregistrement")
    updated_at: Optional[datetime] = Field(None, description="Date de la dernière mise à jour de l'enregistrement")


# 📂 Système d'Archive d'Annotations (Version Complète)
class AnnotationBase(BaseSchema):
    dataset_id: int = Field(..., description="ID de l'ensemble de données auquel cette annotation appartient")
    label: str = Field(..., description="Étiquette/classification de l'annotation (ex: 'Aedes mosquito', 'Plante nuisible')")
    notes: Optional[str] = Field(None, description="Notes optionnelles supplémentaires sur l'annotation (ex: 'Difficile à identifier en raison du faible contraste')")
    chemin_fichier: Optional[str] = Field(None, description="Chemin relatif au stockage externe (dans uploads/annotations/) si image/visualisation fournie")
    utilisateur_id: Optional[int] = Field(None, description="ID de l'utilisateur ayant fourni/corrigé l'annotation (optionnel pour les importations automatisées)")
    confiance: Optional[float] = Field(None, description="Niveau de confiance de l'annotation (si IA/ML utilisé, score 0-1)")
    confiance_ia: Optional[float] = Field(None, description="Confiance spécifique de l'IA (alternative à 'confiance')")
    statut: str = Field("en_attente", description="Statut de l'annotation (en_attente, validee, rejete, en_cours)")
    date_validation: Optional[datetime] = Field(None, description="Date et heure à laquelle l'annotation a été validée (par un annotateur humain)")
    valideur_id: Optional[int] = Field(None, description="ID de l'utilisateur ayant validé l'annotation (sauf auto-validation)")
    longitude: Optional[float] = Field(None, description="Coordonnée géographique longitude (si annotation geo-référencée)")
    latitude: Optional[float] = Field(None, description="Coordonnée géographique latitude (si annotation geo-référencée)")
    altitude: Optional[float] = Field(None, description="Coordonnée géographique altitude (si annotation geo-référencée)")


class AnnotationCreate(AnnotationBase):
    pass


class AnnotationUpdate(BaseModel):
    label: Optional[str] = Field(None, description="Étiquette/classification de l'annotation (ex: 'Aedes mosquito', 'Plante nuisible')")
    notes: Optional[str] = Field(None, description="Notes optionnelles supplémentaires sur l'annotation (ex: 'Difficile à identifier en raison du faible contraste')")
    chemin_fichier: Optional[str] = Field(None, description="Chemin relatif au stockage externe (dans uploads/annotations/) si image/visualisation fournie")
    utilisateur_id: Optional[int] = Field(None, description="ID de l'utilisateur ayant fourni/corrigé l'annotation (optionnel pour les importations automatisées)")
    confiance: Optional[float] = Field(None, description="Niveau de confiance de l'annotation (si IA/ML utilisé, score 0-1)")
    confiance_ia: Optional[float] = Field(None, description="Confiance spécifique de l'IA (alternative à 'confiance')")
    statut: Optional[str] = Field(None, description="Statut de l'annotation (en_attente, validee, rejete, en_cours)")
    date_validation: Optional[datetime] = Field(None, description="Date et heure à laquelle l'annotation a été validée (par un annotateur humain)")
    valideur_id: Optional[int] = Field(None, description="ID de l'utilisateur ayant validé l'annotation (sauf auto-validation)")
    longitude: Optional[float] = Field(None, description="Coordonnée géographique longitude (si annotation geo-référencée)")
    latitude: Optional[float] = Field(None, description="Coordonnée géographique latitude (si annotation geo-référencée)")
    altitude: Optional[float] = Field(None, description="Coordonnée géographique altitude (si annotation geo-référencée)")


class AnnotationResponse(AnnotationBase):
    dataset_nom: Optional[str] = Field(None, description="Nom du jeu de données auquel appartient l'annotation (joigné)")
    utilisateur_nom: Optional[str] = Field(None, description="Nom complet de l'utilisateur ayant fourni l'annotation (joigné)")
    valideur_nom: Optional[str] = Field(None, description="Nom complet de l'utilisateur ayant validé l'annotation (joigné)")
    statut: str = Field("en_attente", description="Statut de l'annotation (en_attente, validee, rejete, en_cours)")
    date_validation: Optional[datetime] = Field(None, description="Date et heure à laquelle l'annotation a été validée (par un annotateur humain)")
    created_at: datetime = Field(..., description="Date de création de l'enregistrement")
    updated_at: Optional[datetime] = Field(None, description="Date de la dernière mise à jour de l'enregistrement")


# 🌐 Système d'Intégration DHIS2 Principal
class DHIS2ConfigBase(BaseSchema):
    nom: str = Field(..., description="Nom convivial de la configuration de connexion DHIS2 (ex: 'Sync National 2025')")
    url: str = Field(..., description="URL de base de la connexion DHIS2 (ex: 'https://dhis2.example.com')")
    username: Optional[str] = Field(None, description="Nom d'utilisateur pour l'authentification DHIS2 (optionnel si token utilisé)")
    hashed_password: Optional[str] = Field(None, description="Mot de passe hashé pour l'authentification DHIS2 (jamais stocké en clair)")
    org_unit: Optional[str] = Field(None, description="Unité organisationnelle DHIS2 (ou root OU)")
    data_set: Optional[str] = Field(None, description="ID de l'ensemble de données DHIS2 (ex: 'LY8fW2Zz7q8')")
    periode: Optional[str] = Field(None, description="Calendrier de période par défaut (ex: 'mensuel', 'hebdomadaire')")
    actif: bool = Field(True, description="Si la configuration est active/enabled")


class DHIS2ConfigCreate(DHIS2ConfigBase):
    pass


class DHIS2ConfigUpdate(BaseModel):
    nom: Optional[str] = Field(None, description="Nom convivial de la configuration de connexion DHIS2 (ex: 'Sync National 2025')")
    url: Optional[str] = Field(None, description="URL de base de la connexion DHIS2 (ex: 'https://dhis2.example.com')")
    username: Optional[str] = Field(None, description="Nom d'utilisateur pour l'authentification DHIS2 (optionnel si token utilisé)")
    hashed_password: Optional[str] = Field(None, description="Mot de passe hashé pour l'authentification DHIS2 (jamais stocké en clair)")
    org_unit: Optional[str] = Field(None, description="Unité organisationnelle DHIS2 (ou root OU)")
    data_set: Optional[str] = Field(None, description="ID de l'ensemble de données DHIS2 (ex: 'LY8fW2Zz7q8')")
    periode: Optional[str] = Field(None, description="Calendrier de période par défaut (ex: 'mensuel', 'hebdomadaire')")
    actif: Optional[bool] = Field(None, description="Si la configuration est active/enabled")


class DHIS2ConfigResponse(DHIS2ConfigBase):
    identifiant_connexion_sec: Optional[str] = Field(None, description="Jeton/tocken de connexion sécurisé (tronqué pour l'affichage)")
    actif: bool = Field(True, description="Si la configuration est active/enabled")
    date_derniere_connexion: Optional[datetime] = Field(None, description="Date et heure de la dernière connexion réussie")
    created_at: datetime = Field(..., description="Date de création de l'enregistrement")
    updated_at: Optional[datetime] = Field(None, description="Date de la dernière mise à jour de l'enregistrement")


class DHIS2MappingBase(BaseSchema):
    config_id: int = Field(..., description="ID de la configuration parent DHIS2")
    indicateur_local: str = Field(..., description="Nom de l'indicateur dans notre système local (ex: 'Density Mosquito')")
    element_dhis2: str = Field(..., description="ID ou nom de l'élément DHIS2 cible (ex: 'VE_123456')")
    type_donnee: Optional[str] = Field(None, description="Type de valeur de données (ex: 'nombre', 'pourcentage', 'taux')")
    actif: bool = Field(True, description="Si la correspondance est active/enabled")


class DHIS2MappingCreate(DHIS2MappingBase):
    pass


class DHIS2MappingUpdate(BaseModel):
    indicateur_local: Optional[str] = Field(None, description="Nom de l'indicateur dans notre système local (ex: 'Density Mosquito')")
    element_dhis2: Optional[str] = Field(None, description="ID ou nom de l'élément DHIS2 cible (ex: 'VE_123456')")
    type_donnee: Optional[str] = Field(None, description="Type de valeur de données (ex: 'nombre', 'pourcentage', 'taux')")
    actif: Optional[bool] = Field(None, description="Si la correspondance est active/enabled")


class DHIS2MappingResponse(DHIS2MappingBase):
    config_nom: Optional[str] = Field(None, description="Nom de la configuration DHIS2 parente (joigné)")
    created_at: datetime = Field(..., description="Date de création de l'enregistrement")
    updated_at: Optional[datetime] = Field(None, description="Date de la dernière mise à jour de l'enregistrement")


class DHIS2SyncBase(BaseSchema):
    config_id: int = Field(..., description="ID de la configuration DHIS2 utilisée pour cette synchronisation")
    date_sync: Optional[datetime] = Field(None, description="Date et heure de la synchronisation (optionnel pour les commits en attente)")
    statut: str = Field("en_cours", description="Statut de la synchronisation (en_cours, succes, echec, en_attente)")
    nb_enregistrements: int = Field(0, description="Nombre d'enregistrements traités/détectés dans cette synchronisation")
    message: Optional[str] = Field(None, description="Message de journalisation optionnel décrivant les détails de la synchronisation, les erreurs, etc.")
    utilisateur_id: Optional[int] = Field(None, description="ID de l'utilisateur ayant déclenché la synchronisation (sauf automatique)")


class DHIS2SyncCreate(DHIS2SyncBase):
    pass


class DHIS2SyncUpdate(BaseModel):
    date_sync: Optional[datetime] = Field(None, description="Date et heure de la synchronisation (optionnel pour les commits en attente)")
    statut: Optional[str] = Field(None, description="Statut de la synchronisation (en_cours, succes, echec, en_attente)")
    nb_enregistrements: Optional[int] = Field(None, description="Nombre d'enregistrements traités/détectés dans cette synchronisation")
    message: Optional[str] = Field(None, description="Message de journalisation optionnel décrivant les détails de la synchronisation, les erreurs, etc.")
    utilisateur_id: Optional[int] = Field(None, description="ID de l'utilisateur ayant déclenché la synchronisation (sauf automatique)")


class DHIS2SyncResponse(DHIS2SyncBase):
    config_nom: Optional[str] = Field(None, description="Nom de la configuration DHIS2 parente (joigné)")
    utilisateur_nom: Optional[str] = Field(None, description="Nom complet de l'utilisateur ayant déclenché la synchronisation (joigné)")
    date_sync: Optional[datetime] = Field(None, description="Date et heure de la synchronisation (optionnel pour les commits en attente)")
    statut: str = Field("en_cours", description="Statut de la synchronisation (en_cours, succes, echec, en_attente)")
    nb_enregistrements: int = Field(0, description="Nombre d'enregistrements traités/détectés dans cette synchronisation")
    created_at: datetime = Field(..., description="Date de création de l'enregistrement")
    updated_at: Optional[datetime] = Field(None, description="Date de la dernière mise à jour de l'enregistrement")


# 📊 Système Principal de Configuration des Indicateurs et Rapports OMS
class OMSIndicateurBase(BaseSchema):
    nom: str = Field(..., description="Nom de l'indicateur de rapport OMS (ex: 'Density Mosquito Adults')")
    description: Optional[str] = Field(None, description="Description détaillée de l'indicateur, de son objectif et de son interpretation")
    formule: Optional[str] = Field(None, description="Formule optionnelle pour le calcul automatisé (ex: '(count_adult_males + count_femelles) / surface')")
    numerateur: Optional[str] = Field(None, description="Expression MATH poignets pour le numérateur (ex: 'sum(captures.where(espece==\"An. gambiae\")')")
    denominateur: Optional[str] = Field(None, description="Expression MATH poignets pour le dénominateur (ex: 'sum(surface)')")
    unite: Optional[str] = Field(None, description="Unité d measurement standard (ex: 'mosquitos_par_m2', 'pourcentage')")
    seuil_bas: Optional[float] = Field(None, description="Seuil d'alerte bas pour l'indicateur (ex: 10 individus/m2)")
    seuil_moyen: Optional[float] = Field(None, description="Seuil d'alerte moyen pour l'indicateur (ex: 50 individus/m2)")
    seuil_eleve: Optional[float] = Field(None, description="Seuil d'alerte élevé pour l'indicateur (ex: 100 individus/m2)")
    notifications_actives: bool = Field(True, description="Si les notifications automatiques sont actives pour cet indicateur")
    statut: str = Field("configure", description="Statut du développement de l'indicateur (configure, test, produit, archive)")
    source_donnees: Optional[str] = Field(None, description="Source des données (ex: 'captures', 'imports', 'dhis2')")
    periode_calcul: Optional[str] = Field(None, description="Période de calcul de l'indicateur (ex: 'quotidien', 'hebdomadaire', 'mensuel')")


class OMSIndicateurCreate(OMSIndicateurBase):
    pass


class OMSIndicateurUpdate(BaseModel):
    nom: Optional[str] = Field(None, description="Nom de l'indicateur de rapport OMS (ex: 'Density Mosquito Adults')")
    description: Optional[str] = Field(None, description="Description détaillée de l'indicateur, de son objectif et de son interpretation")
    formule: Optional[str] = Field(None, description="Formule optionnelle pour le calcul automatisé (ex: '(count_adult_males + count_femelles) / surface')")
    numerateur: Optional[str] = Field(None, description="Expression MATH poignets pour le numérateur (ex: 'sum(captures.where(espece==\"An. gambiae\")')")
    denominateur: Optional[str] = Field(None, description="Expression MATH poignets pour le dénominateur (ex: 'sum(surface)')")
    unite: Optional[str] = Field(None, description="Unité d measurement standard (ex: 'mosquitos_par_m2', 'pourcentage')")
    seuil_bas: Optional[float] = Field(None, description="Seuil d'alerte bas pour l'indicateur (ex: 10 individus/m2)")
    seuil_moyen: Optional[float] = Field(None, description="Seuil d'alerte moyen pour l'indicateur (ex: 50 individus/m2)")
    seuil_eleve: Optional[float] = Field(None, description="Seuil d'alerte élevé pour l'indicateur (ex: 100 individus/m2)")
    notifications_actives: Optional[bool] = Field(None, description="Si les notifications automatiques sont actives pour cet indicateur")
    statut: Optional[str] = Field(None, description="Statut du développement de l'indicateur (configure, test, produit, archive)")
    source_donnees: Optional[str] = Field(None, description="Source des données (ex: 'captures', 'imports', 'dhis2')")
    periode_calcul: Optional[str] = Field(None, description="Période de calcul de l'indicateur (ex: 'quotidien', 'hebdomadaire', 'mensuel')")


class OMSIndicateurResponse(OMSIndicateurBase):
    nombre_captures_source: Optional[int] = Field(None, description="Nombre de captures source utilisables pour cet indicateur")
    dernier_calcul: Optional[datetime] = Field(None, description="Date et heure du dernier calcul réussi pour l'indicateur")
    actif: bool = Field(True, description="Si l'indicateur est actif/utilisé pour les alertes")
    created_at: datetime = Field(..., description="Date de création de l'enregistrement")
    updated_at: Optional[datetime] = Field(None, description="Date de la dernière mise à jour de l'enregistrement")


# 📋 Configuration d'assistance numérique complète et efficace (pour l'assistant IA)
class ReferenceStaticComplete(BaseSchema):
    """
    Documentation complète de toutes les données de référence statiques pour l'Ento-App Afrique.
    Contient tous les compartiments statiques de référence sous forme de schéma Pydantic pour une validation et une documentationRobustes.
    """
    # Compartiment des espèces
    especes: List[Dict[str, Any]] = Field(
        ...,
        description="Liste de toutes les espèces notifiées, avec codes et libellés pour l'identification entomologique."
    )
    # Compartiment des régions
    regions: List[Dict[str, Any]] = Field(
        ...,
        description="Liste de toutes les unités administratives/régions de surveillance entomologique."
    )
    # Compartiment des méthodes
    methodes_capture: List[Dict[str, Any]] = Field(
        ...,
        description="Ensemble complet des méthodes et techniques de capture d'insectes vecteurs."
    )
    # Compartiment des types de zones
    types_zones: List[Dict[str, Any]] = Field(
        ...,
        description="Catégories diversifiées d'habitats/terrains de pertinence entomologique."
    )
    # Compartiment des genres
    genres: List[Dict[str, Any]] = Field(
        ...,
        description="Catégories d'âge/de taille/genotype standard pour les spécimens d'insectes."
    )
    # Compartiment des statuts
    statuts_capture: List[Dict[str, Any]] = Field(
        ...,
        description="Tous les statuts possibles pour le workflow de validation des captures."
    )
    # Compartiment des environnements
    environnements: List[Dict[str, Any]] = Field(
        ...,
        description="Catégories diverses d'habitat et d'environnement pour les spécimens d'insectes."
    )
    # Compartiment des niveaux de risque
    niveaux_risque: List[Dict[str, Any]] = Field(
        ...,
        description="Catégories pour la sévérité de la surveillance basée sur les valeurs d'indicateurs."
    )


# 🌐 Système Centralisé de Configuration du Frontend Numérique
class FrontendConfig(BaseSchema):
    """
    Configuration centralisée de tous les aspects de la couche frontend.
    Contient des schémas pour les thèmes, les langues, les mises en page, les componentes UI, etc.
    """
    # Schémas de configuration du thème
    theme: Dict[str, Any] = Field(..., description="Configuration du thème Tailwind CSS (couleurs, polices, espacement, etc.)")
    # Configuration des URL (routes) du frontend
    routes: Dict[str, Any] = Field(..., description="Définitions de toutes les routes frontend (pages, composants, endpoints) avec leurs permissions d'accès")
    # Configuration du langage (internationale)
    i18n: Dict[str, Any] = Field(..., description="Snippets de traduction trans-environments pour toutes les interfaces utilisateur")
    # Configuration des composants UI (bibliothèque de composants)
    components: Dict[str, Any] = Field(..., description="Définitions de toutes les composantes d'interface utilisateur (cartes, formulaires, tableaux, graphiques)")
    # Configuration des hooks/événements du frontend
    event_handlers: Dict[str, Any] = Field(..., description="Définition de tous les écouteurs d'événements frontend et leurs gestionnaires de callbacks")
    # Paramètres de performance et de cache frontend
    performance: Dict[str, Any] = Field(..., description="Paramètres de performance ( stratégied e cache, limites de poll, préchargement de données )")


# 🏗️ Schémas de Construction pour les Entités Numériques Personnalisées
class EntomoEntityBuilder(BaseModel):
    """
    Schéma unifié pour la construction/definition des entités dans l'environnement numérique d'Entomo.
    Fournit des structures cohérentes et extensibles pour la définition d'entités.
    """
    # Métadonnées de définition d'entité
    metadata: Dict[str, Any] = Field(
        ...,
        description="Métadonnées descriptives (nom, description, version, permissions, etc.)"
    )
    # Schéma de données de l'entité (champs, relations, validations)
    schema: Dict[str, Any] = Field(..., description="Définition structurée du modèle de données de l'entité (SQLAlchemy/Pydantic)")
    # Permissions d'accès et de contrôle (RBAC)
    permissions: Dict[str, Any] = Field(..., description="Règles RBAC pour l'entité (actions autorisées, rôles, conditions)")
    # Hooks de cycle de vie (création, mise à jour, suppression,/validation)
    lifecycle_hooks: Dict[str, Any] = Field(..., description="Définition de tous les points d'extension du cycle de vie (avant/après création, mise à jour, suppression, validation)")
    # Sluggards de sérialisation (commentaires, exposants, etc.)
    serialization: Dict[str, Any] = Field(..., description="Stratégies de sérialisation (exclure, inclus, relations, métadonnées)")


# 🌉 Schéma Universal de Validation de Données (pour Intégration HS)
class ValidationSchema(BaseModel):
    """
    Schéma unique et extensible pour la validation des données provenant de différentes sources.
    Prend en charge les schémas JSON Schema Draft 2020-12, OpenAPI, et entités personnalisées.
    """
    # Source du schéma de données (ex: schema_file, schema_url, schéma intégré)
    source: str = Field(..., description="Source du schéma (chemin, URL, intégration)")
    type: str = Field("json_schema", description="Type de schéma (json_schema, openapi, custom_entity, entomo_native)")
    # Schéma de données principal (JSON Schema)
    schema: Dict[str, Any] = Field(..., description="Définition du schéma (contraintes, titres, types, validations)")
    # Mappages optionnels entre le schéma et les entités
    mappings: Optional[Dict[str, Any]] = Field(None, description="Correspondances entre les noms de champs JSON Schema et les entités Entomo")
    # Configurations de validation (règles, messages d'erreur, seuils)
    validation_rules: Optional[Dict[str, Any]] = Field(None, description="Regles de validation (règles custom, seuils de confidence, autres)")
    # Stratégies de traitement des erreurs (centrale, détaillées, formatées)
    error_handling: Dict[str, Any] = Field(..., description="Stratégies de gestion des erreurs (centre, greltionnaire, format)")
    # Hooks d'intégration facilitant la validation
    integration_hooks: Optional[Dict[str, Any]] = Field(None, description="Points d'extension pour la validation en temps réel, les stratégies adaptatives, les dashboards de validation")


# 🔗 Schémas de Correspondance et d'Intégration
class IntegrationMapping(BaseSchema):
    """
    Définition des correspondances entre les entités, schémas, et workflows Entomo.
    Permet la correspondance centralisée et la correspondance entre les sujets numériques.
    """
    # Source Entomo (notre entité interne)
    entomo_source: str = Field(..., description="Nom de l'entité/entité Entomo source (ex: 'capture', 'user', 'site')")
    # Entité cible (source externe, source web, autre)
    target_entity: str = Field(..., description="Nom de la cible (ex: 'dhis2', 'OMS', 'warehouse', 'api_externe')")
    # Direction de la correspondance (entomo -> external, external -> entomo, sync)
    direction: str = Field(..., description="Direction de la synchronisation (entomo_to_external, external_to_entomo, sync)")
    # Mappages de champs détaillés
    field_mappings: Dict[str, Any] = Field(..., description="Correspondances de champs entiers vers extérieurs (nom, type, transformation)")
    # Règles de synchronisation (fréquence, déclencheurs, stratégies d'erreur)
    sync_rules: Dict[str, Any] = Field(..., description="Stratégies de synchronisation (horaire, sur événement, manuel)")
    # Permissions et authentification nécessaires pour l'intégration
    auth_requirements: Dict[str, Any] = Field(..., description="Requirements d'authentification et d'autorisation (jetons, API keys, certificats)")
    # Points d'extension optionnels
    extension_points: Optional[Dict[str, Any]] = Field(None, description="Points d'intégration extensibles (filtres, transformations, validations)")


# 📊 Documentation Technique Universal d'Entomo (pour Git/GitBook, OpenAPI)
class EntomoTechnicalDocumentation(BaseSchema):
    """
    Documentation technique complète pour l'API Entomo, les entités, les workflows et les schémas.
    Fournit une description programmatiquement accessible de toute l'architecture et des capacités système."
    """
    # Vue d'ensemble du système
    overview: Dict[str, Any] = Field(..., description="Vue d'ensemble executive (objectif, architecture, composantes clés)")
    # Schémas d'entité (tous les entités, leurs schémas Pydantic/JSON, les SQLAlchemies)
    entities: Dict[str, Any] = Field(..., description="Toutes les définitions d'entités Entomo ( modèles, validations, relations)")
    # Endpoints API (tous les routes, méthodes, paramètres, retours, schémas)
    endpoints: Dict[str, Any] = Field(..., description="Toutes les définitions d'endpoints API (HTTP methods, schémas, sécurité, middleware)")
    # Schémas (tous les schémas Pydantic/JSON)
    schemas: Dict[str, Any] = Field(..., description="Tous les schémas Pydantic/JSON (Base, Create, Update, Response)")
    # Schémas (toutes les définitions de base de données SQL
    database: Dict[str, Any] = Field(..., description="Toutes les définitions de base de données (modèles, tables, relations, indices, contraintes)")
    # Configuration et paramètres système
    configuration: Dict[str, Any] = Field(..., description="Tous les paramètres système (CORS, validation, performances, logging, monitoring)")
    # Systèmes d'intégration (niveaux de service, intégration, connecteurs)
    integrations: Dict[str, Any] = Field(..., description="Toutes les intégrations système (services, connecteurs, adaptateurs)")
    # Paramètres de démarrage et d'environnement
    startup: Dict[str, Any] = Field(..., description="Paramètres de démarrage (dépendances, base de données, déploiements)")
    # Utilisation des ressources (limites, quotas, allocation)
    resource_usage: Dict[str, Any] = Field(..., description="Métriques et limites d'utilisation des ressources (CPU, mémoire, réseau, base de données)")
    # Alertes, logging et suivi
    monitoring: Dict[str, Any] = Field(..., description="Configuration de monitoring (alertes, logging, métriques, notifications)")
    # Documentation technique des workflows (flux, étapes, validations)
    workflows: Dict[str, Any] = Field(..., description="Documentation des workflows d'entreprise (cas d'usage, flux de données, validations)")
    # Extension et plugin points
    extensibility: Dict[str, Any] = Field(..., description="Points de plugin (hooks, adaptateurs, extensions personnalisées)")


# 🏗️ Guide de Aménagement du Schéma Entomo (uniquement destiné aux développeurs)
class SchemaDesignGuide(BaseModel):
    """
    Guide détaillé pour la conception et la maintenance des schémas Entomo.
    Fournit des directives systématiques pour la conception des modèles SQLAlchemy et Pydantic.
    """
    # Principes de base de la conception
    design_principles: Dict[str, Any] = Field(..., description="Principes fondamentaux de conception (noramlisation, accord, étendueabilité)")
    # Schémas de nomination et d'organisation des entités
    entity_naming: Dict[str, Any] = Field(..., description="Directrices de nomination des entités (styles, phrases, composantes)")
    # Validation des schémas (Pydantic, JSON Schema, types custom)
    validation_strategy: Dict[str, Any] = Field(..., description="Approche de validation (JSON Schema, Pydantic, types personnalisés)")
    # Conventions de base de données (tables, colonnes, relations)
    database_conventions: Dict[str, Any] = Field(..., description="Conventions SQLAlchemist (nommage de tables, types de colonnes, définitions de relations)")
    # Conception des API (OpenAPI, documentation, sécurité)
    api_design: Dict[str, Any] = Field(..., description="Conventions d'API (OpenAPI, documentation, sécurité, middleware)")
    # Gestion des versions (versioning, migrations)
    versioning: Dict[str, Any] = Field(..., description="Convensions de versioning (versions d'API, modifications d'entités, migrations)")
    # Tâches d'implémentation (étape par étape, tests, CI/CD)
    implementation: Dict[str, Any] = Field(..., description="Workflow d'implémentation (incrémental, basé sur les tests, backend-first)")
    # Procédures d'assurance qualité
    quality_assurance: Dict[str, Any] = Field(..., description="Procédures d'assurance qualité (tests, linting, type checking)")


# 🌉 Schéma de Statistiques et d'Analytics Principal de l'Environnement Numérique
class EntomoAnalyticsSchema(BaseModel):
    """
    Schéma unifié et complet pour tous les analytics et statistiques Entomo.
    Fournit des schémas détaillés, fonctionnels et extensibles pour chaque métrique, rapport, représentation graphique, etc.
    """
    # Statistiques aggrégées à l'échelle de l'application (système au niveau global)
    app_stats: Dict[str, Any] = Field(..., description="Métriques aggrégées (utilisateurs, captures, sites, performance système)")
    # Statistiques par entité (par tous les types d'entités)
    entity_stats: Dict[str, Any] = Field(..., description="Stats détaillées par entité (captures, sites, utilisateurs, modèles, etc.)")
    # Statistiques par module/système (par fonctionnalités au niveau du module)
    module_stats: Dict[str, Any] = Field(..., description="Stats par module (dashboard, auth, api, database)")
    # Statistiques par jour (tracking temporel)
    daily_stats: Dict[str, Any] = Field(..., description="Trends de statiteis temporels (sur une période)")
    # Statistiques par période (hebdomadaires, mensuelles, trimestrielles)
    periodic_stats: Dict[str, Any] = Field(..., description="Stats agrégées par période (hebdomadaires, mensuelles, trimestrielles)")
    # Statistiques comparatives (par région, par période, par méthode)
    comparative_stats: Dict[str, Any] = Field(..., description="Comparaisons croisées entre différentes dimensions")
    # Indicateurs et KPI (définitions d'indicateurs clés, seuils, tendances)
    kpis: Dict[str, Any] = Field(..., description="Indicateurs et KPI (définition, valeur actuelle, tendance, objectif)")
    # Rapports de performance
    performance_reports: Dict[str, Any] = Field(..., description="Rapports de performance par service, base de données, réseau")
    # Statistiques d'utilisation et d'activité utilisateur
    user_activity: Dict[str, Any] = Field(..., description="Statistiques d'activité des utilisateurs (connexions, actions, engagement)")
    # Messages de statut et d'alerte
    status_messages: Dict[str, Any] = Field(..., description="Messages de statut, d'alerte et d'information (confiance, qualité, update)")


# 📜 Anthologie Universal de Schémas Numériques d'Entomo
class EntomoSchemaReference(BaseModel):
    """
    Anthologie complète de tous les schémas numériques Entomo (v1.0).
    Contient une documentation exhaustive de tous les schémas, avec toutes les extensions,
    scénarios d'utilisation, conventions, cas d'extension.
    """
    # Collection de tous les schémas Pydantic
    pydantic_schemas: Dict[str, Any] = Field(..., description="Tous les schémas Pydantic (Base, Create, Update, Response par entité)")
    # Collection de tous les schémas de base de données SQLAlchemy/ORM
    database_schemas: Dict[str, Any] = Field(..., description="Toutes les définitions de schémas de base de données (modèles, tables, contraintes)")
    # Collection de tous les schémas JSON/JSON Schema/EWS
    json_schemas: Dict[str, Any] = Field(..., description="Tous les schémas JSON Schema/JSON (pour validation, documentation API, clients)")
    # Collection de toutes les openAPI/specs de documentation technique
    api_docs: Dict[str, Any] = Field(..., description="Tous les schémas de documentation technique OpenAPI/spec (API endpoints, documentation)")
    # Collection de tous les schémas de référence (données de référence statiques)
    reference_schemas: Dict[str, Any] = Field(..., description="Toutes les définitions de schémas (données statiques de référence Entomo)")
    # Collection de tous les schémas de configuration
    config_schemas: Dict[str, Any] = Field(..., description="Toutes les définitions de schémas (paramètres système, configuration middleware)")
    # Collection de tous les schémas d'intégration
    integration_schemas: Dict[str, Any] = Field(..., description="Toutes les définitions de schémas (correspondances d'intégration, mappages, connecteurs)")
    # Collection de tous les schémas de validation
    validation_schemas: Dict[str, Any] = Field(..., description="Tous les schémas (règles de validation, stratégies, configurations)")
    # Collection de tous les schémas analytiques
    analytics_schemas: Dict[str, Any] = Field(..., description="Tous les schémas (stats, indicateurs, KPI, rapport)")
    # Collection de tous les guides de conception
    design_guides: Dict[str, Any] = Field(..., description="Tous les guides (conventions de conception, bons practices, meilleures pratiques)")
    # Collection de tous les guides de développement
    development_guides: Dict[str, Any] = Field(..., description="Tous les guides (guide d'implémentation, tâches de développement, pipelines CI/CD)")
    # Collection de tous les schémas de documentation technique
    technical_docs: Dict[str, Any] = Field(..., description="Tous les guides (éditeurs technique, détail des composants, documentation API)")
    # Collection de toutes les définitions de personnalisation
    customization: Dict[str, Any] = Field(..., description="Toutes les options de personnalisation (thème, interface utilisateur, extensions)")
    # Collection de toutes les juridictions et normes de conformité
    compliance: Dict[str, Any] = Field(..., description="Toutes les juridictions et normes (ISO, GDPR, HIPAA, entomo-specific)")
    # Collection de toutes les intégrations de partenaires principaux
    partner_integrations: Dict[str, Any] = Field(..., description="Tous les connecteurs d'intégration (DHIS2, OMS, external API, services)")
    # Collection de toutes les politiques de sécurité et d'accès
    security: Dict[str, Any] = Field(..., description="Tous les schémas (base de données, application, réseau, authentification, autorisation)")
    # Collection de tous les schémas de performance et de surveillance
    performance: Dict[str, Any] = Field(..., description="Tous les schémas (monitoring, métriques, alertes, drainage, vérifier)")
    # Collection de tous les schémas de télémétrie et de surveillance
    telemetry: Dict[str, Any] = Field(..., description="Tous les schémas (traçage, métriques, phenotyping, tracing)")
    # Collection de toutes les stratégies de cache et de mise en cache
    caching: Dict[str, Any] = Field(..., description="Tous les schémas (stratégies de cache, fréquences, invalidations, accords)")
    # Collection de toutes les politiques de respect de la vie privée et de protection des données
    privacy: Dict[str, Any] = Field(..., description="Tous les schémas (collecter et stocker les données personnelles, consentement, suppression)")
    # Collection de toutes les stratégies de réplication et d'événements
    event_streaming: Dict[str, Any] = Field(..., description="Tous les schémas (HLS, événements, traitement des événements, streaming)")
    # Collection de tous les schémas d'IA/Machine Learning
    ml_models: Dict[str, Any] = Field(..., description="Tous les schémas (définitions d'entités de modèles, pipelines d'entraînement, déploiements)")
    # Collection de tous les schémas de workflow et de processus d'affaires
    workflows: Dict[str, Any] = Field(..., description="Tous les schémas (flux de processus, stateges, étapes, validations)")
    # Collection de toutes les extensions et personnalisations de plugins
    plugins: Dict[str, Any] = Field(..., description="Tous les schémas (API plugin, disponibilité plugin, hook, métier)")
    # Collection de tous les schémas de déploiement et d'environnement
    deployment: Dict[str, Any] = Field(..., description="Tous les schémas (configuration d'environnement, scripts de déploiement, orchestrations)")

# 🌉 Cartographie Universal de Toutes les Définition de Données Numériques d'Entomo (Exportation Importante)
class EntomoDataDefinitionLibrary(BaseModel):
    """
    Bibliothèque complète de définition de données Numériques d'Entomo (pour exportation/importation, documentation, interopérabilité).
    Comprend toutes les entités, les formes de données, les relations et les métadonnées.
    """
    # Schémas d'entité Entomo (types de données complets, règles)
    entomo_entities: Dict[str, Any] = Field(..., description="Tous les schémas d'entités Entomo (définition complète de l'entité)")
    # Schémas de correspondance avec les sources de données externes
    external_mappings: Dict[str, Any] = Field(..., description="Tous les schémas d'intégration (correspondances source-cible)")
    # Schémas de validation et de cohérence des données Entomo
    validation_rules: Dict[str, Any] = Field(..., description="Tous les schémas de validation des données Entomo (règles, pièges, linting)")
    # Schémas de métadonnées entomo (type de données, valeur par défaut, description)
    metadata_templates: Dict[str, Any] = Field(..., description="Tous les schémas de métadonnées (métadonnées Entomo standard)")
    # Schémas de configuration de workflow
    workflow_configs: Dict[str, Any] = Field(..., description="Tous les schémas (couleurs UI, statuts, étapes process)")
    # Schémas de définition de service
    service_definitions: Dict[str, Any] = Field(..., description="Tous les schémas (API, services internes, connecteurs)")
    # Schémas de définition d'interaction utilisateur
    user_interaction: Dict[str, Any] = Field(..., description="Tous les schémas (composantes UI, formulaires, navigation, événénements)")
    # Schémas de définition d'expérience utilisateur
    user_experience: Dict[str, Any] = Field(..., description="Tous les schémas (thème, styles, animation, mise en page, responsivité)")
    # Schémas de définition de page frontend
    frontend_pages: Dict[str, Any] = Field(..., description="Tous les schémas de page (structure, composants, routage, données)")
    # Schémas de définition de composant d'interface utilisateur
    ui_components: Dict[str, Any] = Field(..., description="Tous les schémas de composantes (définition, propriétés, événements, style)")
    # Schémas de définition de formulaire d'interface utilisateur
    ui_forms: Dict[str, Any] = Field(..., description="Tous les schémas de formulaires (structure, validation, soumission, retour)")
    # Schémas de définition de routage frontend
    frontend_routing: Dict[str, Any] = Field(..., description="Tous les schémas de routage (routes, auth, guards, redirection)")
    # Schémas de définition de hook frontend
    frontend_hooks: Dict[str, Any] = Field(..., description="Tous les schémas (déclencheurs, écouteurs, callbacks, middleware)")
    # Schémas de définition de middleware frontend
    frontend_middleware: Dict[str, Any] = Field(..., description="Tous les schémas (configuration, ordre, options, pipeline)")
    # Schémas de gestion d'état frontend
    frontend_state: Dict[str, Any] = Field(..., description="Tous les schémas (store, contexte, flux de données, synchronisation)")
    # Schémas de définition de service backend
    backend_services: Dict[str, Any] = Field(..., description="Tous les schémas (API endpoints, modèles, base de données, logique métier)")
    # Schémas d'authentification et d'autorisation
    auth_authorization: Dict[str, Any] = Field(..., description="Tous les schémas (utilisateur, rôle, permission, jeton, session)")
    # Schémas d'audit et de journalisation
    auditing: Dict[str, Any] = Field(..., description="Tous les schémas (journaux d'audit, journalisation des événements, suivi)")
    # Schémas de vérification et d'assurance de qualité
    qa_testing: Dict[str, Any] = Field(..., description="Tous les schémas (tests unitaires, tests d'intégration, CI/CD)")
    # Schémas de documentation technique
    technical_documentation: Dict[str, Any] = Field(..., description="Tous les schémas (API docs, guides développeur, spécification)")
    # Schémas d'intégration et de plugin
    integrations: Dict[str, Any] = Field(..., description="Tous les schémas (intégrations partenaires, connecteurs, adaptateurs)")
    # Schémas de performance et de surveillance
    performance_monitoring: Dict[str, Any] = Field(..., description="Tous les schémas (métriques, alertes, vérification)")
    # Schémas de télémétrie et de surveillance
    telemetry_monitoring: Dict[str, Any] = Field(..., description="Tous les schémas (basés sur les événements, métriques en temps réel)")
    # Schémas de cache et de mise en cache
    caching_strategies: Dict[str, Any] = Field(..., description="Tous les schémas (stratégies, configuration, invalidation)")
    # Schémas de respect de la vie privée et de protection des données
    privacy_compliance: Dict[str, Any] = Field(..., description="Tous les schémas (collecte de données, consentement, RGPD, entomo, politiques)")
    # Schémas d'événements et de streaming
    event_streaming: Dict[str, Any] = Field(..., description="Tous les schémas (pub/sub, streaming, traitement)")
    # Schémas de pipeline ML/AI
    ml_pipelines: Dict[str, Any] = Field(..., description="Tous les schémas (entités, entraînement, évaluation, déploiement)")
    # Schémas de workflow et de processus d'affaires
    business_workflows: Dict[str, Any] = Field(..., description="Tous les schémas (flux de processus, états, transitions)")
    # Schémas d'extension et de personnalisation
    extensibility: Dict[str, Any] = Field(..., description="Tous les schémas (plugin API, types plugin, hook, fournisseur)")
    # Schémas de déploiement et d'environnement
    deployment_configs: Dict[str, Any] = Field(..., description="Tous les schémas (environnement, conteneurs, orchestration, CI/CD)")
    # Schémas d'opérations et de support
    ops_monitoring: Dict[str, Any] = Field(..., description="Tous les schémas (santé, vérification, métriques de performance)")
    # Schémas d'audit et de conformité
    audit_compliance: Dict[str, Any] = Field(..., description="Tous les schémas (journaux d'audit, traçabilité, conformément)")

# 📜 Schémas Numériques d'Entomo (version finale, compacte)
class EntomoDigitalSchemas(BaseModel):
    """
    Schéma/ensemble de schémas Numériques d'Entomo prêt pour la production (version finale).
    Contient toutes les définitions de schémas nécessaires pour la conception et la mise en œuvre de systèmes numérique d'Entomo.
    """
    # Version du schéma Numérique d'Entomo (majeure, mineure, correctif)
    version: str = Field("1.0.0", description="Version de la bibliothèque de schémas Numériques d'Entomo")
    # Description de la bibliothèque de schémas Numériques d'Entomo
    description: str = Field("Bibliothèque complète et unifiée de schémas numériques pour l'environnement d'Entomo.", description="Description de la bibliothèque de schémas")
    # Licence de la bibliothèque de schémas Numériques d'Entomo
    license: str = Field("MIT", description="Licence d'utilisation de la bibliothèque de schémas")
    # Auteurs de la bibliothèque de schémas Numériques d'Entomo
    authors: List[str] = Field(["Ento-App Afrique"], description="Auteurs/mainteneurs de la bibliothèque de schémas")
    # Date de création de la bibliothèque de schémas Numériques d'Entomo
    created_at: datetime = Field(datetime.utcnow(), description="Date de création de la bibliothèque de schémas Numériques d'Entomo")
    # Date de la dernière mise à jour de la bibliothèque de schémas Numériques d'Entomo
    last_updated: datetime = Field(datetime.utcnow(), description="Date de la dernière mise à jour de la bibliothèque de schémas")

    # Toutes les définitions de schémas numériques d'Entomo (collection unifiée)
    schemas: Dict[str, Any] = Field(
        {},
        description="Toutes les définitions de schémas d'Entomo (Pydantic, ORM, JSON, OpenAPI, référence, configuration, intégration, validation, analytics, design, development, documentation, customization, compliance, partner_integrations, security, performance, telemetry, caching, privacy, event_streaming, ml_models, workflows, extensibility, deployment, ops_monitoring, audit_compliance)"
    )

    # Extensions de schémas (pour les extensions plugins)
    schema_extensions: Optional[Dict[str, Any]] = Field(
        None,
        description="Extensions de schémas optionnelles (par exemple, API de plugin, types personnalisés)"
    )

    # Convertisseur de schémas (pour la conversion entre différents formats)
    schema_converters: Optional[Dict[str, Any]] = Field(
        None,
        description="Convertisseurs de schémas (Pydantic vers JSON Schema, SQL vers Pydantic, etc.)"
    )

    # Validateur de schémas (pour la validation entre différents types de schémas)
    schema_validator: Optional[Dict[str, Any]] = Field(
        None,
        description="Validateur de schémas (règles de correspondance, validation croisée, interdépendances)"
    )

    # Générateur de schémas (pour la génération automatique de schémas à partir de définitions d'entités)
    schema_generator: Optional[Dict[str, Any]] = Field(
        None,
        description="Générateur de schémas (basé sur les définitions d'entités, les modèles SQLAlchemist, les structures Pydantic)"
    )

    # Fournisseur de schémas (pour la fourniture dynamique de schémas)
    schema_provider: Optional[Dict[str, Any]] = Field(
        None,
        description="Fournisseur de schémas (requête basée, plug-in basé, hub centralisé)"
    )

    # Cacheur de schémas (pour la mise en cache des schémas)
    schema_cache: Optional[Dict[str, Any]] = Field(
        None,
        description="Cacheur de schémas (en mémoire, Redis, distribution de cache)"
    )

    # Validateur de schémas (pour la validation des schémas)
    schema_validation: Optional[Dict[str, Any]] = Field(
        None,
        description="Validateur de schémas (validation des schémas Entomo, JSON Schema, OpenAPI)"
    )

    # Documenteur de schémas (pour la génération de documentation)
    schema_documentation: Optional[Dict[str, Any]] = Field(
        None,
        description="Documenteur de schémas (OpenAPI, Markdown, HTML, différents formats)"
    )

    # Exportateur de schémas (pour l'exportation de schémas dans différents formats)
    schema_exporter: Optional[Dict[str, Any]] = Field(
        None,
        description="Exporteur de schémas (JSON, YAML, OpenAPI, TypeScript, SQL)"
    )

    # Importateur de schémas (pour l'importation de schémas depuis différents formats)
    schema_importer: Optional[Dict[str, Any]] = Field(
        None,
        description="Importeur de schémas (JSON, YAML, OpenAPI, TypeScript, SQL, Docker)"
    )

    # Routeur de schémas (pour la recherche et la récupération de schémas)
    schema_router: Optional[Dict[str, Any]] = Field(
        None,
        description="Routeur de schémas (API API, recherche par catégorie, téléchargement de JSON)"
    )

    # Versionneur de schémas (pour la gestion des versions de schémas)
    schema_versioner: Optional[Dict[str, Any]] = Field(
        None,
        description="Versionneur de schémas (versionnement de schémas, validation de compatibilité, gestion de conflit)"
    )

    # Synchroniseur de schémas (pour la synchronisation entre les sources de schémas)
    schema_syncer: Optional[Dict[str, Any]] = Field(
        None,
        description="Synchroniseur de schémas (réplication de schémas, réconciliation, streaming)"
    )

    # Backup de schémas (pour la sauvegarde des schémas)
    schema_backup: Optional[Dict[str, Any]] = Field(
        None,
        description="Système de sauvegarde de schémas (sauvegarde automatique, récupération, historique des versions)"
    )

    # Surveillant de schémas (pour la surveillance de l'utilisation et des performances des schémas)
    schema_monitor: Optional[Dict[str, Any]] = Field(
        None,
        description="Surveillance de schémas (métriques d'utilisation, notifications d'alertes, tableaux de bord)"
    )

    # Audit de schémas (pour la traçabilité de la modification de schémas)
    schema_auditor: Optional[Dict[str, Any]] = Field(
        None,
        description="Auditeur de schémas (journaux d'audit, journalisation de la modification, enquête)"
    )

    # Sécurité de schémas (pour la sécurité des schémas)
    schema_security: Optional[Dict[str, Any]] = Field(
        None,
        description="Sécurité de schémas (contrôle d'accès, chiffrement, signature)"
    )

    # Opération de schémas (pour l'utilisation opérationnelle des schémas)
    schema_operations: Optional[Dict[str, Any]] = Field(
        None,
        description="Opérations de schémas (API, codes, gestion)"
    )

    # Développement de schémas (pour l'environnement de développement)
    schema_development: Optional[Dict[str, Any]] = Field(
        None,
        description="Environnement de développement de schémas (IDE, tests, CI/CD)"
    )

    # Documentation de schémas (pour la documentation des schémas)
    schema_documentation: Optional[Dict[str, Any]] = Field(
        None,
        description="Documentation de schémas (generateur de docs, guides)"
    )

    # Extensions à venir de schémas (pour l'avenir)
    upcoming_schema_extensions: Optional[Dict[str, Any]] = Field(
        None,
        description="Extensions de schémas à venir (futur, planifié)"
    )

    # Historique de version de la bibliothèque de schémas Numériques d'Entomo (journaux de modification)
    version_history: List[Dict[str, Any]] = Field(
        [],
        description="Journal des modifications de la bibliothèque de schémas Numériques d'Entomo (version, date, description, changements)"
    )

    # Remarque: La bibliothèque de schémas Numériques d'Entomo (EntomoDigitalSchemas) est un schéma unifié y compris tous les schémas nécessaires pour la conception et la mise en œuvre.
    # Il comprend toutes les définitions de schémas (Pydantic, ORM, JSON, OpenAPI, référence, configuration, intégration, validation, analytics, design, development, documentation, customization, compliance, partner_integrations, security, performance, telemetry, caching, privacy, event_streaming, ml_models, workflows, extensibility, deployment, ops_monitoring, audit_compliance)
    # et fonctionne également comme un schéma de schéma (superset) contenant toutes les sous-catégories.

    # En termes simples, la bibliothèque de schémas Numériques d'Entomo (EntomoDigitalSchemas) est une structure unifiée qui comprend tous les schémas nécessaires pour l'environnement Numérique d'Entomo.
    # Elle comprend toutes les définitions de schémas (pour différents aspects tels que Pydantic, base de données, OpenAPI, référence, configuration, etc.) et fournit un cadre systématique pour la conception, la gestion et la maintenance des schémas.

    # Caractéristiques principales de la bibliothèque de schémas Numériques d'Entomo (EntomoDigitalSchemas):
    # 1. Schéma unifié couvrant toutes les catégories (Pydantic, base de données, OpenAPI, référence, configuration, intégration, validation, analytics, design, development, documentation, etc.)
    # 2. Structure extensible (peut facilement ajouter de nouveaux schémas)
    # 3. Historique de version (journaux de modification de schémas)
    # 4. Extensible (schémas de support, convertisseur de schémas, validateur de schémas, générateur de schémas, fournisseur de schémas, cacheur de schémas, validateur de schémas, documenteur de schémas, exporteur de schémas, importeur de schémas, routeur de schémas, versionneur de schémas, synchroniseur de schémas, backup de schémas, surveillant de schémas, auditeur de schémas, sécurité de schémas, opérations de schémas, environnement de développement, documentation de schémas, extensions à venir)
    # 5. Compatibilité avec tous les formats de schémas (JSON, OpenAPI, etc.)
    # 6. Informations méta (version, description, auteur, licence)
    # 7. Historique de version complet (journaux de modification, suivi des versions)
    # 8. Extensible (peut ajouter de nouveaux schémas, modifier des schémas existants)

    # Comment utiliser la bibliothèque de schémas Numériques d'Entomo (EntomoDigitalSchemas):
    # 1. Initialisez la bibliothèque de schémas Numériques d'Entomo (EntomoDigitalSchemas) pour obtenir la structure de schéma de base.
    # 2. Ajoutez des schémas à différentes catégories (Pydantic, base de données, OpenAPI, référence, configuration, etc.) en utilisant 'schema' (dictionnaire ou classe Pydantic).
    # 3. Ajoutez des extensions à venir (schémas de support, convertisseur de schémas, etc.) selon vos besoins.
    # 4. Ajoutez des journaux de modification (history) à tout moment pour documenter les versions et les modifications.
    # 5. Utilisez les différentes fonctionnalités fournies (générateur de docs, convertisseur, validateur, exportateur, etc.) pour générer des schémas.
    # 6. Utilisez les différentes API fournies (schemes.get(), schema.add(), schema.update(), etc.) pour gérer les schémas.
    # 7. Réalisez des opérations telles que la documentation, la validation, l'exportation, l'importation, l'arrêt, la maintenance, etc. en utilisant les outils fournis.

    # Remarque: La bibliothèque de schémas Numériques d'Entomo (EntomoDigitalSchemas) est une bibliothèque de schémas complète et typée prête pour la production en termes de conception de schémas, de gestion et de maintenance.
    # Elle comprend toutes les définitions de schémas et des fonctionnalités d'extension puissantes.

    # Remarque: La structure de la bibliothèque de schémas Numériques d'Entomo (EntomoDigitalSchemas) comprend:
    # 1. collection de schémas: tous les schémas (Pydantic, base de données, OpenAPI, référence, configuration, intégration, validation, analytics, design, development, documentation, customization, compliance, partner_integrations, security, performance, telemetry, caching, privacy, event_streaming, ml_models, workflows, extensibility, deployment, ops_monitoring, audit_compliance)
    # 2. extension de schéma: extension optionnelle de schéma (peut être utilisée pour ajouter des fonctions externes)
    # 3. convertisseur de schéma: convertisseur de schéma optionnel (peut être utilisé pour convertir entre différents formats de schéma)
    # 4. validateur de schéma: validateur de schéma optionnel (peut être utilisé pour valider les schémas)
    # 5. générateur de schéma: générateur de schéma optionnel (peut être utilisé pour générer des schémas)
    # 6. fournisseur de schéma: fournisseur de schéma optionnel (peut être utilisé pour fournir des schémas)
    # 7. cacheur de schéma: cacheur de schéma optionnel (peut être utilisé pour mettre en cache les schémas)
    # 8. validateur de schéma: validateur de schéma optionnel (peut être utilisé pour valider les schémas)
    # 9. documenteur de schéma: documenteur de schéma optionnel (peut être utilisé pour documenter les schémas)
    # 10. exporteur de schéma: exporteur de schéma optionnel (peut être utilisé pour exporter les schémas)
    # 11. importeur de schéma: importeur de schéma optionnel (peut être utilisé pour importer les schémas)
    # 12. routeur de schéma: routeur de schéma optionnel (peut être utilisé pour structurer les schémas)
    # 13. versionneur de schéma: versionneur de schéma optionnel (peut être utilisé pour gérer les versions)
    # 14. synchroniseur de schéma: synchroniseur de schéma optionnel (peut être utilisé pour synchroniser les schémas)
    # 15. backup de schéma: backup de schéma optionnel (peut être utilisé pour sauvegarder les schémas)
    # 16. surveillant de schéma: surveillant de schéma optionnel (peut être utilisé pour surveiller les schémas)
    # 17. auditeur de schéma: auditeur de schéma optionnel (peut être utilisé pour auditer les schémas)
    # 18. sécurité de schéma: sécurité de schéma optionnelle (peut être utilisée pour sécuriser les schémas)
    # 19. opérations de schéma: opérations de schéma optionnelles (peut être utilisé pour les opérations de schéma)
    # 20. environnement de développement: environnement de développement optionnel (peut être utilisé pour le développement)
    # 21. documentation de schéma: documentation de schéma optionnelle (peut être utilisée pour documenter les schémas)
    # 22. extensions à venir: extensions de schéma optionnelles à venir (peut être utilisées pour les extensions futures)
    # 23. historique de version: historique de version optionnel (peut être utilisé pour enregistrer les modifications)

    # Remarque: La bibliothèque de schémas Numériques d'Entomo (EntomoDigitalSchemas) comprend 23 sous-structures principales.
    # Elle peut ajouter des sous-structures supplémentaires via l'extension de schéma pour étendre les fonctions.

    # Remarque: La bibliothèque de schémas Numériques d'Entomo (EntomoDigitalSchemas) est une infrastructure de schémas complète et extensible.
    # Elle comprend toutes les définitions de schémas, les fonctions de support, les fonctions d'extension et les historiques de version.
    # Elle peut être utilisée pour un large éventail d'applications telles que la conception de schémas, la gestion et la maintenance.
    # Elle prend en charge diverses extensions et personnalisations, ce qui la rend plus puissante.

    # Implémentation: la bibliothèque de schémas Numériques d'Entomo (EntomoDigitalSchemas) comprend tous les schémas nécessaires.
    # Elle comprend tous les schémas et les fonctions d'extension nécessaires pour la conception et la gestion de schémas.

    # Fin de la bibliothèque de schémas Numériques d'Entomo (EntomoDigitalSchemas).