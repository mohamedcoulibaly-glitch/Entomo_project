from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.reference import crud_reference_data
from app.schemas.reference import ReferenceDataResponse, ReferenceDataCreate, ReferenceDataUpdate
from app.core.deps import get_current_active_user
from app.models.user import User

router = APIRouter()

# ---------------------------------------------------------------------------
# Données statiques de référence (fallback quand la BD est vide)
# ---------------------------------------------------------------------------

STATIC_REFERENCE: Dict[str, List[Dict[str, str]]] = {
    "especes": [
        {"code": "AN_GAMBIAE_SS",       "label": "An. gambiae s.s."},
        {"code": "AN_GAMBIAE_SL",       "label": "An. gambiae s.l."},
        {"code": "AN_FUNESTUS",         "label": "An. funestus"},
        {"code": "AN_ARABIENSIS",       "label": "An. arabiensis"},
        {"code": "AN_MELAS",            "label": "An. melas"},
        {"code": "AN_MOUCHETI",         "label": "An. moucheti"},
        {"code": "AE_AEGYPTI",          "label": "Ae. aegypti"},
        {"code": "AE_ALBOPICTUS",       "label": "Ae. albopictus"},
        {"code": "CX_QUINQUEFASCIATUS", "label": "Cx. quinquefasciatus"},
        {"code": "CX_PERFUSCUS",        "label": "Cx. perfuscus"},
    ],
    "regions": [
        {"code": "DAKAR",        "label": "Dakar"},
        {"code": "THIES",        "label": "Thiès"},
        {"code": "DIOURBEL",     "label": "Diourbel"},
        {"code": "FATICK",       "label": "Fatick"},
        {"code": "KAOLACK",      "label": "Kaolack"},
        {"code": "KAFFRINE",     "label": "Kaffrine"},
        {"code": "KEDOUGOU",     "label": "Kédougou"},
        {"code": "TAMBACOUNDA",  "label": "Tambacounda"},
        {"code": "ZIGUINCHOR",   "label": "Ziguinchor"},
        {"code": "SEDHIOU",      "label": "Sédhiou"},
        {"code": "KOLDA",        "label": "Kolda"},
        {"code": "VELINGARA",    "label": "Vélingara"},
        {"code": "SAINT_LOUIS",  "label": "Saint-Louis"},
        {"code": "LOUGA",        "label": "Louga"},
        {"code": "MATAM",        "label": "Matam"},
    ],
    "methodes_capture": [
        {"code": "CDC_LIGHT_TRAP",  "label": "CDC Light Trap"},
        {"code": "BG_SENTINEL",     "label": "BG-Sentinel"},
        {"code": "FILET",           "label": "Filet à moustiques"},
        {"code": "ASPIRATEUR",      "label": "Aspirateur à bouche"},
        {"code": "PSC",             "label": "Pièges PSC"},
        {"code": "CDC_GRAVID_TRAP", "label": "CDC Gravid Trap"},
    ],
    "types_zones": [
        {"code": "URBAIN",        "label": "Urbain"},
        {"code": "PERIURBAIN",    "label": "Périurbain"},
        {"code": "RURAL",         "label": "Rural"},
        {"code": "FORET",         "label": "Forêt"},
        {"code": "ZONE_HUMIDE",   "label": "Zone humide"},
        {"code": "ZONE_AGRICOLE", "label": "Zone agricole"},
    ],
    "genres": [
        {"code": "FEMELLE",       "label": "Femelle"},
        {"code": "MALE",          "label": "Mâle"},
        {"code": "INDETERMINE",   "label": "Indéterminé"},
    ],
    "statuts_capture": [
        {"code": "A_VALIDER", "label": "À valider"},
        {"code": "VALIDE",    "label": "Validé"},
        {"code": "CORRIGE",   "label": "Corrigé"},
        {"code": "REJETE",    "label": "Rejeté"},
    ],
}


def _db_items_to_dict(items) -> List[Dict[str, str]]:
    """Convertit les objets ORM en dicts {code, label}."""
    return [{"code": item.code, "label": item.label} for item in items]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/enrichi", response_model=Dict[str, Any])
def get_enriched_reference():
    """
    Retourne toutes les données de référence statiques enrichies en un seul appel.
    Utilisé comme source de vérité lorsque la base de données est vide.
    """
    return STATIC_REFERENCE


@router.get("/{category}", response_model=List[ReferenceDataResponse])
def list_reference_by_category(
    category: str,
    db: Session = Depends(get_db),
):
    """
    Retourne les données de référence pour une catégorie donnée.
    Si la table reference_data est vide pour cette catégorie,
    les données statiques définies dans ce fichier sont utilisées en fallback.
    """
    items = crud_reference_data.get_by_category(db, category=category)

    if items:
        return items

    # --- Fallback : données statiques ---
    static = STATIC_REFERENCE.get(category)
    if static is None:
        raise HTTPException(
            status_code=404,
            detail=f"Catégorie '{category}' inconnue et absente de la base de données.",
        )

    # On retourne les dicts bruts ; FastAPI les valide via response_model
    return static


@router.get("/{category}/{code}", response_model=ReferenceDataResponse)
def get_reference_item(
    category: str,
    code: str,
    db: Session = Depends(get_db),
):
    """
    Retourne un item de référence précis (catégorie + code).
    Cherche d'abord en base, puis dans les données statiques si absent.
    """
    item = crud_reference_data.get_by_code(db, category=category, code=code)
    if item:
        return item

    # --- Fallback : données statiques ---
    static_category = STATIC_REFERENCE.get(category, [])
    for entry in static_category:
        if entry["code"] == code:
            return entry

    raise HTTPException(status_code=404, detail="Référence non trouvée")


@router.post("/", response_model=ReferenceDataResponse)
def create_reference(
    ref_in: ReferenceDataCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    return crud_reference_data.create(db, obj_in=ref_in)


@router.put("/{category}/{code}", response_model=ReferenceDataResponse)
def update_reference(
    category: str,
    code: str,
    ref_in: ReferenceDataUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    item = crud_reference_data.get_by_code(db, category=category, code=code)
    if not item:
        raise HTTPException(status_code=404, detail="Référence non trouvée")
    return crud_reference_data.update(db, db_obj=item, obj_in=ref_in)


@router.delete("/{category}/{code}")
def delete_reference(
    category: str,
    code: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    item = crud_reference_data.get_by_code(db, category=category, code=code)
    if not item:
        raise HTTPException(status_code=404, detail="Référence non trouvée")
    crud_reference_data.remove(db, id=item.id)
    return {"message": "Référence supprimée"}
