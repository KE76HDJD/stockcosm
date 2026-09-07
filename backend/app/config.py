import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

_BASE_DIR = Path(__file__).parent.parent


class Settings(BaseSettings):
    DATABASE_URL: str = ""
    SECRET_KEY: str = ""
    JWT_ACCESS_MINUTES: int = 15
    JWT_REFRESH_DAYS: int = 7
    ENVIRONMENT: str = "development"
    ALGORITHM: str = "HS256"
    GEMINI_API_KEY: str | None = None
    TOTP_ISSUER: str = "KET SKIN CARE"

    DB_HOST: str = "localhost"
    DB_PORT: int = 5435
    DB_NAME: str = "gestion_stock_cosmetiques"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""

    UPLOAD_DIR: str = str(_BASE_DIR / "uploads" / "profile_photos")
    BACKUP_DIR: str = str(_BASE_DIR / "backups")

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://localhost:8443"]
    COOKIE_SECURE: bool = False

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    if not settings.DATABASE_URL:
        settings.DATABASE_URL = (
            f"postgresql+asyncpg://{settings.DB_USER}:{settings.DB_PASSWORD}"
            f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
        )
    elif settings.DATABASE_URL.startswith("postgresql://"):
        settings.DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

    if "channel_binding=" in settings.DATABASE_URL:
        settings.DATABASE_URL = settings.DATABASE_URL.replace("&channel_binding=require", "").replace("?channel_binding=require", "")

    if settings.ENVIRONMENT == "production":
        settings.COOKIE_SECURE = True
    return settings
