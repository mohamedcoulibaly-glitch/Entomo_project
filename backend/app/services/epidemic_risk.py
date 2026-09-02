"""Modèle épidémiologique SEIR alimenté par les captures entomologiques réelles.

Référence : modèle compartimental SEIR (Kermack & McKendrick, 1927)
avec taux de transmission β modulé par la densité vectorielle observée.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.capture import Capture
from app.models.site import SiteSentinelle


@dataclass
class RegionRiskResult:
    region: str
    risque: float
    captures: int
    individus: int
    infection_fraction: float


def _simulate_seir(
    population: float,
    initial_infected: float,
    beta: float,
    sigma: float = 0.2,
    gamma: float = 0.1,
    days: int = 30,
) -> float:
    """Intègre un SEIR discrétisé (Euler) et retourne la fraction infectée finale."""
    if population <= 0:
        return 0.0

    s = max(population - initial_infected, 0.0)
    e = 0.0
    i = max(initial_infected, 0.0)
    r = 0.0
    n = max(population, 1.0)

    for _ in range(days):
        new_exposed = beta * s * i / n
        new_infectious = sigma * e
        new_recovered = gamma * i
        s = max(s - new_exposed, 0.0)
        e = max(e + new_exposed - new_infectious, 0.0)
        i = max(i + new_infectious - new_recovered, 0.0)
        r = min(r + new_recovered, n)

    return min(1.0, i / n)


def compute_epidemic_risk(
    db: Session,
    facteurs: Optional[List[Dict]],
    *,
    population_per_capture: int = 100,
    horizon_days: int = 30,
) -> Dict:
    region_stats = (
        db.query(
            SiteSentinelle.region,
            func.count(Capture.id).label("total_captures"),
            func.sum(Capture.nombre_individus).label("total_individus"),
        )
        .outerjoin(Capture, Capture.site_id == SiteSentinelle.id)
        .group_by(SiteSentinelle.region)
        .all()
    )

    if not region_stats:
        return {
            "risque_global": 0.0,
            "regions": {},
            "message": "Risque FAIBLE — Aucune donnée de capture disponible",
            "regions_haut_risque": [],
            "population_exposee": 0,
            "facteurs_utilises": len(facteurs or []),
            "modele": "SEIR-v1",
        }

    weight_sum = sum(float(f.get("poids", 0)) for f in (facteurs or [])) / 100.0 if facteurs else 0.5
    max_individus = max((r.total_individus or 0) for r in region_stats) or 1
    results: Dict[str, Dict] = {}
    region_models: List[RegionRiskResult] = []

    for row in region_stats:
        if not row.region:
            continue
        captures = int(row.total_captures or 0)
        individus = int(row.total_individus or 0)
        if captures == 0:
            continue

        population = max(individus * population_per_capture, 1000)
        vector_density = individus / max_individus
        beta = min(0.8, 0.15 + vector_density * 0.35 + weight_sum * 0.25)
        initial_infected = max(individus, 1)
        infection_fraction = _simulate_seir(
            population=population,
            initial_infected=initial_infected,
            beta=beta,
            days=horizon_days,
        )
        risque = round(min(1.0, infection_fraction * 0.7 + vector_density * 0.3), 4)
        region_models.append(RegionRiskResult(
            region=row.region,
            risque=risque,
            captures=captures,
            individus=individus,
            infection_fraction=round(infection_fraction, 4),
        ))
        results[row.region] = {
            "risque": risque,
            "captures": captures,
            "individus": individus,
            "infection_fraction": round(infection_fraction, 4),
            "beta": round(beta, 4),
        }

    if not results:
        return {
            "risque_global": 0.0,
            "regions": {},
            "message": "Risque FAIBLE — Aucune capture récente par région",
            "regions_haut_risque": [],
            "population_exposee": 0,
            "facteurs_utilises": len(facteurs or []),
            "modele": "SEIR-v1",
        }

    risque_global = round(float(np.mean([item.risque for item in region_models])), 4)
    regions_haut_risque = [item.region for item in region_models if item.risque >= 0.7]
    population_exposee = sum(item.individus for item in region_models) * population_per_capture

    if risque_global >= 0.7:
        message = "Risque ÉLEVÉ — Action immédiate recommandée"
    elif risque_global >= 0.4:
        message = "Risque MODÉRÉ — Surveillance renforcée recommandée"
    else:
        message = "Risque FAIBLE — Surveillance de routine"

    return {
        "risque_global": risque_global,
        "regions": results,
        "message": message,
        "regions_haut_risque": regions_haut_risque,
        "population_exposee": population_exposee,
        "facteurs_utilises": len(facteurs or []),
        "modele": "SEIR-v1",
        "horizon_jours": horizon_days,
    }
