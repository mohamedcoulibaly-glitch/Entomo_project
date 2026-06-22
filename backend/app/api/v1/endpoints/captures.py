import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.capture import crud_capture
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.capture import CaptureCreate, CaptureUpdate, CaptureResponse, CaptureValidate

router = APIRouter()

UPLOAD_DIR = "uploads/captures"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/", response_model=List[CaptureResponse])
def list_captures(
    skip: int = 0,
    limit: int = 100,
    site_id: Optional[int] = Query(None),
    statut: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    from app.models.capture import Capture
    query = db.query(Capture)
    if site_id:
        query = query.filter(Capture.site_id == site_id)
    if statut:
        query = query.filter(Capture.statut == statut)
    return query.order_by(Capture.date_capture.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=CaptureResponse)
def create_capture(
    capture_in: CaptureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not capture_in.utilisateur_id:
        capture_in.utilisateur_id = current_user.id
    return crud_capture.create(db, obj_in=capture_in)


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
    capture = crud_capture.get(db, id=capture_id)
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


@router.post("/{capture_id}/valider", response_model=CaptureResponse)
def valider_capture(
    capture_id: int,
    validation: CaptureValidate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Valider, corriger ou rejeter une capture (rôle laboratoire)."""
    result = crud_capture.valider(db, capture_id=capture_id, validation=validation, valideur_id=current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Capture non trouvée")
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
    ext = os.path.splitext(file.filename)[1]
    filename = f"capture_{capture_id}_image{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
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
    ext = os.path.splitext(file.filename)[1]
    filename = f"capture_{capture_id}_audio{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return crud_capture.update_media(db, capture_id=capture_id, audio_path=filepath)


@router.delete("/{capture_id}")
def delete_capture(capture_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    capture = crud_capture.get(db, id=capture_id)
    if not capture:
        raise HTTPException(status_code=404, detail="Capture non trouvée")
    crud_capture.remove(db, id=capture_id)
    return {"message": "Capture supprimée"}
