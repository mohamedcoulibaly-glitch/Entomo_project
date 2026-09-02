from fastapi import APIRouter, Depends
from app.api.v1.endpoints import auth, users, roles, sites, captures, datasets, models, dhis2, reports, dashboard, indicateurs, langues, sync, interventions, notifications, audit, campagnes, reference, data_imports, cartography, support, assistant
from app.core.permissions import enforce_route_access

api_router = APIRouter(dependencies=[Depends(enforce_route_access)])

api_router.include_router(auth.router,      prefix="/auth",      tags=["Authentification"])
api_router.include_router(users.router,     prefix="/users",     tags=["Utilisateurs"])
api_router.include_router(roles.router,     prefix="/roles",     tags=["Rôles & Permissions"])
api_router.include_router(sites.router,     prefix="/sites",     tags=["Sites Sentinelles"])
api_router.include_router(captures.router,  prefix="/captures",  tags=["Captures"])
api_router.include_router(datasets.router,  prefix="/datasets",  tags=["Datasets"])
api_router.include_router(models.router,    prefix="/modeles",   tags=["Modèles ML"])
api_router.include_router(dhis2.router,     prefix="/dhis2",     tags=["DHIS2"])
api_router.include_router(reports.router,   prefix="/rapports",  tags=["Rapports"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(indicateurs.router, prefix="/indicateurs", tags=["Indicateurs"])
api_router.include_router(langues.router,     prefix="/langues",    tags=["Langues"])
api_router.include_router(sync.router,        prefix="/sync",       tags=["Synchronisation"])
api_router.include_router(interventions.router, prefix="/interventions", tags=["Interventions"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(audit.router,        prefix="/audit",      tags=["Audit"])
api_router.include_router(campagnes.router,    prefix="/campagnes",  tags=["Campagnes"])
api_router.include_router(reference.router,    prefix="/reference",  tags=["Références"])
api_router.include_router(data_imports.router, prefix="/import",     tags=["Import de données"])
api_router.include_router(cartography.router, prefix="/cartographie", tags=["Cartographie"])
api_router.include_router(support.router, prefix="/support", tags=["Assistance"])
api_router.include_router(assistant.router, prefix="/assistant", tags=["Assistant IA"])
