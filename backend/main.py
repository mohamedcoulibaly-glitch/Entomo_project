from fastapi import FastAPI, UploadFile, Depends
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
from contextlib import asynccontextmanager

from sqlalchemy.orm import Session
from app.db.session import get_db

from app.core.config import settings
from app.db.session import engine, SessionLocal
from app.db.migrations import ensure_schema_compatibility
from app.models import Base
from app.api.v1 import api_router
from app.core.error_handler import ErrorHandlingMiddleware
from app.services.health_service import build_health_summary, build_liveness, build_readiness

# Mettre à niveau les anciennes bases, puis créer les tables manquantes (dev SQLite).
ensure_schema_compatibility(engine)
if os.environ.get("ENVIRONMENT") != "production":
    Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if os.environ.get("ENVIRONMENT") == "production":
        weak = settings.SECRET_KEY in {"", "change-me-in-production", "change-me"}
        if weak:
            import logging
            logging.getLogger("entomo").warning(
                "SECRET_KEY faible ou par défaut en production — configurez .env"
            )
    if not os.environ.get("TESTING"):
        db = SessionLocal()
        try:
            from app.services.ml_training import ensure_default_models
            ensure_default_models(db)
        except Exception:
            pass
        finally:
            db.close()
    if not os.environ.get("TESTING"):
        try:
            from app.services.report_scheduler import start_report_scheduler
            start_report_scheduler()
        except Exception:
            pass
    yield
    if not os.environ.get("TESTING"):
        try:
            from app.services.report_scheduler import stop_report_scheduler
            stop_report_scheduler()
        except Exception:
            pass


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
    allow_credentials = settings.CORS_ORIGINS != "*"
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=allow_credentials,
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
    lifespan=lifespan,
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
def health_check(db: Session = Depends(get_db)):
    summary = build_health_summary(db)
    status_code = 200 if summary["status"] != "unhealthy" else 503
    from fastapi.responses import JSONResponse
    return JSONResponse(content=summary, status_code=status_code)


@app.get("/health/live")
def health_live():
    return build_liveness()


@app.get("/health/ready")
def health_ready(db: Session = Depends(get_db)):
    payload = build_readiness(db)
    from fastapi.responses import JSONResponse
    status_code = 200 if payload["status"] == "ready" else 503
    return JSONResponse(content=payload, status_code=status_code)


@app.get("/health/dhis2")
def health_dhis2(db: Session = Depends(get_db)):
    from app.crud.dhis2 import crud_dhis2_config
    from app.services.dhis2_client import credentials_ready, test_connection

    config = crud_dhis2_config.get_actif(db)
    if not config:
        return {"status": "not_configured", "configured": False}
    ready = credentials_ready(config)
    if not ready:
        return {"status": "credentials_missing", "configured": True, "credentials_ready": False}
    ok, message, _ = test_connection(config)
    return {
        "status": "ok" if ok else "unreachable",
        "configured": True,
        "credentials_ready": True,
        "message": message,
    }

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


# Middleware de validation des uploads — voir app.services.upload_validation
