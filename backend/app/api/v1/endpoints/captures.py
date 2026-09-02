import os
from datetime import date, datetime, time
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.crud.capture import crud_capture
from app.crud.model import crud_ml_model
from app.core.deps import get_current_active_user
from app.models.user import User
from app.models.capture import Capture
from app.models.model import MLModel
from app.schemas.capture import (
    CaptureCreate,
    CaptureUpdate,
    CaptureResponse,
    CaptureValidate,
    CaptureAnalyzeRequest,
    CaptureAnalyzeResponse,
    ImageAnalyzeResponse,
    AudioStatsResponse,
)
from app.services.audio_classifier import classify_audio_file, FEATURE_CLASSIFIER_NAME
from app.services.image_classifier import classify_image_file
from app.services.capture_export import export_captures_csv, export_captures_xlsx
from app.services.audit_service import audit_service
from app.services.upload_validation import save_upload_stream, validate_upload_file

router = APIRouter()

UPLOAD_DIR = "uploads/captures"
os.makedirs(UPLOAD_DIR, exist_ok=True)

AUDIO_STATUT_MAP = {
    "traite": "valide",
    "en_attente": "a_valider",
    "erreur": "rejete",
    "en attente": "a_valider",
}


def _resolve_audio_model(db: Session, model_id: Optional[int]) -> Optional[MLModel]:
    if model_id:
        model = crud_ml_model.get(db, id=model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Modèle ML non trouvé")
        if model.type_modele != "audio":
            raise HTTPException(status_code=400, detail="Le modèle sélectionné n'est pas un modèle audio")
        return model

    deployed = (
        db.query(MLModel)
        .filter(MLModel.deploye == True, MLModel.type_modele == "audio", MLModel.actif == True)
        .order_by(MLModel.id.desc())
        .first()
    )
    return deployed


def _resolve_image_model(db: Session, model_id: Optional[int]) -> Optional[MLModel]:
    if model_id:
        model = crud_ml_model.get(db, id=model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Modèle ML non trouvé")
        return model

    deployed = (
        db.query(MLModel)
        .filter(
            MLModel.deploye == True,
            MLModel.type_modele.in_(["classification", "image"]),
            MLModel.actif == True,
        )
        .order_by(MLModel.id.desc())
        .first()
    )
    return deployed


@router.get("/", response_model=List[CaptureResponse])
def list_captures(
    skip: int = 0,
    limit: int = 100,
    site_id: Optional[int] = Query(None),
    statut: Optional[str] = Query(None),
    espece: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    methode_capture: Optional[str] = Query(None),
    has_audio: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    normalized_statut = AUDIO_STATUT_MAP.get(statut.strip().lower(), statut) if statut else None

    if methode_capture or has_audio is not None:
        return crud_capture.list_audio_captures(
            db,
            skip=skip,
            limit=limit,
            statut=normalized_statut,
            site_id=site_id,
            methode_capture=methode_capture,
            has_audio=has_audio,
            espece=espece,
            date_debut=datetime.combine(date_debut, time.min) if date_debut else None,
        )

    query = db.query(Capture).options(joinedload(Capture.site))
    if site_id:
        query = query.filter(Capture.site_id == site_id)
    if normalized_statut:
        query = query.filter(Capture.statut == normalized_statut)
    if espece:
        query = query.filter(Capture.espece.ilike(f"%{espece.strip()}%"))
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            Capture.espece.ilike(term)
            | Capture.methode_capture.ilike(term)
            | Capture.notes.ilike(term)
        )
    if date_debut:
        query = query.filter(Capture.date_capture >= datetime.combine(date_debut, time.min))
    if date_fin:
        query = query.filter(Capture.date_capture <= datetime.combine(date_fin, time.max))
    return query.order_by(Capture.date_capture.desc()).offset(skip).limit(limit).all()


@router.get("/stats-audio", response_model=AudioStatsResponse)
def get_audio_stats(db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    stats = crud_capture.get_audio_stats(db)
    return AudioStatsResponse(**stats)


@router.post("/", response_model=CaptureResponse)
def create_capture(
    capture_in: CaptureCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.models.site import SiteSentinelle
    site = db.query(SiteSentinelle).filter(SiteSentinelle.id == capture_in.site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site non trouvé")
    if not capture_in.utilisateur_id:
        capture_in.utilisateur_id = current_user.id
    capture = crud_capture.create(db, obj_in=capture_in)
    audit_service.log_for_user(
        db,
        current_user,
        action="capture_create",
        module="captures",
        resource_type="capture",
        resource_id=capture.id,
        details={"site_id": capture.site_id, "espece": capture.espece},
        adresse_ip=request.client.host if request.client else None,
    )
    return capture


@router.get("/export")
def export_captures(
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    site_id: Optional[int] = Query(None),
    statut: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    limit: int = Query(10000, ge=1, le=50000),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Exporte les captures filtrées en CSV ou Excel (UTF-8, séparateur point-virgule)."""
    filters = {
        "site_id": site_id,
        "statut": statut,
        "search": search,
        "date_debut": date_debut,
        "date_fin": date_fin,
        "limit": limit,
    }
    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    if format == "xlsx":
        content = export_captures_xlsx(db, **filters)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"captures_{stamp}.xlsx"
    else:
        content = export_captures_csv(db, **filters)
        media = "text/csv; charset=utf-8"
        filename = f"captures_{stamp}.csv"
    return Response(
        content=content,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/a-valider", response_model=List[CaptureResponse])
def list_a_valider(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return crud_capture.get_a_valider(db, skip=skip, limit=limit)


@router.get("/{capture_id}", response_model=CaptureResponse)
def get_capture(capture_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    capture = (
        db.query(Capture)
        .options(joinedload(Capture.site))
        .filter(Capture.id == capture_id)
        .first()
    )
    if not capture:
        raise HTTPException(status_code=404, detail="Capture non trouvée")
    return capture


@router.put("/{capture_id}", response_model=CaptureResponse)
def update_capture(
    capture_id: int,
    capture_in: CaptureUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    capture = crud_capture.get(db, id=capture_id)
    if not capture:
        raise HTTPException(status_code=404, detail="Capture non trouvée")
    return crud_capture.update(db, db_obj=capture, obj_in=capture_in)


@router.post("/{capture_id}/analyser", response_model=CaptureAnalyzeResponse)
def analyser_capture(
    capture_id: int,
    body: CaptureAnalyzeRequest = CaptureAnalyzeRequest(),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    capture = crud_capture.get(db, id=capture_id)
    if not capture:
        raise HTTPException(status_code=404, detail="Capture non trouvée")
    if not capture.audio_path:
        raise HTTPException(status_code=400, detail="Aucun fichier audio associé à cette capture")

    audio_path = capture.audio_path
    if not os.path.isabs(audio_path) and not os.path.isfile(audio_path):
        alt_path = os.path.join(UPLOAD_DIR, os.path.basename(audio_path))
        if os.path.isfile(alt_path):
            audio_path = alt_path

    if not os.path.isfile(audio_path):
        raise HTTPException(status_code=400, detail="Fichier audio introuvable sur le serveur")

    ml_model = _resolve_audio_model(db, body.model_id)
    try:
        result = classify_audio_file(
            audio_path=audio_path,
            model_chemin=ml_model.chemin if ml_model else None,
            model_nom=ml_model.nom if ml_model else FEATURE_CLASSIFIER_NAME,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=400, detail="Fichier audio introuvable sur le serveur")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    updated = crud_capture.apply_analysis(
        db,
        capture_id=capture_id,
        result=result,
        model_id=ml_model.id if ml_model else None,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Capture non trouvée")

    return CaptureAnalyzeResponse(
        capture_id=updated.id,
        espece_detectee=result.espece_detectee,
        confiance=result.confiance,
        distribution=result.distribution,
        frequence=result.frequence,
        modele=result.modele,
        temps_traitement=result.temps_traitement,
        duree=result.duree_sec,
        statut=updated.statut,
    )


@router.post("/{capture_id}/analyser-image", response_model=ImageAnalyzeResponse)
def analyser_image_capture(
    capture_id: int,
    body: CaptureAnalyzeRequest = CaptureAnalyzeRequest(),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    capture = crud_capture.get(db, id=capture_id)
    if not capture:
        raise HTTPException(status_code=404, detail="Capture non trouvée")
    if not capture.image_path:
        raise HTTPException(status_code=400, detail="Aucune image associée à cette capture")

    image_path = capture.image_path
    if not os.path.isabs(image_path) and not os.path.isfile(image_path):
        alt_path = os.path.join(UPLOAD_DIR, os.path.basename(image_path))
        if os.path.isfile(alt_path):
            image_path = alt_path
    if not os.path.isfile(image_path):
        raise HTTPException(status_code=400, detail="Fichier image introuvable sur le serveur")

    ml_model = _resolve_image_model(db, body.model_id)
    try:
        result = classify_image_file(
            image_path=image_path,
            model_chemin=ml_model.chemin if ml_model else None,
            model_nom=ml_model.nom if ml_model else "entomo-image-v1",
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    updated = crud_capture.apply_image_analysis(
        db,
        capture_id=capture_id,
        result=result,
        model_id=ml_model.id if ml_model else None,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Capture non trouvée")

    return ImageAnalyzeResponse(
        capture_id=updated.id,
        espece_detectee=result.espece_detectee,
        confiance=result.confiance,
        distribution=result.distribution,
        modele=result.modele,
        temps_traitement=result.temps_traitement,
        statut=updated.statut,
    )


@router.post("/{capture_id}/valider", response_model=CaptureResponse)
def valider_capture(
    capture_id: int,
    validation: CaptureValidate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Valider, corriger ou rejeter une capture (rôle laboratoire)."""
    result = crud_capture.valider(db, capture_id=capture_id, validation=validation, valideur_id=current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Capture non trouvée")
    audit_service.log_for_user(
        db,
        current_user,
        action=f"capture_{validation.statut or 'valide'}",
        module="captures",
        resource_type="capture",
        resource_id=capture_id,
        details={"statut": result.statut, "espece_corrigee": result.espece_corrigee},
        adresse_ip=request.client.host if request.client else None,
    )
    return result


@router.post("/{capture_id}/upload-image", response_model=CaptureResponse)
async def upload_image(
    capture_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    capture = crud_capture.get(db, id=capture_id)
    if not capture:
        raise HTTPException(status_code=404, detail="Capture non trouvée")
    ext, max_bytes = validate_upload_file(file, "image")
    filename = f"capture_{capture_id}_image{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    save_upload_stream(file, Path(filepath), max_bytes)
    return crud_capture.update_media(db, capture_id=capture_id, image_path=filepath)


@router.post("/{capture_id}/upload-audio", response_model=CaptureResponse)
async def upload_audio(
    capture_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    capture = crud_capture.get(db, id=capture_id)
    if not capture:
        raise HTTPException(status_code=404, detail="Capture non trouvée")
    ext, max_bytes = validate_upload_file(file, "audio")
    filename = f"capture_{capture_id}_audio{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    save_upload_stream(file, Path(filepath), max_bytes)
    return crud_capture.update_media(db, capture_id=capture_id, audio_path=filepath)


@router.delete("/{capture_id}")
def delete_capture(
    capture_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    capture = crud_capture.get(db, id=capture_id)
    if not capture:
        raise HTTPException(status_code=404, detail="Capture non trouvée")
    crud_capture.remove(db, id=capture_id)
    audit_service.log_for_user(
        db,
        current_user,
        action="capture_delete",
        module="captures",
        resource_type="capture",
        resource_id=capture_id,
        adresse_ip=request.client.host if request.client else None,
    )
    return {"message": "Capture supprimée"}
