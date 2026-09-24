"""Moteur d'analytics pour les tableaux de bord Entomo."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.capture import Capture
from app.models.dhis2 import DHIS2Sync
from app.models.dataset import Dataset
from app.models.intervention import Intervention
from app.models.model import MLModel
from app.models.site import SiteSentinelle
from app.models.user import User

# Région Médicale 5 — sud-est Sénégal (PNLP)
REGION_MEDICALE_5 = frozenset({
    "Kédougou", "Tambacounda", "Kolda", "Sédhiou", "Ziguinchor",
})

SENEGAL_REGIONS = [
    "Dakar", "Thiès", "Diourbel", "Fatick", "Kaolack", "Kaffrine",
    "Kédougou", "Tambacounda", "Ziguinchor", "Sédhiou", "Kolda",
    "Saint-Louis", "Louga", "Matam",
]

PERIOD_MAP = {
    "1S": 7, "1M": 30, "3M": 90, "1A": 365, "Max": None,
    "7j": 7, "30j": 30, "90j": 90, "365j": 365,
}


def _parse_period(period: Optional[str]) -> Optional[datetime]:
    if not period or period.lower() in {"max", "toutes", "all", "personnalisée"}:
        return None
    days = PERIOD_MAP.get(period) or PERIOD_MAP.get(period.upper())
    if days is None:
        return None
    return datetime.utcnow() - timedelta(days=days)


def _base_capture_query(
    db: Session,
    *,
    region: Optional[str] = None,
    espece: Optional[str] = None,
    environnement: Optional[str] = None,
    period: Optional[str] = None,
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None,
    statut: Optional[str] = None,
    methode: Optional[str] = None,
):
    query = db.query(Capture).join(SiteSentinelle, Capture.site_id == SiteSentinelle.id)
    if region and region.lower() not in {"toutes", "all", ""}:
        if region.lower() in {"region 5", "région 5", "rm5"}:
            query = query.filter(SiteSentinelle.region.in_(REGION_MEDICALE_5))
        else:
            query = query.filter(SiteSentinelle.region.ilike(f"%{region}%"))
    if espece and espece.lower() not in {"toutes", "all", ""}:
        query = query.filter(Capture.espece.ilike(f"%{espece}%"))
    if environnement and environnement.lower() not in {"tous", "toutes", "all", ""}:
        query = query.filter(SiteSentinelle.environnement.ilike(f"%{environnement}%"))
    if statut:
        query = query.filter(Capture.statut == statut)
    if methode:
        query = query.filter(Capture.methode_capture.ilike(f"%{methode}%"))

    since = _parse_period(period)
    if since:
        query = query.filter(Capture.date_capture >= since)
    if date_debut:
        try:
            query = query.filter(Capture.date_capture >= datetime.fromisoformat(date_debut))
        except ValueError:
            pass
    if date_fin:
        try:
            query = query.filter(Capture.date_capture <= datetime.fromisoformat(date_fin))
        except ValueError:
            pass
    return query


def _site_query(db: Session, region: Optional[str] = None):
    query = db.query(SiteSentinelle)
    if region and region.lower() not in {"toutes", "all", ""}:
        if region.lower() in {"region 5", "région 5", "rm5"}:
            query = query.filter(SiteSentinelle.region.in_(REGION_MEDICALE_5))
        else:
            query = query.filter(SiteSentinelle.region.ilike(f"%{region}%"))
    return query


def _dominant_species(captures: List[Capture]) -> Optional[str]:
    if not captures:
        return None
    counter = Counter(c.espece_corrigee or c.espece for c in captures if c.espece)
    if not counter:
        return None
    return counter.most_common(1)[0][0]


def _compute_density(captures: List[Capture], active_sites: int) -> float:
    if active_sites <= 0:
        return 0.0
    individuals = sum(c.nombre_individus or 0 for c in captures)
    return round(individuals / active_sites, 2)


def _compute_irs_coverage(db: Session, region: Optional[str] = None) -> float:
    """Couverture IRS estimée depuis interventions réalisées / sites actifs."""
    sites_q = _site_query(db, region)
    active_sites = sites_q.filter(SiteSentinelle.actif.is_(True)).count()
    if active_sites == 0:
        return 0.0
    interventions = db.query(Intervention).filter(Intervention.statut == "realisee").count()
    base_coverage = min(95.0, 40.0 + (interventions / max(active_sites, 1)) * 15.0)
    if region and region.lower() in {"region 5", "région 5", "rm5"}:
        base_coverage = max(0.0, base_coverage - 5.0)
    return round(base_coverage, 1)


def _risk_level(captures_count: int, individuals: int, confidence: float) -> str:
    risk_score = min(1.0, (captures_count / 10) * 0.55 + (individuals / 100) * 0.3 + ((100 - confidence) / 100) * 0.15)
    if risk_score >= 0.7:
        return "critique"
    if risk_score >= 0.4:
        return "vigilance"
    return "faible"


def generate_alertes(db: Session, region: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
    alertes: List[Dict[str, Any]] = []
    sites = _site_query(db, region).filter(SiteSentinelle.actif.is_(True)).all()
    site_ids = [s.id for s in sites]
    captures = db.query(Capture).filter(Capture.site_id.in_(site_ids)).all() if site_ids else []
    by_site: Dict[int, List[Capture]] = defaultdict(list)
    for cap in captures:
        by_site[cap.site_id].append(cap)

    alert_id = 1
    for site in sites:
        items = by_site[site.id]
        individuals = sum(c.nombre_individus or 0 for c in items)
        confidence = (
            round(sum((c.confidence_ia or 0) for c in items) / len(items) * 100, 1) if items else 0
        )
        niveau = _risk_level(len(items), individuals, confidence)
        if niveau == "critique":
            alertes.append({
                "id": alert_id,
                "type": "epidemiologique",
                "niveau": "critique",
                "message": f"Risque élevé au site {site.nom} ({individuals} individus, {len(items)} captures)",
                "localisation": f"{site.region} — {site.nom}",
                "date": datetime.utcnow().isoformat(),
                "site_id": site.id,
            })
            alert_id += 1

        pending = sum(1 for c in items if c.statut == "a_valider")
        if pending >= 5:
            alertes.append({
                "id": alert_id,
                "type": "validation",
                "niveau": "modere",
                "message": f"{pending} captures en attente de validation — {site.nom}",
                "localisation": site.region or site.nom,
                "date": datetime.utcnow().isoformat(),
                "site_id": site.id,
            })
            alert_id += 1

    invasive = db.query(Capture).filter(
        Capture.espece.ilike("%albopictus%")
    ).order_by(Capture.date_capture.desc()).limit(3).all()
    for cap in invasive:
        site = db.query(SiteSentinelle).filter(SiteSentinelle.id == cap.site_id).first()
        alertes.append({
            "id": alert_id,
            "type": "espece",
            "niveau": "eleve",
            "message": f"Espèce invasive détectée : {cap.espece}",
            "localisation": site.region if site else "Inconnu",
            "date": (cap.date_capture or datetime.utcnow()).isoformat(),
            "capture_id": cap.id,
        })
        alert_id += 1

    last_sync = db.query(DHIS2Sync).order_by(DHIS2Sync.date_sync.desc()).first()
    if last_sync and last_sync.statut in {"error", "echec", "failed"}:
        alertes.append({
            "id": alert_id,
            "type": "sync",
            "niveau": "modere",
            "message": f"Échec synchronisation DHIS2 : {last_sync.message or last_sync.statut}",
            "localisation": "National",
            "date": last_sync.date_sync.isoformat() if last_sync.date_sync else datetime.utcnow().isoformat(),
        })

    return alertes[:limit]


def get_stats(
    db: Session,
    *,
    region: Optional[str] = None,
    espece: Optional[str] = None,
    environnement: Optional[str] = None,
    period: Optional[str] = None,
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None,
) -> Dict[str, Any]:
    cap_q = _base_capture_query(
        db, region=region, espece=espece, environnement=environnement, period=period,
        date_debut=date_debut, date_fin=date_fin,
    )
    captures = cap_q.all()
    sites_q = _site_query(db, region)
    total_sites = sites_q.count()
    sites_actifs = sites_q.filter(SiteSentinelle.actif.is_(True)).count()

    total_captures = len(captures)
    captures_a_valider = sum(1 for c in captures if c.statut == "a_valider")
    captures_validees = sum(1 for c in captures if c.statut == "valide")
    densite_moyenne = _compute_density(captures, sites_actifs)
    espece_dominante = _dominant_species(captures) or "N/A"
    couverture_irs = _compute_irs_coverage(db, region)
    alertes = generate_alertes(db, region=region)

    # Stats Région Médicale 5
    rm5_captures = _base_capture_query(db, region="region 5", period=period).all()
    rm5_sites = _site_query(db, "region 5").filter(SiteSentinelle.actif.is_(True)).count()
    region5 = {
        "densite_moyenne": _compute_density(rm5_captures, rm5_sites),
        "alertes_actives": len([a for a in generate_alertes(db, region="region 5") if a["niveau"] in {"critique", "eleve"}]),
        "espece_dominante": _dominant_species(rm5_captures) or "N/A",
        "couverture_irs": _compute_irs_coverage(db, "region 5"),
        "captures_total": len(rm5_captures),
        "sites_actifs": rm5_sites,
        "regions": sorted(REGION_MEDICALE_5),
    }

    derniere_sync = db.query(DHIS2Sync).order_by(DHIS2Sync.date_sync.desc()).first()

    return {
        "sites": {"total": total_sites, "actifs": sites_actifs},
        "captures": {
            "total": total_captures,
            "a_valider": captures_a_valider,
            "validees": captures_validees,
            "densite_moyenne": densite_moyenne,
        },
        "datasets": {"total": db.query(Dataset).count()},
        "modeles": {"deployes": db.query(MLModel).filter(MLModel.deploye.is_(True)).count()},
        "utilisateurs": {"actifs": db.query(User).filter(User.is_active.is_(True)).count()},
        "dhis2": {
            "derniere_sync": derniere_sync.date_sync.isoformat() if derniere_sync and derniere_sync.date_sync else None,
            "dernier_statut": derniere_sync.statut if derniere_sync else None,
        },
        "densite_moyenne": densite_moyenne,
        "espece_dominante": espece_dominante,
        "couverture_irs": couverture_irs,
        "alertes_actives": len([a for a in alertes if a["niveau"] in {"critique", "eleve"}]),
        "alertes": alertes,
        "region5": region5,
    }


def captures_par_espece(db: Session, **filters) -> List[Dict[str, Any]]:
    captures = _base_capture_query(db, **filters).all()
    counter = Counter(c.espece_corrigee or c.espece for c in captures if c.espece)
    total = sum(counter.values()) or 1
    return [
        {"espece": esp, "count": cnt, "pct": round(cnt / total * 100, 1)}
        for esp, cnt in counter.most_common(20)
    ]


def captures_par_site(db: Session, **filters) -> List[Dict[str, Any]]:
    captures = _base_capture_query(db, **filters).all()
    by_site: Dict[int, Dict[str, Any]] = defaultdict(lambda: {"count": 0, "individus": 0})
    site_names: Dict[int, Tuple[str, str]] = {}
    for cap in captures:
        by_site[cap.site_id]["count"] += 1
        by_site[cap.site_id]["individus"] += cap.nombre_individus or 0
    sites = db.query(SiteSentinelle).filter(SiteSentinelle.id.in_(list(by_site.keys()) or [0])).all()
    for site in sites:
        site_names[site.id] = (site.nom, site.region or "")
    results = []
    for site_id, data in sorted(by_site.items(), key=lambda x: x[1]["count"], reverse=True):
        nom, reg = site_names.get(site_id, ("Inconnu", ""))
        results.append({"site": nom, "region": reg, "count": data["count"], "individus": data["individus"]})
    return results[:30]


def captures_par_region(db: Session, **filters) -> List[Dict[str, Any]]:
    captures = _base_capture_query(db, **filters).all()
    by_region: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"count": 0, "individus": 0, "sites": set()})
    site_regions: Dict[int, str] = {}
    for site in db.query(SiteSentinelle).all():
        site_regions[site.id] = site.region or "Inconnu"
    for cap in captures:
        reg = site_regions.get(cap.site_id, "Inconnu")
        by_region[reg]["count"] += 1
        by_region[reg]["individus"] += cap.nombre_individus or 0
        by_region[reg]["sites"].add(cap.site_id)
    results = []
    for region, data in sorted(by_region.items(), key=lambda x: x[1]["count"], reverse=True):
        site_count = len(data["sites"]) or 1
        densite = round(data["individus"] / site_count, 2)
        risque = _risk_level(data["count"], data["individus"], 80.0)
        results.append({
            "region": region,
            "count": data["count"],
            "individus": data["individus"],
            "densite": densite,
            "sites": site_count,
            "risque": risque,
        })
    return results


def captures_par_methode(db: Session, **filters) -> List[Dict[str, Any]]:
    captures = _base_capture_query(db, **filters).all()
    counter = Counter(c.methode_capture or "Non spécifié" for c in captures)
    return [{"methode": m, "count": c} for m, c in counter.most_common()]


def captures_par_statut(db: Session, **filters) -> List[Dict[str, Any]]:
    captures = _base_capture_query(db, **filters).all()
    counter = Counter(c.statut or "inconnu" for c in captures)
    return [{"statut": s, "count": c} for s, c in counter.most_common()]


def densite_evolution(
    db: Session,
    *,
    granularity: str = "week",
    region: Optional[str] = None,
    espece: Optional[str] = None,
    environnement: Optional[str] = None,
    period: Optional[str] = None,
) -> List[Dict[str, Any]]:
    captures = _base_capture_query(db, region=region, espece=espece, environnement=environnement, period=period or "1A").all()
    buckets: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"captures": 0, "individus": 0})

    for cap in captures:
        if not cap.date_capture:
            continue
        dt = cap.date_capture
        if granularity == "day":
            key = dt.strftime("%Y-%m-%d")
        elif granularity == "month":
            key = dt.strftime("%Y-%m")
        else:
            iso = dt.isocalendar()
            key = f"{iso.year}-W{iso.week:02d}"
        buckets[key]["captures"] += 1
        buckets[key]["individus"] += cap.nombre_individus or 0

    sites_actifs = _site_query(db, region).filter(SiteSentinelle.actif.is_(True)).count() or 1
    results = []
    for date_key in sorted(buckets.keys()):
        data = buckets[date_key]
        results.append({
            "date": date_key,
            "captures": data["captures"],
            "individus": data["individus"],
            "densite": round(data["individus"] / sites_actifs, 2),
        })
    return results


def heatmap_data(db: Session, **filters) -> List[Dict[str, Any]]:
    captures = _base_capture_query(db, **filters).all()
    by_site: Dict[int, int] = defaultdict(int)
    for cap in captures:
        by_site[cap.site_id] += cap.nombre_individus or 1
    sites = db.query(SiteSentinelle).filter(
        SiteSentinelle.id.in_(list(by_site.keys()) or [0]),
        SiteSentinelle.latitude.isnot(None),
        SiteSentinelle.longitude.isnot(None),
    ).all()
    return [
        {
            "lat": float(site.latitude),
            "lng": float(site.longitude),
            "weight": by_site.get(site.id, 0),
            "region": site.region,
            "site": site.nom,
        }
        for site in sites
    ]


def interventions_stats(db: Session, region: Optional[str] = None) -> Dict[str, int]:
    query = db.query(Intervention)
    if region and region.lower() not in {"toutes", "all", ""}:
        if region.lower() in {"region 5", "région 5", "rm5"}:
            query = query.filter(Intervention.region.in_(REGION_MEDICALE_5))
        else:
            query = query.filter(Intervention.region.ilike(f"%{region}%"))
    total = query.count()
    planifiees = query.filter(Intervention.statut == "planifiee").count()
    en_cours = query.filter(Intervention.statut == "en_cours").count()
    realisees = query.filter(Intervention.statut == "realisee").count()
    return {"total": total, "planifiees": planifiees, "en_cours": en_cours, "realisees": realisees}


def region_detail(db: Session, region_name: str) -> Dict[str, Any]:
    stats = get_stats(db, region=region_name)
    return {
        "region": region_name,
        "stats": stats,
        "par_espece": captures_par_espece(db, region=region_name),
        "par_site": captures_par_site(db, region=region_name),
        "evolution": densite_evolution(db, region=region_name, granularity="week"),
        "heatmap": heatmap_data(db, region=region_name),
    }
