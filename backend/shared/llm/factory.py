"""Single source of truth for CrewAI LLM construction.

Previously every crew file had its own ``_init_llm`` and ``test_gemini_connection``
copy. Each call into a crew was burning a Gemini ``ping`` token spend. We
do the connection check once per process via :func:`get_default_llm`.
"""

from __future__ import annotations

import logging
import os
import threading
from typing import Any

from shared.config import get_settings

logger = logging.getLogger(__name__)


try:
    from crewai import LLM as CrewLLM  # type: ignore

    HAS_CREWAI = True
except ImportError:  # pragma: no cover - optional dep in slim images
    CrewLLM = None  # type: ignore[assignment]
    HAS_CREWAI = False


_lock = threading.Lock()
_cached_llm: Any | None = None
_gemini_pinged = False


def _ping_gemini(api_key: str, *, timeout: int = 10) -> None:
    """Sanity-check the Gemini key once per process."""
    global _gemini_pinged
    if _gemini_pinged:
        return
    try:
        import google.generativeai as genai  # type: ignore
    except ImportError as exc:
        raise RuntimeError("google-generativeai not installed") from exc

    genai.configure(api_key=api_key)
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        model.generate_content("ping", request_options={"timeout": timeout})
        _gemini_pinged = True
    except Exception as exc:  # pragma: no cover - depends on network
        raise RuntimeError(f"Gemini health check failed: {type(exc).__name__}: {exc}") from exc


def get_default_llm() -> Any:
    """Return a ready-to-use CrewAI LLM. Cached after first call."""
    global _cached_llm
    if _cached_llm is not None:
        return _cached_llm

    with _lock:
        if _cached_llm is not None:
            return _cached_llm
        if not HAS_CREWAI:
            raise RuntimeError("CrewAI is not installed")

        settings = get_settings()
        if settings.google_api_key:
            os.environ.setdefault("GOOGLE_API_KEY", settings.google_api_key)
            _ping_gemini(settings.google_api_key)
            _cached_llm = CrewLLM(
                model="gemini/gemini-2.0-flash",
                api_key=settings.google_api_key,
            )
            return _cached_llm

        if settings.openai_api_key:
            os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)
            if settings.openai_base_url:
                os.environ.setdefault("OPENAI_BASE_URL", settings.openai_base_url)
            _cached_llm = CrewLLM(model=settings.openai_model or "gpt-4o-mini")
            return _cached_llm

        raise RuntimeError("No LLM API key configured. Set GOOGLE_API_KEY or OPENAI_API_KEY.")


def reset_cached_llm() -> None:
    """Test hook — clear the cached LLM so a different config is picked up."""
    global _cached_llm, _gemini_pinged
    _cached_llm = None
    _gemini_pinged = False
