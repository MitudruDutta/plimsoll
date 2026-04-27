"""Shared rate limiter.

Sits outside ``main.py`` so routers can ``from shared.rate_limit import limiter``
without import cycles. Settings are read inside the constructor (not at module
import) so a misconfigured environment surfaces a clean validator error from
``Settings`` rather than a cryptic import-time crash.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

logger = logging.getLogger(__name__)

try:
    from slowapi import Limiter
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
    from slowapi.util import get_remote_address

    SLOWAPI_AVAILABLE = True
except ImportError:  # pragma: no cover - slowapi optional in minimal installs
    Limiter = None  # type: ignore[assignment]
    RateLimitExceeded = None  # type: ignore[assignment]
    SlowAPIMiddleware = None  # type: ignore[assignment]

    def get_remote_address(_request: Any) -> str:  # type: ignore[no-redef]
        return "unknown"

    SLOWAPI_AVAILABLE = False


def get_rate_limit_key(request: Any) -> str:
    """Per-user when authed, per-IP otherwise."""
    user = getattr(getattr(request, "state", None), "user", None)
    user_id = getattr(user, "id", None)
    if user_id:
        return f"user:{user_id}"
    return f"ip:{get_remote_address(request)}"


class _NoLimit:
    """Decorator-shaped noop used when slowapi is missing."""

    def limit(
        self, *_args: Any, **_kwargs: Any
    ) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
            return fn

        return decorator


def _build_limiter() -> Any:
    if not SLOWAPI_AVAILABLE:
        logger.warning("slowapi not installed; rate limiting disabled.")
        return _NoLimit()

    from shared.config import get_settings

    settings = get_settings()
    storage_uri = settings.rate_limit_storage_url or settings.redis_url
    instance = Limiter(
        key_func=get_rate_limit_key,
        default_limits=[settings.rate_limit_default],
        storage_uri=storage_uri,
        in_memory_fallback_enabled=bool(storage_uri),
        in_memory_fallback=[settings.rate_limit_default],
        swallow_errors=True,
    )
    if storage_uri:
        logger.info("Rate limiting backed by %s.", storage_uri.split("@")[-1])
    else:
        logger.warning("RATE_LIMIT_STORAGE_URL/REDIS_URL unset; rate limiting is in-memory.")
    return instance


limiter: Any = _build_limiter()


__all__ = [
    "SLOWAPI_AVAILABLE",
    "RateLimitExceeded",
    "SlowAPIMiddleware",
    "get_rate_limit_key",
    "limiter",
]
