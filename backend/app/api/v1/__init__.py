from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, roles, sites, captures, datasets, models, dhis2, reports, dashboard

api_router = APIRouter()

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
