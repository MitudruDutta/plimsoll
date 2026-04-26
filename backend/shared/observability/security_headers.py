"""Security headers middleware.

Adds the standard set of HTTP security headers to every response. Values are
deliberately strict: this is a JSON API, not an HTML app, so we can tighten
CSP and frame controls without breaking real users.

Notes
-----
- HSTS is only emitted over HTTPS (``request.url.scheme == "https"``) so
  local HTTP development is not poisoned by a stuck `Strict-Transport-Security`
  header in the browser.
- CSP is `default-src 'none'` because the API serves JSON; if/when we serve
  HTML (legal pages, etc.), tighten/loosen this on a per-route basis instead
  of globally relaxing it here.
"""
from __future__ import annotations

from typing import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


_DEFAULT_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": (
        "default-src 'none'; "
        "frame-ancestors 'none'; "
        "base-uri 'none'; "
        "form-action 'none'"
    ),
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach security headers to every HTTP response."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        for key, value in _DEFAULT_HEADERS.items():
            response.headers.setdefault(key, value)
        if request.url.scheme == "https":
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=63072000; includeSubDomains; preload",
            )
        return response
