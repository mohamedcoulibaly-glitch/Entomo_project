from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user
from app.db.session import get_db
from app.models.capture import Capture
from app.models.site import SiteSentinelle
from app.models.user import User

router = APIRouter()


@router.get("/donnees")
def map_data(
    region: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Retourne les points et agrégats calculés depuis la base pour la carte."""
    sites_query = db.query(SiteSentinelle)
    if region and region.lower() not in {"toutes", "all"}:
        sites_query = sites_query.filter(SiteSentinelle.region == region)
    sites = sites_query.order_by(SiteSentinelle.nom).all()
    site_ids = [site.id for site in sites]
    captures = db.query(Capture).filter(Capture.site_id.in_(site_ids)).all() if site_ids else []
    by_site = defaultdict(list)
    for capture in captures:
        by_site[capture.site_id].append(capture)

    features = []
    for site in sites:
        items = by_site[site.id]
        individuals = sum(item.nombre_individus or 0 for item in items)
        confidence = round(sum((item.confidence_ia or 0) for item in items) / len(items) * 100, 1) if items else 0
        risk_score = min(1.0, (len(items) / 10) * .55 + (individuals / 100) * .3 + ((100 - confidence) / 100) * .15)
        features.append({
            "id": site.id, "nom": site.nom, "code": site.code, "region": site.region,
            "district": site.district, "latitude": site.latitude, "longitude": site.longitude,
            "actif": site.actif, "captures": len(items), "individus": individuals,
            "confiance_moyenne": confidence, "risque": round(risk_score, 3),
            "niveau_risque": "critique" if risk_score >= .7 else "vigilance" if risk_score >= .4 else "faible",
        })
    return {
        "sites": features,
        "regions": sorted({site.region for site in sites if site.region}),
        "statistiques": {
            "sites_actifs": sum(1 for site in sites if site.actif),
            "captures": len(captures),
            "individus": sum(item.nombre_individus or 0 for item in captures),
            "sites_critiques": sum(1 for item in features if item["niveau_risque"] == "critique"),
        },
    }
