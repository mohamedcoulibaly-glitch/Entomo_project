from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.dataset import crud_dataset, crud_annotation
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.dataset import (
    DatasetCreate, DatasetUpdate, DatasetResponse,
    AnnotationCreate, AnnotationResponse,
)

router = APIRouter()


@router.get("/", response_model=List[DatasetResponse])
def list_datasets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    return crud_dataset.get_multi(db, skip=skip, limit=limit)


@router.post("/", response_model=DatasetResponse)
def create_dataset(
    ds_in: DatasetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Never trust a client-supplied owner id.
    ds_in.utilisateur_id = current_user.id
    return crud_dataset.create(db, obj_in=ds_in)


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    ds = crud_dataset.get(db, id=dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset non trouvé")
    return ds


@router.put("/{dataset_id}", response_model=DatasetResponse)
def update_dataset(dataset_id: int, ds_in: DatasetUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    ds = crud_dataset.get(db, id=dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset non trouvé")
    if ds.utilisateur_id not in (None, current_user.id) and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Action non autorisée sur ce dataset")
    return crud_dataset.update(db, db_obj=ds, obj_in=ds_in)


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    from app.models.dataset import Annotation

    ds = crud_dataset.get(db, id=dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset non trouvé")
    if ds.utilisateur_id not in (None, current_user.id) and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Action non autorisée sur ce dataset")
    # Remove dependent annotations explicitly because the database relation does
    # not guarantee an ORM/database cascade on every supported backend.
    db.query(Annotation).filter(Annotation.dataset_id == dataset_id).delete(
        synchronize_session=False
    )
    db.commit()
    crud_dataset.remove(db, id=dataset_id)
    return {"message": "Dataset supprimé"}


@router.get("/{dataset_id}/annotations", response_model=List[AnnotationResponse])
def list_annotations(dataset_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_active_user)):
    ds = crud_dataset.get(db, id=dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset non trouvé")
    return crud_annotation.get_by_dataset(db, dataset_id=dataset_id)


@router.post("/{dataset_id}/annotations", response_model=AnnotationResponse)
def add_annotation(
    dataset_id: int,
    ann_in: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ann_in.dataset_id = dataset_id
    ann_in.utilisateur_id = current_user.id
    return crud_annotation.create(db, obj_in=ann_in)
