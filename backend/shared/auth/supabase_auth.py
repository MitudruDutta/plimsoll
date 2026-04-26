"""Supabase JWT verification.

Supabase issues access tokens that are either:
  * symmetric HS256 — legacy projects, signed with the project's
    ``SUPABASE_JWT_SECRET``;
  * asymmetric RS256/ES256 — current projects, keys exposed via
    ``{SUPABASE_URL}/auth/v1/.well-known/jwks.json``.

This module accepts both. Set either ``SUPABASE_JWT_SECRET`` or
``SUPABASE_URL`` (with optional ``SUPABASE_JWKS_URL`` override) and incoming
``Authorization: Bearer <jwt>`` headers will be validated against the right
key material.

Admin role
----------
Supabase users have no first-class "role" concept beyond ``authenticated``.
We follow the same admin-whitelist pattern used elsewhere: emails listed in
``ADMIN_WHITELIST`` are promoted to ``role=admin``. ``user_metadata.role`` and
``app_metadata.role`` are also honoured when present.
"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx
from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from shared.config import get_settings

logger = logging.getLogger(__name__)

_JWKS_TTL_SECONDS = 3600
_SUPPORTED_ALGORITHMS = ["RS256", "ES256", "HS256"]


class User(BaseModel):
    """Authenticated user view."""

    id: str
    email: str | None = None
    role: str | None = "user"
    claims: dict[str, Any] = Field(default_factory=dict)


class _SupabaseJWKSCache:
    def __init__(self) -> None:
        self._jwks: dict[str, Any] | None = None
        self._expires_at: float = 0.0

    async def get(self, jwks_url: str) -> dict[str, Any]:
        now = time.time()
        if self._jwks and now < self._expires_at:
            return self._jwks
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(jwks_url)
                response.raise_for_status()
                self._jwks = response.json()
                self._expires_at = now + _JWKS_TTL_SECONDS
                return self._jwks
        except Exception as exc:
            logger.error("Failed to fetch Supabase JWKS from %s: %s", jwks_url, exc)
            raise HTTPException(status_code=500, detail="Failed to fetch auth keys") from exc

    def invalidate(self) -> None:
        self._jwks = None
        self._expires_at = 0.0


_jwks_cache = _SupabaseJWKSCache()
_bearer_scheme = HTTPBearer(auto_error=True)


def _resolve_jwks_url(settings) -> str | None:  # type: ignore[no-untyped-def]
    if settings.supabase_jwks_url:
        return settings.supabase_jwks_url
    if settings.supabase_url:
        return f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    return None


def _pick_rsa_key(jwks: dict[str, Any], kid: str) -> dict[str, Any] | None:
    for key in jwks.get("keys", []):
        if key.get("kid") != kid:
            continue
        return {
            "kty": key.get("kty"),
            "kid": key.get("kid"),
            "use": key.get("use"),
            "alg": key.get("alg"),
            "n": key.get("n"),
            "e": key.get("e"),
            "x": key.get("x"),
            "y": key.get("y"),
            "crv": key.get("crv"),
        }
    return None


async def _decode_jwt(token: str) -> dict[str, Any]:
    settings = get_settings()
    jwt_secret = getattr(settings, "supabase_jwt_secret", None)

    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token header") from exc

    alg = header.get("alg")
    if alg not in _SUPPORTED_ALGORITHMS:
        raise HTTPException(status_code=401, detail=f"Unsupported JWT algorithm: {alg}")

    try:
        if alg == "HS256":
            if not jwt_secret:
                raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET is not configured")
            return jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_aud": False},
            )

        jwks_url = _resolve_jwks_url(settings)
        if not jwks_url:
            raise HTTPException(
                status_code=500,
                detail="Supabase JWKS URL is not configured (SUPABASE_URL or SUPABASE_JWKS_URL)",
            )
        kid = header.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="Token missing key id (kid)")

        jwks = await _jwks_cache.get(jwks_url)
        rsa_key = _pick_rsa_key(jwks, kid)
        if rsa_key is None:
            _jwks_cache.invalidate()
            jwks = await _jwks_cache.get(jwks_url)
            rsa_key = _pick_rsa_key(jwks, kid)
        if rsa_key is None:
            raise HTTPException(status_code=401, detail="Invalid key identifier")

        return jwt.decode(
            token,
            rsa_key,
            algorithms=[alg],
            audience="authenticated",
            options={"verify_aud": False},
        )
    except JWTError as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid token") from exc


def _extract_role(payload: dict[str, Any], email: str | None, whitelist: set[str]) -> str:
    if email and email.lower() in whitelist:
        return "admin"
    app_meta = payload.get("app_metadata") or {}
    user_meta = payload.get("user_metadata") or {}
    return app_meta.get("role") or user_meta.get("role") or payload.get("role") or "user"


def _extract_email(payload: dict[str, Any]) -> str | None:
    return payload.get("email") or (payload.get("user_metadata") or {}).get("email")


async def verify_token(
    request: Request,
    auth: HTTPAuthorizationCredentials = Security(_bearer_scheme),
) -> User:
    payload = await _decode_jwt(auth.credentials)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    settings = get_settings()
    whitelist = {
        entry.strip().lower() for entry in settings.admin_whitelist.split(",") if entry.strip()
    }

    email = _extract_email(payload)
    role = _extract_role(payload, email, whitelist)
    user = User(id=user_id, email=email, role=role, claims=payload)
    request.state.user = user
    return user


async def get_current_user(user: User = Depends(verify_token)) -> User:
    return user


async def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
