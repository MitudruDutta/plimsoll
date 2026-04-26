"""Database engine + session factory.

The engine is built lazily on first access so test fixtures and env reloads
can override ``DATABASE_URL`` before the connection pool is opened. Callers
must use :func:`get_engine` and :func:`get_sessionmaker` rather than holding
a module-level reference.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from shared.config import get_settings


class Base(DeclarativeBase):
    """SQLAlchemy 2.x style declarative base."""


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    settings = get_settings()
    connect_args: dict[str, object] = {}
    if settings.database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        db_path = settings.database_url.removeprefix("sqlite:///")
        if db_path and db_path != ":memory:":
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    engine_kwargs: dict[str, object] = {
        "pool_pre_ping": True,
        "echo": settings.debug,
        "connect_args": connect_args,
    }
    if not settings.database_url.startswith("sqlite"):
        engine_kwargs["pool_size"] = settings.database_pool_size
        engine_kwargs["max_overflow"] = settings.database_max_overflow
    return create_engine(settings.database_url, **engine_kwargs)


@lru_cache(maxsize=1)
def get_sessionmaker() -> sessionmaker[Session]:
    return sessionmaker(autocommit=False, autoflush=False, bind=get_engine())


def SessionLocal() -> Session:
    """Session factory shim. Preserves the ``SessionLocal()`` call site."""
    return get_sessionmaker()()


def get_db():
    """FastAPI dependency: yields a request-scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
