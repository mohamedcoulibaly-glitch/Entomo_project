from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.db.session import engine
from app.models import Base  # importe tous les modèles pour la création des tables
from app.api.v1 import api_router

# Créer toutes les tables SQLite au démarrage
Base.metadata.create_all(bind=engine)

# Dossiers d'uploads
os.makedirs("uploads/captures", exist_ok=True)
os.makedirs("uploads/datasets", exist_ok=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS — autorise le frontend (fichiers HTML statiques + éventuellement un dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes API
app.include_router(api_router, prefix=settings.API_V1_STR)

# Fichiers uploadés accessibles en HTTP
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def read_root():
    return {
        "message": "Entomo Surveillance System — API",
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
