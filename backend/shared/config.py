"""Application settings.

Single source of truth for runtime configuration. Values are loaded from the
process environment (and optionally a `.env` file). All defaults are safe for
local development; production must override secrets-bearing fields explicitly.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import ValidationInfo, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEMO_SECRET_DEV_DEFAULT = "dev-demo-session-secret"


class Settings(BaseSettings):
    """All env-driven settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Database ----------------------------------------------------------
    database_url: str = "sqlite:///./data/sully.db"
    auto_create_tables: bool = True
    database_pool_size: int = 20
    database_max_overflow: int = 10

    # --- 1.0 migration toggles --------------------------------------------
    auth_backend: str = "supabase"  # supabase | dual
    kb_backend: str = "chroma"  # chroma | pgvector | dual | disabled
    upload_backend: str = "disk"  # disk | supabase_storage
    queue_backend: str = "none"  # none | pgmq | arq
    redis_url: str | None = None
    rate_limit_storage_url: str | None = None
    rate_limit_default: str = "120/minute"

    # --- LLM providers -----------------------------------------------------
    llm_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:latest"
    openai_api_key: str | None = None
    openai_base_url: str | None = None
    openai_model: str = "gpt-4o-mini"
    google_api_key: str | None = None
    google_maps_api_key: str | None = None

    # --- Supabase / Storage -----------------------------------------------
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    supabase_jwks_url: str | None = None
    supabase_jwt_secret: str | None = None  # legacy HS256 projects
    storage_bucket_documents: str = "documents"
    storage_bucket_satellite_cache: str = "satellite-cache"
    storage_bucket_reports: str = "reports"

    # --- Vector store -----------------------------------------------------
    chroma_persist_dir: str = "./data/vectordb"
    maritime_kb_persist_dir: str = "./data/vectordb/maritime"
    chroma_api_key: str | None = None
    chroma_tenant: str | None = None
    chroma_database: str | None = None

    # --- Uploads ----------------------------------------------------------
    upload_dir: str = "./data/uploads"
    documents_upload_dir: str = "./data/uploads/documents"
    max_upload_size_mb: int = 50
    maritime_regulations_dir: str = "./data/maritime_regulations"

    # --- Feature flags ----------------------------------------------------
    document_analysis_use_crewai: bool = True

    # --- Auth -------------------------------------------------------------
    admin_whitelist: str = ""

    # --- Demo sessions ----------------------------------------------------
    demo_session_secret: str = _DEMO_SECRET_DEV_DEFAULT
    demo_session_ttl_seconds: int = 3600

    # --- HTTP / CORS ------------------------------------------------------
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # --- LLM cost ledger --------------------------------------------------
    # Optional JSON map of "model_name": [in_per_M, out_per_M] in USD.
    llm_pricing_overrides_json: str | None = None

    # --- Logging ----------------------------------------------------------
    environment: str = "development"
    log_level: str = "INFO"
    debug: bool = False

    @field_validator("debug", mode="before")
    @classmethod
    def _parse_debug_flag(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "production", "prod", "off"}:
                return False
            if normalized in {"development", "dev", "debug", "on"}:
                return True
        return value

    @field_validator("cors_origins")
    @classmethod
    def _no_wildcard_with_credentials(cls, value: str, info: ValidationInfo) -> str:
        if "*" in value and not info.data.get("debug", False):
            raise ValueError("CORS_ORIGINS=* is forbidden when DEBUG is false")
        return value

    @model_validator(mode="after")
    def _enforce_prod_secrets(self) -> Settings:
        """Refuse to boot prod with insecure defaults."""
        if self.debug or self.environment.lower() not in {"production", "prod"}:
            return self
        if self.demo_session_secret == _DEMO_SECRET_DEV_DEFAULT:
            raise ValueError(
                "DEMO_SESSION_SECRET is using the dev default; set a real secret in production."
            )
        if self.auth_backend in {"supabase", "dual"}:
            jwks_configured = bool(self.supabase_jwks_url or self.supabase_url)
            if not jwks_configured and not self.supabase_jwt_secret:
                raise ValueError(
                    "Supabase auth requires SUPABASE_URL (or SUPABASE_JWKS_URL) "
                    "or SUPABASE_JWT_SECRET when DEBUG=false."
                )
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
