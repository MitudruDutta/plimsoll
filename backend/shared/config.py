from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """"""
    
    # Pydantic V2 config
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra env vars not defined here
    )
    
    # Database connection. Override via DATABASE_URL env. SQLite default
    # keeps local development friction-free; production must set Postgres.
    database_url: str = "sqlite:///./data/sully.db"
    
    # LLM: ollama  openai
    llm_provider: str = "ollama"

    # Ollama(LLM)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:latest"  #  llama3, mistral

    # OpenAI(ChatGPT)
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None  # /
    openai_model: str = "gpt-4o-mini"
    
    # Google API (for Gemini embeddings)
    google_api_key: Optional[str] = None
    
    # Google Maps API (for Static Maps - can be same or different from google_api_key)
    google_maps_api_key: Optional[str] = None

    # 
    chroma_persist_dir: str = "./data/vectordb"
    maritime_kb_persist_dir: str = "./data/vectordb/maritime"
    chroma_api_key: Optional[str] = None
    chroma_tenant: Optional[str] = None
    chroma_database: Optional[str] = None

    # 
    upload_dir: str = "./data/uploads"
    documents_upload_dir: str = "./data/uploads/documents"
    max_upload_size_mb: int = 50

    # Maritime Compliance Settings
    maritime_regulations_dir: str = "./data/maritime_regulations"

    # CrewAI Feature Flags
    document_analysis_use_crewai: bool = True
    
    # Clerk
    clerk_issuer_url: Optional[str] = None
    # Comma-separated list of admin emails. Configure via env, never hardcode.
    admin_whitelist: str = ""

    # HTTP/CORS
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # 
    log_level: str = "INFO"
    debug: bool = False

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug_flag(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "production", "prod", "off"}:
                return False
            if normalized in {"development", "dev", "debug", "on"}:
                return True
        return value


@lru_cache()
def get_settings() -> Settings:
    """(singleton)"""
    return Settings()
