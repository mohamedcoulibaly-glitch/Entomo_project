from fastapi import FastAPI, UploadFile
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

from app.core.config import settings
from app.db.session import engine
from app.db.migrations import ensure_schema_compatibility
from app.models import Base
from app.api.v1 import api_router
from app.core.error_handler import ErrorHandlingMiddleware

# Mettre à niveau les anciennes bases, puis créer les tables manquantes.
ensure_schema_compatibility(engine)
Base.metadata.create_all(bind=engine)

# Configuration centralisée du middleware
def setup_app_middleware(app: FastAPI) -> None:
    # Une seule politique CORS, pilotée par la configuration.
    setup_cors(app)

    error_middleware = ErrorHandlingMiddleware(app)
    error_middleware.add_error_handlers(app)

# Configuration du middleware CORS pour restreindre l'accès
def setup_cors(app: FastAPI) -> None:
    from fastapi.middleware.cors import CORSMiddleware
    
    allowed_origins = (
        [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
        if settings.CORS_ORIGINS != "*"
        else ["*"]
    )
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        expose_headers=["X-Total-Count", "X-RateLimit-Limit"],
        max_age=600,
    )

# Dossiers d'uploads
os.makedirs("uploads/captures", exist_ok=True)
os.makedirs("uploads/datasets", exist_ok=True)
os.makedirs("uploads/langues", exist_ok=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Appliquer les middlewares d'erreur, compression et CORS
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Initialiser le middleware de gestion d'erreur centralisé
setup_app_middleware(app)

# Routes API
app.include_router(api_router, prefix=settings.API_V1_STR)

# Fichiers uploadés accessibles en HTTP
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def root_endpoint():
    return {
        "message": "Bienvenue sur l'API Entomo Surveillance System",
        "version": settings.VERSION
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Frontend statique avec routage protégé
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "www"
if FRONTEND_DIR.exists() and not os.environ.get("TESTING"):
    from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
    import os
    
    PUBLIC_PAGES = {'login.html', '404.html', ''}
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # API routes are handled first by the router, so this only catches non-API paths
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        
        file_path = FRONTEND_DIR / full_path if full_path else FRONTEND_DIR / "index.html"
        
        if not file_path.exists() or file_path.is_dir():
            file_path = FRONTEND_DIR / full_path / "index.html" if (FRONTEND_DIR / full_path / "index.html").exists() else FRONTEND_DIR / "pages" / "404.html"
            if not file_path.exists():
                file_path = FRONTEND_DIR / "pages" / "404.html"
        
        if file_path.suffix == '.html':
            return FileResponse(str(file_path))
        
        if file_path.exists():
            return FileResponse(str(file_path))
        
        return FileResponse(str(FRONTEND_DIR / "pages" / "404.html"))


# Middleware de validation des uploads
VALID_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
VALID_AUDIO_EXT = {".wav", ".mp3", ".ogg", ".flac", ".m4a"}
VALID_DOC_EXT = {".pdf", ".xlsx", ".xls", ".csv", ".json", ".pt", ".onnx", ".h5", ".pkl"}


def validate_upload_file(file: UploadFile) -> bool:
    """Valide le type de fichier uploadé."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    return ext in VALID_IMAGE_EXT | VALID_AUDIO_EXT | VALID_DOC_EXT
