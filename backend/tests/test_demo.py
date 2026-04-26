import asyncio
import os
import sys
from urllib.parse import parse_qs, urlparse

from starlette.requests import Request

parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)

from modules.demo.demo_routes import _verify_demo_token, active_sessions, start_demo
from shared.auth import User


def _request(hostname: str = "testserver", port: int = 8000):
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/demo/start",
            "headers": [(b"host", f"{hostname}:{port}".encode("ascii"))],
            "server": (hostname, port),
            "scheme": "http",
            "client": ("127.0.0.1", 50000),
        }
    )


def _user(user_id: str = "test-user"):
    return User(id=user_id, email=f"{user_id}@example.com", role="user")


def test_demo_start_returns_signed_websocket_url():
    data = asyncio.run(start_demo(_request(), user=_user()))

    assert "demo_id" in data
    assert data["status"] == "started"
    assert "websocket_url" in data
    assert "demo_token=" in data["websocket_url"]
    assert "expires_at" in data
    assert data["duration_seconds"] == 178
    assert data["demo_id"] in active_sessions

    parsed = urlparse(data["websocket_url"])
    query = parse_qs(parsed.query)
    assert query["demo_id"] == [data["demo_id"]]
    assert _verify_demo_token(query["demo_token"][0], data["demo_id"])["sub"] == "test-user"


def test_demo_token_rejects_tampering():
    data = asyncio.run(start_demo(_request(), user=_user()))
    parsed = urlparse(data["websocket_url"])
    query = parse_qs(parsed.query)
    token = query["demo_token"][0]

    assert _verify_demo_token(token, data["demo_id"]) is not None
    assert _verify_demo_token("bad", data["demo_id"]) is None
    assert _verify_demo_token(token, "wrong-demo-id") is None
