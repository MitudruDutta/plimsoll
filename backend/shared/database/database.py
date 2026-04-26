"""Database engine + session factory.

Engine is constructed lazily so test fixtures and env reloads can override
``DATABASE_URL`` before the first connection is opened.
"""
from functools import lru_cache
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from shared.config import get_settings


Base = declarative_base()


@lru_cache(maxsize=1)
def _build_engine() -> Engine:
    settings = get_settings()
    connect_args = {}
    # SQLite needs same-thread relaxed for FastAPI's threadpool dependencies.
    if settings.database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        db_path = settings.database_url.removeprefix("sqlite:///")
        if db_path and db_path != ":memory:":
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    engine_kwargs = {
        "pool_pre_ping": True,
        "echo": settings.debug,
        "connect_args": connect_args,
    }
    if not settings.database_url.startswith("sqlite"):
        engine_kwargs["pool_size"] = settings.database_pool_size
        engine_kwargs["max_overflow"] = settings.database_max_overflow
    return create_engine(settings.database_url, **engine_kwargs)


# Module-level handles preserved for callers that import ``engine`` /
# ``SessionLocal`` directly (e.g. ``Base.metadata.create_all(bind=engine)``).
engine: Engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency: yields a request-scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
