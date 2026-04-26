from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect
from modules.demo.autoplay_controller import CrisisAutoPlayController
from shared.auth.clerk_auth import User, get_current_user
from shared.config import get_settings
import base64
import hashlib
import hmac
import json
import uuid
import logging
import asyncio
import os
import time

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/demo", tags=["Demo"])

# Simple in-memory storage for active demo controllers
# demo_id -> {"controller": controller_instance, "user_id": str, "expires_at": int}
active_sessions = {}

def _sign_demo_token(demo_id: str, user_id: str, expires_at: int) -> str:
    settings = get_settings()
    payload = {"demo_id": demo_id, "sub": user_id, "exp": expires_at}
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    body = base64.urlsafe_b64encode(payload_bytes).decode("ascii").rstrip("=")
    signature = hmac.new(
        settings.demo_session_secret.encode("utf-8"),
        body.encode("ascii"),
        hashlib.sha256,
    ).digest()
    sig = base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=")
    return f"{body}.{sig}"


def _verify_demo_token(token: str, demo_id: str) -> dict | None:
    settings = get_settings()
    try:
        body, sig = token.split(".", 1)
        expected = hmac.new(
            settings.demo_session_secret.encode("utf-8"),
            body.encode("ascii"),
            hashlib.sha256,
        ).digest()
        supplied = base64.urlsafe_b64decode(sig + "=" * (-len(sig) % 4))
        if not hmac.compare_digest(expected, supplied):
            return None

        payload_bytes = base64.urlsafe_b64decode(body + "=" * (-len(body) % 4))
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        return None

    if payload.get("demo_id") != demo_id:
        return None
    if int(payload.get("exp", 0)) < int(time.time()):
        return None
    if not payload.get("sub"):
        return None
    return payload


@router.post("/start")
async def start_demo(
    request: Request,
    scenario: str = "crisis_455pm",
    user: User = Depends(get_current_user),
):
    """
    Demo
     demo_id  WebSocket URL
    """
    demo_id = str(uuid.uuid4())
    logger.info(f"Starting demo session: {demo_id} for scenario: {scenario}")
    
    now = int(time.time())
    expires_at = now + get_settings().demo_session_ttl_seconds
    controller = CrisisAutoPlayController()
    active_sessions[demo_id] = {
        "controller": controller,
        "user_id": user.id,
        "expires_at": expires_at,
    }
    demo_token = _sign_demo_token(demo_id=demo_id, user_id=user.id, expires_at=expires_at)
    ws_base_url = os.getenv("PUBLIC_WS_BASE_URL")
    if not ws_base_url:
        host = request.url.hostname or "127.0.0.1"
        if host in {"localhost", "0.0.0.0", "::1"}:
            host = "127.0.0.1"
        port = os.getenv("PORT") or str(request.url.port or 8000)
        ws_base_url = f"ws://{host}:{port}"

    return {
        "demo_id": demo_id,
        "status": "started",
        "websocket_url": f"{ws_base_url.rstrip('/')}/api/demo/ws?demo_id={demo_id}&demo_token={demo_token}",
        "expires_at": expires_at,
        "duration_seconds": 178
    }

@router.websocket("/ws")
async def websocket_demo(websocket: WebSocket, demo_id: str, demo_token: str):
    """
    WebSocket
    """
    await websocket.accept()
    logger.info(f"WebSocket connected for demo_id: {demo_id}")

    session = active_sessions.get(demo_id)
    claims = _verify_demo_token(demo_token, demo_id)
    if not session or not claims or session.get("user_id") != claims.get("sub"):
        logger.warning(f"Demo session not found: {demo_id}")
        await websocket.close(code=1008, reason="Invalid demo_id")
        return
    if int(session.get("expires_at", 0)) < int(time.time()):
        active_sessions.pop(demo_id, None)
        await websocket.close(code=1008, reason="Demo session expired")
        return

    controller = session["controller"]

    demo_task = None
    
    try:
        # Loop to handle commands from client (e.g., "play", "confirm")
        while True:
            data = await websocket.receive_json()
            logger.info(f"Received command: {data}")
            
            if data.get("action") == "play":
                if not controller.is_playing:
                    controller.is_playing = True
                    # Background tasksdemo,
                    demo_task = asyncio.create_task(controller.run_demo_sequence(websocket))
                    logger.info("Demo sequence started in background")
            elif data.get("action") == "confirm":
                # (Approve/Override/Details)
                confirmation_type = data.get("confirmation_type", "approve")
                logger.info(f"User confirmed decision: {confirmation_type}")
                controller.confirm_decision(confirmation_type)
            elif data.get("action") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {demo_id}")
        if demo_id in active_sessions:
            del active_sessions[demo_id]
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011)
        except:
            pass
    finally:
        # Background tasks
        if demo_task and not demo_task.done():
            demo_task.cancel()
        if demo_id in active_sessions:
            del active_sessions[demo_id]
