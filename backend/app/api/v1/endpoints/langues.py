from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.langue import crud_langue
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.langue import (
    LangueCreate, LangueUpdate, LangueResponse, LangueFormatUpdate,
)

router = APIRouter()


@router.get("/", response_model=List[LangueResponse])
def list_langues(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return crud_langue.get_multi(db, skip=skip, limit=limit)


@router.post("/", response_model=LangueResponse)
def create_langue(
    langue_in: LangueCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    if crud_langue.get_by_code(db, code=langue_in.code):
        raise HTTPException(status_code=400, detail="Code langue déjà utilisé")
    return crud_langue.create(db, obj_in=langue_in)


@router.post("/ajouter", response_model=LangueResponse)
def ajouter_langue(
    code: Optional[str] = None,
    nom: Optional[str] = None,
    form_code: Optional[str] = Form(None, alias="code"),
    form_nom: Optional[str] = Form(None, alias="nom"),
    fichier: UploadFile = File(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    code = form_code or code
    nom = form_nom or nom
    if not code or not nom:
        raise HTTPException(status_code=422, detail="Code et nom de langue requis")
    if crud_langue.get_by_code(db, code=code):
        raise HTTPException(status_code=400, detail="Code langue déjà utilisé")
    chemin = None
    if fichier:
        import os, shutil
        os.makedirs("uploads/langues", exist_ok=True)
        chemin = f"uploads/langues/{fichier.filename}"
        with open(chemin, "wb") as f:
            shutil.copyfileobj(fichier.file, f)
    return crud_langue.create(db, obj_in=LangueCreate(code=code, nom=nom, fichier_traduction=chemin))


@router.post("/format", response_model=LangueResponse)
def update_format(
    format_in: LangueFormatUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    active = crud_langue.get_active(db)
    if not active:
        raise HTTPException(status_code=404, detail="Aucune langue active")
    return crud_langue.update(db, db_obj=active, obj_in=LangueUpdate(
        date_format=format_in.date_format, timezone=format_in.timezone
    ))


@router.get("/{langue_id}", response_model=LangueResponse)
def get_langue(
    langue_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    langue = crud_langue.get(db, id=langue_id)
    if not langue:
        raise HTTPException(status_code=404, detail="Langue non trouvée")
    return langue


@router.put("/{langue_id}", response_model=LangueResponse)
def update_langue(
    langue_id: int,
    langue_in: LangueUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    langue = crud_langue.get(db, id=langue_id)
    if not langue:
        raise HTTPException(status_code=404, detail="Langue non trouvée")
    if langue_in.active is True:
        from app.models.langue import Langue
        db.query(Langue).filter(Langue.id != langue_id).update({"active": False})
        db.commit()
    return crud_langue.update(db, db_obj=langue, obj_in=langue_in)


@router.delete("/{langue_id}")
def delete_langue(
    langue_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    langue = crud_langue.get(db, id=langue_id)
    if not langue:
        raise HTTPException(status_code=404, detail="Langue non trouvée")
    crud_langue.remove(db, id=langue_id)
    return {"message": "Langue supprimée"}
