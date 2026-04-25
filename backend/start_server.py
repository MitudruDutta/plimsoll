#!/usr/bin/env python
"""Convenience launcher: `python start_server.py`.

Reads HOST / PORT / RELOAD / LOG_LEVEL from the environment (falling back to
sensible local-dev defaults) and loads `.env` before starting uvicorn so that
the app's settings (DATABASE_URL, LLM keys, etc.) are honored.
"""

import os

os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    # dotenv is optional at runtime; fail silently if missing.
    pass


def _parse_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8001"))
    reload = _parse_bool(os.environ.get("RELOAD", "false"))
    log_level = os.environ.get("LOG_LEVEL", "info").lower()

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level=log_level,
    )
