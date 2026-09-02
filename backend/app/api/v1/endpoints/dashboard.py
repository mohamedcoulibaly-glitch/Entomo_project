"""Endpoints analytics pour les tableaux de bord."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.services import dashboard_service as ds

router = APIRouter()


def _filters(
    region: Optional[str] = None,
    espece: Optional[str] = None,
    period: Optional[str] = None,
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None,
    statut: Optional[str] = None,
    methode: Optional[str] = None,
) -> dict:
    return {
        "region": region,
        "espece": espece,
        "period": period,
        "date_debut": date_debut,
        "date_fin": date_fin,
        "statut": statut,
        "methode": methode,
    }


@router.get("/stats")
def get_dashboard_stats(
    region: Optional[str] = Query(None),
    espece: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return ds.get_stats(
        db, region=region, espece=espece, period=period,
        date_debut=date_debut, date_fin=date_fin,
    )


@router.get("/captures-par-espece")
def captures_par_espece(
    region: Optional[str] = Query(None),
    espece: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return ds.captures_par_espece(db, **_filters(region, espece, period, date_debut, date_fin))


@router.get("/captures-par-site")
def captures_par_site(
    region: Optional[str] = Query(None),
    espece: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return ds.captures_par_site(db, **_filters(region, espece, period, date_debut, date_fin))


@router.get("/captures-par-region")
def captures_par_region(
    region: Optional[str] = Query(None),
    espece: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return ds.captures_par_region(db, **_filters(region, espece, period, date_debut, date_fin))


@router.get("/captures-par-methode")
def captures_par_methode(
    region: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return ds.captures_par_methode(db, **_filters(region, None, period))


@router.get("/captures-par-statut")
def captures_par_statut(
    region: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return ds.captures_par_statut(db, **_filters(region, None, period))


@router.get("/densite-evolution")
def densite_evolution(
    granularity: str = Query("week", pattern="^(day|week|month)$"),
    region: Optional[str] = Query(None),
    espece: Optional[str] = Query(None),
    period: Optional[str] = Query("1A"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return ds.densite_evolution(
        db, granularity=granularity, region=region, espece=espece, period=period,
    )


@router.get("/alertes")
def get_alertes(
    region: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return ds.generate_alertes(db, region=region, limit=limit)


@router.get("/heatmap")
def heatmap(
    region: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return ds.heatmap_data(db, **_filters(region, None, period))


@router.get("/interventions-stats")
def interventions_stats(
    region: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return ds.interventions_stats(db, region=region)


@router.get("/region/{region_name}")
def region_detail(
    region_name: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return ds.region_detail(db, region_name)


@router.get("/regions")
def list_regions(_: User = Depends(get_current_active_user)):
    return {
        "regions": ds.SENEGAL_REGIONS,
        "region_medicale_5": sorted(ds.REGION_MEDICALE_5),
    }
