from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp
from typing import Callable, Any
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Middleware centralisé de gestion des erreurs et CORS
class ErrorHandlingMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope["type"] == "http":
            try:
                await self.app(scope, receive, send)
            except Exception as e:
                await self._handle_exception(scope, e, send)
        else:
            await self.app(scope, receive, send)

    async def _handle_exception(self, scope: dict, exception: Exception, send: Callable) -> None:
        logger = logging.getLogger("error_handling")
        
        # Récupérer les informations de la requête
        request = Request(scope)
        path = request.url.path
        method = scope["method"]
        
        # Journaliser l'erreur avec détails complets
        error_msg = f"Erreur non gérée {method} {path}: {str(exception)}"
        logger.error(error_msg)
        
        # Déterminer le code de statut approprié
        if isinstance(exception, HTTPException):
            status_code = exception.status_code
            detail = exception.detail
        elif "not_found" in str(exception).lower() or "404" in str(exception):
            status_code = 404
            detail = "Ressource non trouvée"
        elif "unauthorized" in str(exception).lower() or "401" in str(exception):
            status_code = 401
            detail = "Non autorisé"
        elif "forbidden" in str(exception).lower() or "403" in str(exception):
            status_code = 403
            detail = "Accès interdit"
        elif "conflict" in str(exception).lower() or "409" in str(exception):
            status_code = 409
            detail = "Conflit de ressources"
        elif "validation" in str(exception).lower() or "400" in str(exception):
            status_code = 400
            detail = "Données de requête invalides"
        else:
            status_code = 500
            detail = "Erreur interne du serveur"
        
        # Créer un corps de réponse détaillé mais sécurisé
        response_body = {
            "detail": detail,
            "message": str(exception) if status_code == 500 else str(exception),
            "path": path,
            "method": method,
        }
        
        # Envoyer la réponse d'erreur
        response = JSONResponse(
            status_code=status_code,
            content=response_body
        )
        await response(scope, None, send)

    def add_error_handlers(self, app: FastAPI) -> None:
        """Ajouter des gestionnaires d'exceptions standardisés"""
        
        @app.exception_handler(404)
        async def not_found_handler(request: Request, exc: HTTPException):
            logger = logging.getLogger("error_handling")
            logger.warning(f"Ressource non trouvée: {request.method} {request.url.path}")
            
            return JSONResponse(
                status_code=404,
                content={
                    "detail": "Ressource non trouvée",
                    "message": exc.detail,
                    "path": request.url.path,
                    "method": request.method
                }
            )

        @app.exception_handler(400)
        async def validation_handler(request: Request, exc: HTTPException):
            logger = logging.getLogger("error_handling")
            logger.warning(f"Requête invalide {request.method} {request.url.path}: {exc.detail}")
            
            return JSONResponse(
                status_code=400,
                content={
                    # Le message métier est destiné au formulaire appelant
                    # (doublon, compte désactivé, valeur incohérente, etc.).
                    "detail": exc.detail,
                    "message": exc.detail,
                    "path": request.url.path,
                    "method": request.method
                }
            )

        @app.exception_handler(401)
        async def unauthorized_handler(request: Request, exc: HTTPException):
            logger = logging.getLogger("error_handling")
            logger.warning(f"Non autorisé {request.method} {request.url.path}")
            
            return JSONResponse(
                status_code=401,
                content={
                    "detail": exc.detail,
                    "message": exc.detail,
                    "path": request.url.path,
                    "method": request.method
                }
            )

        @app.exception_handler(403)
        async def forbidden_handler(request: Request, exc: HTTPException):
            logger = logging.getLogger("error_handling")
            logger.warning(f"Accès interdit {request.method} {request.url.path}")
            
            return JSONResponse(
                status_code=403,
                content={
                    "detail": exc.detail,
                    "message": exc.detail,
                    "path": request.url.path,
                    "method": request.method
                }
            )

        @app.exception_handler(409)
        async def conflict_handler(request: Request, exc: HTTPException):
            logger = logging.getLogger("error_handling")
            logger.warning(f"Conflit {request.method} {request.url.path}: {exc.detail}")
            
            return JSONResponse(
                status_code=409,
                content={
                    "detail": exc.detail,
                    "message": exc.detail,
                    "path": request.url.path,
                    "method": request.method
                }
            )

        @app.exception_handler(500)
        async def internal_server_error_handler(request: Request, exc: Exception):
            logger = logging.getLogger("error_handling")
            logger.error(f"Erreur interne du serveur {request.method} {request.url.path}: {str(exc)}")
            
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "Erreur interne du serveur",
                    "message": "Une erreur interne s'est produite",
                    "path": request.url.path,
                    "method": request.method
                }
            )

        @app.exception_handler(Exception)
        async def generic_exception_handler(request: Request, exc: Exception):
            logger = logging.getLogger("error_handling")
            logger.critical(f"Exception non gérée {request.method} {request.url.path}: {str(exc)}")
            
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "Erreur interne du serveur",
                    "message": "Une erreur inattendue s'est produite",
                    "path": request.url.path,
                    "method": request.method
                }
            )

    def add_cors_middleware(self, app: FastAPI) -> None:
        """Ajouter un middleware CORS configurable et robuste"""
        
        @app.middleware("http")
        async def cors_middleware(request: Request, call_next):
            # Définir les origines autorisées - à ajuster en production
            allowed_origins = ["*"]  # À restreindre à votre domaine frontend en production
            
            response = await call_next(request)
            
            # Définir les en-têtes CORS
            origin = request.headers.get("origin")
            if origin and ("*" in allowed_origins or origin in allowed_origins):
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
            
            # Autoriser les méthodes nécessaires
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            
            # Autoriser les en-têtes nécessaires
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
            
            # Autoriser l'exposition des en-têtes
            response.headers["Access-Control-Expose-Headers"] = "*"
            
            # Gérer les requêtes pré-vol OPTIONS
            if request.method == "OPTIONS":
                return response
                
            return response

# Exporter la classe pour l'utiliser dans main.py
__all__ = ["ErrorHandlingMiddleware"]
