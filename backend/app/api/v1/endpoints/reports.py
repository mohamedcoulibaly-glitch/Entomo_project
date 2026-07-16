import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user
from app.crud.report import crud_rapport, crud_rapport_programme
from app.db.session import get_db
from app.models.capture import Capture
from app.models.report import Rapport
from app.models.site import SiteSentinelle
from app.models.user import User
from app.schemas.report import (
    RapportCreate, RapportGenerationRequest, RapportProgrammeCreate,
    RapportProgrammeResponse, RapportResponse, RapportSubmissionRequest,
    RapportUpdate,
)
from app.services.report_generator import generate_report_file

router = APIRouter()


@router.get("/", response_model=List[RapportResponse])
def list_rapports(skip: int = 0, limit: int = 100, type_rapport: Optional[str] = Query(None), db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    query = db.query(Rapport)
    if type_rapport:
        query = query.filter(Rapport.type == type_rapport)
    return query.order_by(Rapport.date_generation.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=RapportResponse)
def create_rapport(rapport_in: RapportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if not rapport_in.utilisateur_id:
        rapport_in.utilisateur_id = current_user.id
    rapport = Rapport(**rapport_in.model_dump(), date_generation=datetime.now(timezone.utc).replace(tzinfo=None))
    db.add(rapport)
    db.commit()
    db.refresh(rapport)
    return rapport


@router.post("/generer", response_model=RapportResponse)
def generer_rapport(payload: RapportGenerationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    query = db.query(Capture).join(SiteSentinelle, Capture.site_id == SiteSentinelle.id)
    site_query = db.query(SiteSentinelle)
    if payload.region and payload.region.lower() not in {"toutes", "toutes les régions"}:
        query = query.filter(SiteSentinelle.region == payload.region)
        site_query = site_query.filter(SiteSentinelle.region == payload.region)
    if payload.district and payload.district.lower() not in {"tous", "tous les districts"}:
        query = query.filter(SiteSentinelle.district == payload.district)
        site_query = site_query.filter(SiteSentinelle.district == payload.district)
    if payload.periode_debut:
        query = query.filter(Capture.date_capture >= payload.periode_debut)
    if payload.periode_fin:
        query = query.filter(Capture.date_capture <= payload.periode_fin)
    captures = query.all()
    summary = {
        "sites": site_query.count(),
        "captures": len(captures),
        "individus": sum(item.nombre_individus or 0 for item in captures),
        "validees": sum(1 for item in captures if item.valide),
        "confiance_moyenne": round(sum((item.confidence_ia or 0) for item in captures) / len(captures) * 100, 1) if captures else 0,
    }
    rapport = Rapport(
        titre=payload.titre, type=payload.type, format_fichier=payload.format_fichier.lower(),
        statut="en_cours", utilisateur_id=current_user.id,
        periode_debut=payload.periode_debut, periode_fin=payload.periode_fin,
        date_generation=datetime.now(timezone.utc).replace(tzinfo=None),
        contenu=json.dumps({"resume": summary, "indicateurs": payload.indicateurs, "region": payload.region, "district": payload.district}, ensure_ascii=False),
    )
    db.add(rapport)
    db.commit()
    db.refresh(rapport)
    try:
        rapport.chemin_fichier = generate_report_file(rapport.id, rapport.titre, payload.format_fichier, summary, payload.indicateurs)
        rapport.statut = "pret"
    except Exception as exc:
        rapport.statut = "erreur"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Génération impossible: {exc}") from exc
    db.commit()
    db.refresh(rapport)
    return rapport


# Les routes statiques doivent précéder /{rapport_id}.
@router.get("/programmes/actifs", response_model=List[RapportProgrammeResponse])
def list_programmes_actifs(db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    return crud_rapport_programme.get_actifs(db)


@router.get("/{rapport_id}", response_model=RapportResponse)
def get_rapport(rapport_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    rapport = crud_rapport.get(db, id=rapport_id)
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    return rapport


@router.get("/{rapport_id}/telecharger")
def telecharger_rapport(rapport_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    rapport = crud_rapport.get(db, id=rapport_id)
    if not rapport or not rapport.chemin_fichier:
        raise HTTPException(status_code=404, detail="Fichier de rapport non disponible")
    path = Path(rapport.chemin_fichier.lstrip("/"))
    if not path.exists():
        raise HTTPException(status_code=404, detail="Fichier de rapport introuvable")
    return FileResponse(path, filename=path.name, media_type="application/octet-stream")


@router.post("/{rapport_id}/soumettre", response_model=RapportResponse)
def soumettre_rapport(rapport_id: int, payload: RapportSubmissionRequest, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    rapport = crud_rapport.get(db, id=rapport_id)
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    try:
        contenu = json.loads(rapport.contenu or "{}")
    except json.JSONDecodeError:
        contenu = {"texte": rapport.contenu}
    contenu["soumission"] = {"email": payload.email, "commentaire": payload.commentaire, "date": datetime.now(timezone.utc).isoformat()}
    rapport.contenu = json.dumps(contenu, ensure_ascii=False)
    rapport.statut = "soumis"
    db.commit()
    db.refresh(rapport)
    return rapport


@router.put("/{rapport_id}", response_model=RapportResponse)
def update_rapport(rapport_id: int, rapport_in: RapportUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    rapport = crud_rapport.get(db, id=rapport_id)
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    return crud_rapport.update(db, db_obj=rapport, obj_in=rapport_in)


@router.delete("/{rapport_id}")
def delete_rapport(rapport_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    rapport = crud_rapport.get(db, id=rapport_id)
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    if rapport.chemin_fichier:
        Path(rapport.chemin_fichier.lstrip("/")).unlink(missing_ok=True)
    crud_rapport.remove(db, id=rapport_id)
    return {"message": "Rapport supprimé"}


@router.post("/{rapport_id}/programmer", response_model=RapportProgrammeResponse)
def programmer_rapport(rapport_id: int, prog_in: RapportProgrammeCreate, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    if not crud_rapport.get(db, id=rapport_id):
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    prog_in.rapport_id = rapport_id
    return crud_rapport_programme.create(db, obj_in=prog_in)
