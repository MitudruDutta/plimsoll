from pydantic import Field
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
    
    # 
    database_url: str = "postgresql://user:password@localhost:5432/dji_sales_mvp"
    
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
    admin_whitelist: str = "thaumatext@gmail.com"

    # 
    log_level: str = "INFO"
    debug: bool = True


@lru_cache()
def get_settings() -> Settings:
    """(singleton)"""
    return Settings()
