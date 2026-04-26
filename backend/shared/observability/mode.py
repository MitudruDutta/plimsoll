"""Demo/live mode tagging for API responses.

Every mock-driven or partially-mock surface ships a ``mode`` discriminator so
the frontend can render the right banner ("Demo data — replace before prod")
and the QA harness can audit which routes are still simulated.

Allowed values
--------------
- ``demo`` — mock data, fixed scenarios, no live vendor calls
- ``live`` — real upstream data (Argus, ECB, Sentinel-2, Spire, …)
- ``hybrid`` — some fields live, some still mocked
"""

from __future__ import annotations

from collections.abc import MutableMapping
from typing import Any, Literal

Mode = Literal["demo", "live", "hybrid"]


def tag_response(payload: MutableMapping[str, Any], mode: Mode) -> MutableMapping[str, Any]:
    """Attach a ``mode`` field to a response dict (idempotent)."""
    payload.setdefault("mode", mode)
    return payload


def demo_response(payload: MutableMapping[str, Any]) -> MutableMapping[str, Any]:
    return tag_response(payload, "demo")


def live_response(payload: MutableMapping[str, Any]) -> MutableMapping[str, Any]:
    return tag_response(payload, "live")
