"""Client HTTP DHIS2 : test de connexion et envoi de dataValueSets."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.crypto import decrypt_secret
from app.services.http_retry import request_with_retry
from app.models.capture import Capture
from app.models.dhis2 import DHIS2Config, DHIS2Mapping
from app.models.intervention import Intervention
from app.models.site import SiteSentinelle


def _normalize_url(url: str) -> str:
    return url.rstrip("/")


def _resolve_password(config: DHIS2Config, override_password: Optional[str] = None) -> Optional[str]:
    if override_password:
        return override_password
    if config.credential_enc:
        try:
            return decrypt_secret(config.credential_enc)
        except ValueError:
            return None
    return None


def credentials_ready(config: DHIS2Config, override_password: Optional[str] = None) -> bool:
    """True si l'URL, l'utilisateur et le mot de passe DHIS2 sont disponibles."""
    if not config or not config.url or not config.username:
        return False
    return bool(_resolve_password(config, override_password))


def _aggregate_indicator(db: Session, indicator: str) -> float:
    key = indicator.strip().lower()
    if key in {"total_captures", "captures_total", "nombre_captures"}:
        return float(db.query(func.count(Capture.id)).filter(Capture.statut == "valide").scalar() or 0)
    if key in {"total_individus", "individus_total"}:
        return float(db.query(func.coalesce(func.sum(Capture.nombre_individus), 0)).scalar() or 0)
    if key in {"sites_actifs", "total_sites"}:
        return float(db.query(func.count(SiteSentinelle.id)).filter(SiteSentinelle.actif.is_(True)).scalar() or 0)
    if key in {"interventions_realisees", "total_interventions"}:
        return float(db.query(func.count(Intervention.id)).filter(Intervention.statut == "realisee").scalar() or 0)
    if key in {"captures_a_valider", "pending_captures"}:
        return float(db.query(func.count(Capture.id)).filter(Capture.statut == "a_valider").scalar() or 0)
    return float(db.query(func.count(Capture.id)).scalar() or 0)


_PLACEHOLDER_ELEMENTS = frozenset({"ENTO_DEFAULT", "ENTO_CAPTURE"})


def build_data_value_set(db: Session, config: DHIS2Config) -> Dict[str, Any]:
    mappings: List[DHIS2Mapping] = (
        db.query(DHIS2Mapping)
        .filter(DHIS2Mapping.config_id == config.id, DHIS2Mapping.actif.is_(True))
        .all()
    )
    period = _resolve_period(config)
    org_unit = config.org_unit
    if not org_unit or org_unit == "UNKNOWN":
        raise ValueError(
            "Unité organisationnelle DHIS2 non configurée. "
            "Renseignez org_unit dans Paramètres DHIS2 avant la synchronisation."
        )
    data_values = []
    for mapping in mappings:
        if not mapping.element_dhis2 or mapping.element_dhis2 in _PLACEHOLDER_ELEMENTS:
            continue
        value = _aggregate_indicator(db, mapping.indicateur_local)
        data_values.append({
            "dataElement": mapping.element_dhis2,
            "period": period,
            "orgUnit": org_unit,
            "value": str(int(value) if value == int(value) else round(value, 4)),
        })
    if not data_values:
        raise ValueError(
            "Aucun mapping DHIS2 actif valide. Configurez les dataElements dans Paramètres DHIS2."
        )
    payload: Dict[str, Any] = {"dataValues": data_values}
    if config.data_set:
        payload["dataSet"] = config.data_set
    return payload


def _resolve_period(config: DHIS2Config) -> str:
    """Résout la période DHIS2 (YYYYMM) depuis la config."""
    periode = (config.periode or "").strip().lower()
    if periode in {"mensuel", "monthly", "mois"}:
        return datetime.utcnow().strftime("%Y%m")
    if len(periode) == 6 and periode.isdigit():
        return periode
    return datetime.utcnow().strftime("%Y%m")


def test_connection(config: DHIS2Config, password: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    if not credentials_ready(config, password):
        return False, "Identifiants DHIS2 incomplets — configurez l'utilisateur et le mot de passe dans Paramètres DHIS2.", None
    auth_password = _resolve_password(config, password)
    url = f"{_normalize_url(config.url)}/api/system/info"
    try:
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            response = request_with_retry(client, "GET", url, auth=(config.username, auth_password))
        if response.status_code == 200:
            return True, "Connexion DHIS2 établie", response.json()
        return False, f"DHIS2 a répondu {response.status_code}: {response.text[:200]}", None
    except httpx.RequestError as exc:
        return False, f"Connexion impossible: {exc}", None


def fetch_catalog(
    config: DHIS2Config,
    password: Optional[str] = None,
) -> Tuple[bool, str, Dict[str, Any]]:
    """Récupère orgUnits et dataElements depuis l'API DHIS2."""
    if not credentials_ready(config, password):
        return False, "Identifiants DHIS2 incomplets", {}
    auth_password = _resolve_password(config, password)
    base = _normalize_url(config.url)
    catalog: Dict[str, Any] = {"orgUnits": [], "dataElements": [], "dataSets": []}
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            for endpoint, key, fields in [
                ("/api/organisationUnits?fields=id,name,level&paging=false", "orgUnits", None),
                ("/api/dataElements?fields=id,name&paging=false", "dataElements", None),
                ("/api/dataSets?fields=id,name&paging=false", "dataSets", None),
            ]:
                response = request_with_retry(
                    client, "GET", f"{base}{endpoint}", auth=(config.username, auth_password)
                )
                if response.status_code == 200:
                    data = response.json()
                    items = data.get(key, data.get("organisationUnits", []))
                    catalog[key] = [
                        {"id": item.get("id"), "name": item.get("name")}
                        for item in (items if isinstance(items, list) else [])
                    ]
        return True, f"Catalogue chargé ({len(catalog['orgUnits'])} orgUnits)", catalog
    except httpx.RequestError as exc:
        return False, f"Impossible de charger le catalogue: {exc}", catalog


def push_data_values(
    db: Session,
    config: DHIS2Config,
    password: Optional[str] = None,
) -> Tuple[bool, str, Dict[str, Any], int]:
    if not credentials_ready(config, password):
        return False, "Identifiants DHIS2 incomplets — configurez l'utilisateur et le mot de passe dans Paramètres DHIS2.", {}, 0
    auth_password = _resolve_password(config, password)

    try:
        payload = build_data_value_set(db, config)
    except ValueError as exc:
        return False, str(exc), {}, 0
    count = len(payload.get("dataValues", []))
    url = f"{_normalize_url(config.url)}/api/dataValueSets"
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            response = request_with_retry(
                client, "POST", url, json=payload, auth=(config.username, auth_password)
            )
        if response.status_code in {200, 201, 204}:
            return True, f"{count} valeur(s) transmise(s) à DHIS2", payload, count
        return False, f"Échec DHIS2 ({response.status_code}): {response.text[:300]}", payload, count
    except httpx.RequestError as exc:
        return False, f"Transmission impossible: {exc}", payload, count


def build_capture_data_value_set(
    db: Session,
    config: DHIS2Config,
    capture_id: int,
) -> Tuple[Optional[Dict[str, Any]], str]:
    capture = db.query(Capture).filter(Capture.id == capture_id).first()
    if not capture:
        return None, "Capture introuvable"
    if capture.statut != "valide":
        return None, "Seules les captures validées peuvent être synchronisées"

    mappings: List[DHIS2Mapping] = (
        db.query(DHIS2Mapping)
        .filter(DHIS2Mapping.config_id == config.id, DHIS2Mapping.actif.is_(True))
        .all()
    )
    period = _resolve_period(config)
    org_unit = config.org_unit
    if not org_unit or org_unit == "UNKNOWN":
        return None, "Unité organisationnelle DHIS2 non configurée"
    data_values = []
    for mapping in mappings:
        if not mapping.element_dhis2 or mapping.element_dhis2 in _PLACEHOLDER_ELEMENTS:
            continue
        indicator = mapping.indicateur_local.strip().lower()
        if indicator in {"capture_individus", "nombre_individus", "individus_capture"}:
            value = capture.nombre_individus or 0
        elif indicator in {"capture_espece", "espece_capture"}:
            value = 1
        else:
            value = capture.nombre_individus or 1
        data_values.append({
            "dataElement": mapping.element_dhis2,
            "period": period,
            "orgUnit": org_unit,
            "value": str(value),
            "comment": f"Entomo capture #{capture.id} — {capture.espece}",
        })
    if not data_values:
        return None, "Aucun mapping DHIS2 valide pour cette capture"
    payload: Dict[str, Any] = {"dataValues": data_values}
    if config.data_set:
        payload["dataSet"] = config.data_set
    return payload, "ok"


def push_capture_to_dhis2(
    db: Session,
    config: DHIS2Config,
    capture_id: int,
    password: Optional[str] = None,
) -> Tuple[bool, str, Dict[str, Any], int]:
    if not credentials_ready(config, password):
        return False, "Identifiants DHIS2 incomplets", {}, 0
    payload, reason = build_capture_data_value_set(db, config, capture_id)
    if payload is None:
        return False, reason, {}, 0
    auth_password = _resolve_password(config, password)
    count = len(payload.get("dataValues", []))
    url = f"{_normalize_url(config.url)}/api/dataValueSets"
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            response = request_with_retry(
                client, "POST", url, json=payload, auth=(config.username, auth_password)
            )
        if response.status_code in {200, 201, 204}:
            return True, f"Capture #{capture_id} transmise à DHIS2", payload, count
        return False, f"Échec DHIS2 ({response.status_code}): {response.text[:300]}", payload, count
    except httpx.RequestError as exc:
        return False, f"Transmission impossible: {exc}", payload, count
