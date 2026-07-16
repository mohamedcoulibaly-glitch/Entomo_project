from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Statistiques globales pour le tableau de bord."""
    from app.models.site import SiteSentinelle
    from app.models.capture import Capture
    from app.models.dataset import Dataset
    from app.models.model import MLModel
    from app.models.dhis2 import DHIS2Sync
    from app.models.user import User as UserModel

    total_sites = db.query(SiteSentinelle).count()
    sites_actifs = db.query(SiteSentinelle).filter(SiteSentinelle.actif == True).count()
    total_captures = db.query(Capture).count()
    captures_a_valider = db.query(Capture).filter(Capture.statut == "a_valider").count()
    captures_validees = db.query(Capture).filter(Capture.statut == "valide").count()
    total_datasets = db.query(Dataset).count()
    modeles_deployes = db.query(MLModel).filter(MLModel.deploye == True).count()
    total_utilisateurs = db.query(UserModel).filter(UserModel.is_active == True).count()

    derniere_sync = db.query(DHIS2Sync).order_by(DHIS2Sync.date_sync.desc()).first()

    return {
        "sites": {"total": total_sites, "actifs": sites_actifs},
        "captures": {
            "total": total_captures,
            "a_valider": captures_a_valider,
            "validees": captures_validees,
        },
        "datasets": {"total": total_datasets},
        "modeles": {"deployes": modeles_deployes},
        "utilisateurs": {"actifs": total_utilisateurs},
        "dhis2": {
            "derniere_sync": derniere_sync.date_sync.isoformat() if derniere_sync else None,
            "dernier_statut": derniere_sync.statut if derniere_sync else None,
        },
    }


@router.get("/captures-par-espece")
def captures_par_espece(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Distribution des captures par espèce."""
    from sqlalchemy import func
    from app.models.capture import Capture
    results = (
        db.query(Capture.espece, func.count(Capture.id).label("count"))
        .group_by(Capture.espece)
        .order_by(func.count(Capture.id).desc())
        .limit(20)
        .all()
    )
    return [{"espece": r.espece, "count": r.count} for r in results]


@router.get("/interventions-stats")
def interventions_stats(db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    from app.models.intervention import Intervention
    from sqlalchemy import func
    total = db.query(Intervention).count()
    planifiees = db.query(Intervention).filter(Intervention.statut == "planifiee").count()
    en_cours = db.query(Intervention).filter(Intervention.statut == "en_cours").count()
    realisees = db.query(Intervention).filter(Intervention.statut == "realisee").count()
    return {"total": total, "planifiees": planifiees, "en_cours": en_cours, "realisees": realisees}


@router.get("/captures-par-site")
def captures_par_site(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Nombre de captures par site sentinelle."""
    from sqlalchemy import func
    from app.models.capture import Capture
    from app.models.site import SiteSentinelle
    results = (
        db.query(SiteSentinelle.nom, func.count(Capture.id).label("count"))
        .outerjoin(Capture, Capture.site_id == SiteSentinelle.id)
        .group_by(SiteSentinelle.id)
        .all()
    )
    return [{"site": r.nom, "count": r.count} for r in results]
