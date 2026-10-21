from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    app_secret: str = ""
    database_url: str = "postgresql+psycopg://classroom:classroom@postgres:5432/classroom"
    redis_url: str = "redis://redis:6379/0"
    storage_backend: str = "s3"
    storage_path: str = "/var/lib/classroom/files"
    s3_endpoint_url: str = ""
    s3_region: str = "us-east-1"
    s3_bucket: str = "classroom-files"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_force_path_style: bool = True
    max_pdf_bytes: int = 52_428_800
    max_model_input_chars: int = 24_000
    access_token_minutes: int = 30
    refresh_token_days: int = 14
    allowed_origins: str = "http://localhost:5173"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen3:1.7b"
    ollama_num_ctx: int = 4096
    lesson_generation_mode: str = "model"
    exporter_url: str = "http://exporter:8082"
    upload_retention_days: int = 30
    curriculum_import_token: str = ""
    feedback_admin_token: str = ""
    curriculum_match_threshold: float = 0.28

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.app_env == "production" and len(settings.app_secret) < 32:
        raise RuntimeError("APP_SECRET must be at least 32 characters in production")
    if settings.app_env == "production" and settings.app_secret.startswith("local-only"):
        raise RuntimeError("Replace the local development APP_SECRET before production")
    if not settings.app_secret:
        settings.app_secret = "dev-only-change-this-secret-before-production"
    return settings
