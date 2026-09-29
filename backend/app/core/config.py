"""
Application configuration.

All third-party integration settings (Razorpay, Cloudinary, Email) are OPTIONAL.
If they are missing, the app must still start; the relevant service module
will detect the missing config and return a clear "not configured" response
instead of crashing.
"""
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _is_weak_jwt_secret(secret: str | None) -> bool:
    if not secret:
        return True
    normalized = secret.strip()
    weak_values = {
        "insecure-dev-secret-change-me",
        "change-this-to-a-long-random-string",
        "dev-secret",
        "secret",
        "jwt-secret",
        "example-secret",
    }
    return normalized.lower() in weak_values or len(normalized) < 32


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Core
    ENVIRONMENT: str = "development"
    APP_NAME: str = "ShopNexus"

    # Database
    DATABASE_URL: str = "postgresql://shopnexus:shopnexus@localhost:5432/shopnexus"

    # JWT
    JWT_SECRET_KEY: str = Field(default="", description="JWT signing secret")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Razorpay (optional)
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # Cloudinary (optional)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Email (optional)
    EMAIL_HOST: str = ""
    EMAIL_PORT: int = 587
    EMAIL_USERNAME: str = ""
    EMAIL_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@shopnexus.com"

    # CORS
    FRONTEND_URL: str = ""

    @property
    def jwt_secret_is_valid(self) -> bool:
        return not _is_weak_jwt_secret(self.JWT_SECRET_KEY)

    @property
    def cors_origins(self) -> List[str]:
        local_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
        if self.ENVIRONMENT == "production":
            origins = [origin.strip("/") for origin in [self.FRONTEND_URL] if origin.strip()]
            return origins
        allowed = []
        for origin in [self.FRONTEND_URL, *local_origins]:
            normalized = origin.strip("/")
            if normalized and normalized not in allowed:
                allowed.append(normalized)
        return allowed

    @property
    def razorpay_configured(self) -> bool:
        return bool(self.RAZORPAY_KEY_ID and self.RAZORPAY_KEY_SECRET)

    @property
    def cloudinary_configured(self) -> bool:
        return bool(self.CLOUDINARY_CLOUD_NAME and self.CLOUDINARY_API_KEY and self.CLOUDINARY_API_SECRET)

    @property
    def email_configured(self) -> bool:
        return bool(self.EMAIL_HOST and self.EMAIL_USERNAME and self.EMAIL_PASSWORD)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.ENVIRONMENT == "production" and not settings.jwt_secret_is_valid:
        raise RuntimeError(
            "JWT_SECRET_KEY is missing or too weak in production. Set a strong secret in the backend .env file before starting the app."
        )
    return settings


settings = get_settings()
