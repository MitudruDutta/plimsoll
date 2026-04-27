"""Hit every wired API route with auth dependency overridden.

Used to confirm that routes return reasonable responses (not 5xx) before
shipping. Run inside the backend container so the database, Redis, and
embedding model are reachable:

    docker exec plimsoll-backend-1 python scripts/api_smoke_test.py

Anything not 2xx/4xx (i.e. 5xx) gets flagged as a failure.
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any

# Make /app importable when this file is invoked from /app/scripts.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Silence SQL echo + httpx access logs so the summary stays readable.
for noisy in ("sqlalchemy.engine", "httpx", "httpcore"):
    logging.getLogger(noisy).setLevel(logging.WARNING)

from fastapi.testclient import TestClient

import main as backend_main
from shared.auth import User, get_admin_user, get_current_user

ADMIN = User(id="smoke-admin", email="admin@plimsoll.test", role="admin", claims={})
USER = User(id="smoke-user", email="user@plimsoll.test", role="user", claims={})

backend_main.app.dependency_overrides[get_current_user] = lambda: USER
backend_main.app.dependency_overrides[get_admin_user] = lambda: ADMIN

client = TestClient(backend_main.app)


def call(method: str, path: str, *, json_body: Any = None, params: dict | None = None) -> dict:
    started = time.perf_counter()
    response = client.request(method, path, json=json_body, params=params or {})
    elapsed_ms = (time.perf_counter() - started) * 1000
    body_preview: str
    try:
        parsed = response.json()
        body_preview = json.dumps(parsed)[:140]
    except Exception:
        body_preview = response.text[:140]
    return {
        "method": method,
        "path": path,
        "status": response.status_code,
        "ms": round(elapsed_ms, 1),
        "body": body_preview,
    }


CASES: list[tuple[str, str, dict | None, dict | None]] = [
    ("GET", "/healthz", None, None),
    ("GET", "/", None, None),
    ("GET", "/api/protected", None, None),
    ("GET", "/api/analytics/dashboard", None, None),
    ("POST", "/api/demo/start", None, None),
    ("GET", "/api/maritime/health", None, None),
    (
        "POST",
        "/api/maritime/me/provision",
        {"auth_user_id": USER.id, "email": USER.email, "name": "Smoke User"},
        None,
    ),
    ("GET", "/api/maritime/ports", None, {"limit": 5}),
    ("GET", "/api/maritime/vessels", None, {"limit": 5}),
    ("GET", "/api/maritime/kb/document-types", None, None),
    ("GET", "/api/maritime/kb/stats", None, None),
    (
        "POST",
        "/api/maritime/kb/search",
        {"query": "fire safety SOLAS chapter II-2", "top_k": 3},
        None,
    ),
    ("GET", "/api/visual-risk/scenarios", None, None),
    ("GET", "/api/visual-risk/status", None, None),
    ("GET", "/api/hedge/health", None, None),
    ("GET", "/api/hedge/market-data", None, None),
    (
        "POST",
        "/api/hedge/assess-risk",
        {
            "fuel_consumption_monthly": 1200,
            "revenue_foreign_monthly": 5000000,
            "fx_pair": "USD/EUR",
            "monthly_voyages": 8,
            "current_route": "Singapore-Rotterdam",
        },
        None,
    ),
    ("GET", "/api/market-sentinel/health", None, None),
    ("GET", "/api/market-sentinel/agents/status", None, None),
]


def main() -> int:
    print(f"{'STATUS':<8} {'MS':>7}  METHOD PATH")
    print("-" * 80)
    failures: list[dict] = []
    for method, path, body, params in CASES:
        result = call(method, path, json_body=body, params=params)
        marker = "OK " if 200 <= result["status"] < 500 else "FAIL"
        print(
            f"{marker:<4} {result['status']:>3} {result['ms']:>7}  "
            f"{result['method']} {result['path']}"
        )
        print(f"        > {result['body']}")
        if result["status"] >= 500:
            failures.append(result)
    print()
    if failures:
        print(f"{len(failures)} 5xx failures:")
        for f in failures:
            print(f"  {f['method']} {f['path']} -> {f['status']}")
        return 1
    print("All routes returned <500.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
