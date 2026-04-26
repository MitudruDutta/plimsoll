"""Shared rate limiter.

Keep this outside ``main.py`` so routers can use decorators without importing
the application module and creating cycles.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from shared.config import get_settings

logger = logging.getLogger(__name__)

try:
    from slowapi import Limiter
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
    from slowapi.util import get_remote_address

    def get_rate_limit_key(request: Any) -> str:
        user = getattr(getattr(request, "state", None), "user", None)
        user_id = getattr(user, "id", None)
        if user_id:
            return f"user:{user_id}"
        return f"ip:{get_remote_address(request)}"

    settings = get_settings()
    storage_uri = settings.rate_limit_storage_url or settings.redis_url
    SLOWAPI_AVAILABLE = True
    limiter = Limiter(
        key_func=get_rate_limit_key,
        default_limits=[settings.rate_limit_default],
        storage_uri=storage_uri,
        in_memory_fallback_enabled=bool(storage_uri),
        in_memory_fallback=[settings.rate_limit_default],
        swallow_errors=True,
    )
    if storage_uri:
        logger.info("Rate limiting backed by Redis-compatible storage.")
    else:
        logger.warning("RATE_LIMIT_STORAGE_URL/REDIS_URL unset; rate limiting is in-memory.")
except ImportError:  # pragma: no cover - slowapi optional in minimal installs
    RateLimitExceeded = None  # type: ignore[assignment]
    SlowAPIMiddleware = None  # type: ignore[assignment]
    SLOWAPI_AVAILABLE = False

    class _NoLimit:
        def limit(
            self, *_args: Any, **_kwargs: Any
        ) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
            def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
                return fn

            return decorator

    limiter = _NoLimit()
    logger.warning("slowapi not installed; rate limiting disabled.")
