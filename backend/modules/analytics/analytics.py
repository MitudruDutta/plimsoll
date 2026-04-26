"""Lightweight analytics dashboard.

The data source is the bundled ``virtual_users.json`` snapshot. The file is
~2 MB and parsing it on every request burns CPU + IO, so we cache the parsed
form per process. Bust the cache on startup if the file is replaced.
"""

from __future__ import annotations

import json
import logging
from collections import Counter
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends

from shared.auth import User, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/analytics",
    tags=["analytics"],
    dependencies=[Depends(get_current_user)],
)

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "virtual_users.json"


@lru_cache(maxsize=1)
def _load_virtual_users() -> tuple[dict[str, Any], ...]:
    if not DATA_PATH.exists():
        logger.warning("Analytics data missing at %s", DATA_PATH)
        return ()
    try:
        with DATA_PATH.open(encoding="utf-8") as handle:
            return tuple(json.load(handle))
    except (OSError, json.JSONDecodeError):
        logger.exception("Failed to load analytics dataset")
        return ()


@lru_cache(maxsize=1)
def _build_dashboard() -> dict[str, Any]:
    users = _load_virtual_users()
    if not users:
        return {"error": "No data available"}

    total_users = len(users)
    total_tokens = sum(u.get("total_tokens", 0) for u in users)

    locations: list[str] = []
    for u in users:
        loc = u.get("location", "Unknown")
        if "," in loc:
            locations.append(loc.split(",")[0].strip())
        else:
            locations.append(loc)

    location_counts = Counter(locations)
    sorted_locations = sorted(
        ({"name": k, "value": v} for k, v in location_counts.items()),
        key=lambda x: x["value"],
        reverse=True,
    )
    if len(sorted_locations) <= 20:
        location_data = sorted_locations
    else:
        location_data = sorted_locations[:20]
        others = sum(item["value"] for item in sorted_locations[20:])
        if others:
            location_data.append({"name": "Others", "value": others})

    sorted_by_tokens = sorted(users, key=lambda x: x.get("total_tokens", 0), reverse=True)
    top_users_data = [
        {"name": u.get("name", "Unknown"), "tokens": u.get("total_tokens", 0)}
        for u in sorted_by_tokens[:5]
    ]

    dates: list[str] = []
    for u in users:
        dt_str = u.get("register_date")
        if not dt_str:
            continue
        try:
            dt = datetime.fromisoformat(dt_str)
        except ValueError:
            continue
        dates.append(dt.strftime("%Y-%m-%d"))
    trend_data = [{"date": k, "count": v} for k, v in sorted(Counter(dates).items())]

    return {
        "kpi": {
            "total_users": total_users,
            "total_tokens": total_tokens,
            "avg_tokens_per_user": (int(total_tokens / total_users) if total_users else 0),
        },
        "charts": {
            "location_distribution": location_data,
            "top_users": top_users_data,
            "registration_trend": trend_data,
        },
    }


@router.get("/dashboard")
def get_dashboard_data(_user: User = Depends(get_current_user)) -> dict[str, Any]:
    """Return cached analytics dashboard payload."""
    return _build_dashboard()
