from app.crud.base import CRUDBase
from app.models.indicateur import Indicateur


class CRUDIndicateur(CRUDBase):
    pass


crud_indicateur = CRUDIndicateur(Indicateur)
