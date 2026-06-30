from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "Sunset Country Repairs"
    APP_ENV: str = "production"
    APP_DEBUG: bool = False
    APP_SECRET_KEY: str = "change-me"
    APP_URL: str = "http://localhost"
    CORS_ORIGINS: str = ""

    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "sunset_repairs"
    POSTGRES_USER: str = "sunset_user"
    POSTGRES_PASSWORD: str = "change-me"

    JWT_SECRET_KEY: str = "jwt-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    SMS_GATEWAY_USERNAME: str = ""
    SMS_GATEWAY_PASSWORD: str = ""
    SMS_API_KEY: str = ""
    SMS_WEBHOOK_SECRET: str = ""

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "repairs@sunsetcountry.com.au"
    SMTP_FROM_NAME: str = "Sunset Country Repairs"
    USE_TLS: bool = True

    IMAP_HOST: str = ""
    IMAP_PORT: int = 993
    IMAP_USER: str = ""
    IMAP_PASSWORD: str = ""

    STORAGE_TYPE: str = "local"
    STORAGE_LOCAL_PATH: str = "/app/uploads"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: Optional[str] = None
    AWS_S3_REGION: Optional[str] = None

    PHOTO_MAX_FILE_SIZE: int = 10485760  # 10MB
    PHOTO_MAX_UPLOAD_COUNT: int = 50
    PHOTO_THUMBNAIL_SIZE: int = 200
    PHOTO_MEDIUM_SIZE: int = 800
    PHOTO_STORAGE_PREFIX: str = "photos"

    LOG_LEVEL: str = "INFO"

    VAPID_PRIVATE_KEY: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_CLAIMS_EMAIL: str = "admin@sunsetcountryrepairs.com.au"

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def sync_database_url(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
