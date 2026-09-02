from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Entomo Surveillance System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = "sqlite:///./entomo.db"
    ENVIRONMENT: str = "development"

    # Sécurité JWT
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 heures

    # CORS
    CORS_ORIGINS: str = "*"

    # Assistant IA (rules | ollama | openai | auto)
    ASSISTANT_PROVIDER: str = "rules"
    ASSISTANT_TIMEOUT_SECONDS: float = 20.0
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "llama3.2"
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4o-mini"

    class Config:
        env_file = ".env"
        case_sensitive = True
        env_file_encoding = "utf-8"


settings = Settings()

# Générer une clé secrète par défaut si absente
if not settings.SECRET_KEY:
    import secrets
    settings.SECRET_KEY = secrets.token_urlsafe(32)
