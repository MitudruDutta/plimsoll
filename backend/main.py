"""
FastAPI Main Application
"""
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import json
import time
from dotenv import load_dotenv

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
    _SLOWAPI_AVAILABLE = True
except ImportError:  # pragma: no cover - slowapi optional in minimal installs
    _SLOWAPI_AVAILABLE = False

# Load environment variables
load_dotenv()

# Import modules
from shared.database.database import get_db, Base, engine
from shared.database.models import Customer, Conversation, Message, CustomerCategory, MessageSender, Handoff, ConversationStatus
from modules.orchestration.crew_orchestrator import CrewAIOrchestrator, get_crew_orchestrator
from modules.orchestration.crew_stock_research import build_company_research_crew
from modules.financial.hedge_agent import get_hedge_agent
from modules.financial.market_data_service import get_market_data_service
from shared.auth.clerk_auth import get_current_user, User
from shared.config import get_settings

from modules.demo.demo_routes import router as demo_router
from modules.financial.market_sentinel_routes import router as market_sentinel_router
from modules.maritime.maritime_routes import router as maritime_router
from modules.financial.hedge_routes import router as hedge_router
from modules.analytics.visual_risk_routes import router as visual_risk_router


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI application
app = FastAPI(
    title="NaviGuard Maritime Risk Intelligence API",
    description=(
        "Maritime risk intelligence platform: vessel and route compliance, "
        "document analysis, market sentinel signals, and financial hedging."
    ),
    version="0.1.0",
)

# Rate limiting (per-IP) for expensive AI endpoints. Falls back to a no-op
# decorator when slowapi is not installed so the server still boots.
if _SLOWAPI_AVAILABLE:
    limiter = Limiter(key_func=get_remote_address, default_limits=[])
    app.state.limiter = limiter
    app.add_exception_handler(
        RateLimitExceeded,
        lambda request, exc: JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Slow down."},
        ),
    )
    app.add_middleware(SlowAPIMiddleware)
else:  # pragma: no cover
    class _NoLimit:
        def limit(self, *_a, **_kw):
            def decorator(fn):
                return fn
            return decorator

    limiter = _NoLimit()
    logger.warning("slowapi not installed; rate limiting disabled.")

# region agent log
def _debug_log(hypothesis_id: str, location: str, message: str, data: Dict[str, Any]) -> None:
    if not settings.debug:
        return
    try:
        with open("/tmp/naviguard_debug.log", "a", encoding="utf-8") as f:
            f.write(json.dumps({
                "runId": "pre-fix",
                "hypothesisId": hypothesis_id,
                "location": location,
                "message": message,
                "data": data,
                "timestamp": int(time.time() * 1000),
            }, ensure_ascii=True) + "\n")
    except Exception:
        pass
# endregion


@app.middleware("http")
async def maritime_upload_debug_middleware(request: Request, call_next):
    if request.url.path == "/api/maritime/documents/upload":
        # region agent log
        _debug_log(
            "H4",
            "backend/main.py:maritime_upload_debug_middleware:entry",
            "upload request received at middleware",
            {
                "method": request.method,
                "contentType": request.headers.get("content-type"),
                "contentLength": request.headers.get("content-length"),
            },
        )
        # endregion
    response = await call_next(request)
    if request.url.path == "/api/maritime/documents/upload":
        # region agent log
        _debug_log(
            "H5",
            "backend/main.py:maritime_upload_debug_middleware:exit",
            "upload request completed in middleware",
            {"statusCode": response.status_code},
        )
        # endregion
    return response


@app.exception_handler(RequestValidationError)
async def request_validation_exception_debug_handler(request: Request, exc: RequestValidationError):
    if request.url.path == "/api/maritime/documents/upload":
        # region agent log
        _debug_log(
            "H1",
            "backend/main.py:request_validation_exception_debug_handler",
            "upload request validation failed",
            {"errors": exc.errors()},
        )
        # endregion
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# 
app.include_router(demo_router)
app.include_router(market_sentinel_router)
app.include_router(maritime_router)
app.include_router(hedge_router)
app.include_router(visual_risk_router)
from modules.analytics.analytics import router as analytics_router
app.include_router(analytics_router)

@app.get("/api/protected")
def read_protected(user: User = Depends(get_current_user)):
    """Identity probe: returns the current authenticated user.

    Admin statistics live at ``/api/admin/stats`` to avoid duplication.
    """
    return {
        "message": "You are authenticated",
        "user_id": user.id,
        "email": user.email or "",
        "is_admin": user.role == "admin",
        "claims": user.claims,
    }


# CORS — explicit origins, methods, headers. Wildcard methods/headers are
# silently downgraded by browsers when allow_credentials=True.
cors_origins = [
    origin.strip()
    for origin in settings.cors_origins.split(",")
    if origin.strip()
]
if not cors_origins:
    logger.warning("CORS_ORIGINS empty; rejecting cross-origin browser calls.")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

# 
try:
    # chatbot = get_chatbot()
    # classifier = get_classifier()
    # handoff_manager = get_handoff_manager()
    crew_orchestrator = get_crew_orchestrator()
    logger.info("Core modules initialized successfully")
except Exception as e:
    logger.error(f"Core module initialization failed: {e}")
    # MVP phase allows some features to be unavailable
    # chatbot = None
    # classifier = None
    # handoff_manager = None
    crew_orchestrator = None


def _legacy_service_unavailable(service_name: str) -> None:
    raise HTTPException(
        status_code=503,
        detail=f"{service_name} is not configured in this backend build."
    )


def _require_customer_access(db: Session, user: User, customer_id: int) -> Customer:
    if user.role == "admin":
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer

    customer = db.query(Customer).filter(Customer.clerk_id == user.id).first()
    if not customer and user.email:
        customer = db.query(Customer).filter(Customer.email == user.email).first()
    if not customer or customer.id != customer_id:
        raise HTTPException(status_code=403, detail="Cannot access another customer's data")
    return customer


def _require_admin(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


# ========== Data models ==========

class ChatRequest(BaseModel):
    customer_id: int
    message: str
    language: str = 'zh-cn'
    use_crewai: bool = False  # feature flag: enable CrewAI orchestration

class ChatResponse(BaseModel):
    answer: str
    confidence: float
    should_handoff: bool
    product_tag: Optional[str]

class CustomerCreate(BaseModel):
    name: str
    email: str
    company: Optional[str] = None
    phone: Optional[str] = None
    language: str = 'zh-cn'

class HandoffRequest(BaseModel):
    conversation_id: int
    reason: str = 'manual_request'

class HumanMessageRequest(BaseModel):
    """Human sends message"""
    conversation_id: int
    content: str
    agent_name: str = "Human agent"

class UpdateHandoffStatusRequest(BaseModel):
    """Update handoff status"""
    status: str  # pending/processing/completed
    agent_name: Optional[str] = None

class CompanyResearchRequest(BaseModel):
    """Company research request"""
    company: str
    question: str
    ticker: Optional[str] = None

class HedgeOperationParams(BaseModel):
    """Operation parameters for hedging calculations"""
    fuel_consumption_monthly: float = 1000  # tons
    revenue_foreign_monthly: float = 1_800_000  # EUR
    fx_pair: str = "EUR"
    monthly_voyages: int = 4
    current_route: str = "Shanghai → Rotterdam"

class CrisisActivationRequest(BaseModel):
    """Request to activate crisis hedging mode"""
    crisis_scenario: str  # 'red_sea', 'fuel_spike', 'currency_crisis'
    operation_params: HedgeOperationParams


# ========== API routes ==========

@app.get("/")
def read_root():
    """Root path"""
    return {
        "message": "NaviGuard Maritime Risk Intelligence API",
        "version": "0.1.0",
        "status": "running"
    }

@app.post("/api/chat", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat(
    request: Request,
    payload: ChatRequest,
    bg_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Chat interface."""
    _require_customer_access(db, user, payload.customer_id)

    active_conv = db.query(Conversation).filter(
        Conversation.customer_id == payload.customer_id,
        Conversation.status == "active",
    ).first()

    if not active_conv:
        active_conv = Conversation(
            customer_id=payload.customer_id,
            status="active",
            started_at=datetime.now(),
        )
        db.add(active_conv)
        db.commit()
        db.refresh(active_conv)

    customer_msg = Message(
        conversation_id=active_conv.id,
        content=payload.message,
        sender=MessageSender.CUSTOMER,
        language=payload.language,
        created_at=datetime.now(),
    )
    db.add(customer_msg)

    response = None
    if payload.use_crewai and crew_orchestrator:
        try:
            response = crew_orchestrator.chat(
                customer_id=payload.customer_id,
                message=payload.message,
                language=payload.language,
            )
        except Exception as e:
            logger.warning(f"CrewAI mode failed, fallback to default chatbot: {e}")
            response = None

    if response is None:
        db.rollback()
        _legacy_service_unavailable("Chat service")

    ai_msg = Message(
        conversation_id=active_conv.id,
        content=response['answer'],
        sender=MessageSender.AI,
        language=payload.language,
        ai_confidence=response['confidence'],
        created_at=datetime.now(),
    )
    db.add(ai_msg)

    active_conv.message_count += 2
    active_conv.avg_confidence = response['confidence']

    if active_conv.message_count >= 4:
        bg_tasks.add_task(classify_customer_bg, payload.customer_id)

    if response['should_handoff']:
        db.add(Handoff(
            conversation_id=active_conv.id,
            trigger_reason='low_confidence' if response['confidence'] < 0.7 else 'customer_request',
            created_at=datetime.now(),
        ))

    db.commit()

    return {
        "answer": response['answer'],
        "confidence": response['confidence'],
        "should_handoff": response['should_handoff'],
        "product_tag": response.get('product_tag'),
        "conversation_id": active_conv.id,
    }

@app.post("/api/customers", status_code=201)
def create_customer(
    customer: CustomerCreate, 
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Customer"""
    if customer.email != user.email:
        raise HTTPException(status_code=403, detail="Cannot create customer for another email")

    # Check if email already exists
    existing = db.query(Customer).filter(Customer.email == customer.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    new_customer = Customer(
        clerk_id=user.id,
        name=customer.name,
        email=customer.email,
        company=customer.company,
        phone=customer.phone,
        language=customer.language,
        created_at=datetime.now()
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    
    return {
        "id": new_customer.id,
        "name": new_customer.name,
        "email": new_customer.email,
        "company": new_customer.company,
        "phone": new_customer.phone,
        "category": new_customer.category.value if new_customer.category else "NORMAL",
        "priority_score": new_customer.priority_score or 3,
        "created_at": new_customer.created_at.isoformat()
    }

@app.get("/api/customers")
def list_customers(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """CustomerList"""
    _require_admin(user)
    customers = db.query(Customer).order_by(Customer.priority_score.desc()).all()
    return {
        "total": len(customers),
        "customers": [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "company": c.company,
                "category": c.category.value if c.category else None,
                "priority_score": c.priority_score
            }
            for c in customers
        ]
    }

@app.post("/api/classify/{customer_id}")
async def classify_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Customer"""
    _require_customer_access(db, user, customer_id)
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    _legacy_service_unavailable("Customer classifier")

@app.post("/api/handoff")
def create_handoff(
    request: HandoffRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Manual handoff to human"""
    conversation = db.query(Conversation).filter(Conversation.id == request.conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    _require_customer_access(db, user, conversation.customer_id)
    
    handoff = Handoff(
        conversation_id=request.conversation_id,
        trigger_reason=request.reason,
        created_at=datetime.now()
    )
    db.add(handoff)
    db.commit()
    db.refresh(handoff)
    summary = conversation.summary or ""
    
    return {
        "handoff_id": handoff.id,
        "summary": summary
    }

@app.get("/api/conversations/{customer_id}")
def get_conversations(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Customer"""
    _require_customer_access(db, user, customer_id)
    # Customer
    conversations = db.query(Conversation).filter(
        Conversation.customer_id == customer_id
    ).order_by(Conversation.started_at.desc()).all()
    
    result = []
    for conversation in conversations:
        messages = db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at).all()
        
        result.append({
            "id": conversation.id,
            "customer_id": conversation.customer_id,
            "status": conversation.status.value if hasattr(conversation.status, 'value') else conversation.status,
            "message_count": conversation.message_count,
            "created_at": conversation.started_at.isoformat(),
            "messages": [
                {
                    "id": msg.id,
                    "sender": msg.sender.value if hasattr(msg.sender, 'value') else msg.sender,
                    "content": msg.content,
                    "ai_confidence": msg.ai_confidence,
                    "created_at": msg.created_at.isoformat()
                }
                for msg in messages
            ]
        })
    
    return result

@app.get("/api/conversation/{conversation_id}")
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get single conversation details(by conversation_id)"""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    _require_customer_access(db, user, conversation.customer_id)
    
    messages = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.created_at).all()
    
    return {
        "id": conversation.id,
        "customer_id": conversation.customer_id,
        "status": conversation.status.value if hasattr(conversation.status, 'value') else conversation.status,
        "message_count": conversation.message_count,
        "created_at": conversation.started_at.isoformat(),
        "messages": [
            {
                "id": msg.id,
                "sender": msg.sender.value if hasattr(msg.sender, 'value') else msg.sender,
                "content": msg.content,
                "ai_confidence": msg.ai_confidence,
                "created_at": msg.created_at.isoformat()
            }
            for msg in messages
        ]
    }

# ========== Human handoff related APIs ==========

@app.get("/api/handoffs")
def get_handoffs(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get handoff list"""
    from shared.database.models import HandoffStatus
    _require_admin(user)
    
    query = db.query(Handoff)
    
    # Status filtering
    if status:
        try:
            status_enum = HandoffStatus(status)
            query = query.filter(Handoff.status == status_enum)
        except ValueError:
            pass
    
    handoffs = query.order_by(Handoff.created_at.desc()).all()
    
    result = []
    for handoff in handoffs:
        conversation = db.query(Conversation).filter(Conversation.id == handoff.conversation_id).first()
        if not conversation:
            continue
            
        customer = db.query(Customer).filter(Customer.id == conversation.customer_id).first()
        if not customer:
            continue
        
        result.append({
            "id": handoff.id,
            "conversation_id": handoff.conversation_id,
            "status": handoff.status.value if hasattr(handoff.status, 'value') else handoff.status,
            "trigger_reason": handoff.trigger_reason,
            "agent_name": handoff.agent_name,
            "created_at": handoff.created_at.isoformat(),
            "updated_at": handoff.updated_at.isoformat() if handoff.updated_at else None,
            "customer": {
                "id": customer.id,
                "name": customer.name,
                "email": customer.email,
                "category": customer.category.value if customer.category else "normal",
                "priority_score": customer.priority_score or 3
            }
        })
    
    return {"total": len(result), "handoffs": result}

@app.post("/api/messages/human")
def send_human_message(
    request: HumanMessageRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Human sends message"""
    _require_admin(user)
    conversation = db.query(Conversation).filter(Conversation.id == request.conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    human_msg = Message(
        conversation_id=request.conversation_id,
        content=request.content,
        sender=MessageSender.HUMAN,
        created_at=datetime.now()
    )
    db.add(human_msg)
    conversation.message_count += 1
    conversation.status = ConversationStatus.HANDOFF
    db.commit()
    db.refresh(human_msg)
    
    return {"message_id": human_msg.id, "status": "sent", "created_at": human_msg.created_at.isoformat()}

@app.put("/api/handoffs/{handoff_id}/status")
def update_handoff_status(
    handoff_id: int,
    request: UpdateHandoffStatusRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update handoff status"""
    from shared.database.models import HandoffStatus
    _require_admin(user)
    
    handoff = db.query(Handoff).filter(Handoff.id == handoff_id).first()
    if not handoff:
        raise HTTPException(status_code=404, detail="Handoff not found")
    
    try:
        handoff.status = HandoffStatus(request.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    if request.agent_name:
        handoff.agent_name = request.agent_name
    
    handoff.updated_at = datetime.now()
    db.commit()
    
    return {
        "id": handoff.id,
        "status": handoff.status.value,
        "agent_name": handoff.agent_name,
        "updated_at": handoff.updated_at.isoformat()
    }

# ========== Company Research CrewAI ==========

@app.post("/api/company-research")
@limiter.limit("5/minute")
def run_company_research(
    request: Request,
    payload: CompanyResearchRequest,
    user: User = Depends(get_current_user),
):
    """Run company research CrewAI pipeline"""
    try:
        crew, tasks = build_company_research_crew(
            company=payload.company,
            question=payload.question,
            ticker=payload.ticker,
        )
        result = crew.kickoff()
        # CrewAI returns a rich object; cast to string for API response.
        return {
            "company": payload.company,
            "ticker": payload.ticker,
            "question": payload.question,
            "result": str(result),
        }
    except Exception as e:
        logger.error(f"Company research crew failed: {e}")
        raise HTTPException(status_code=500, detail=f"Company research failed: {e}")

# ========== Admin Analytics API ==========

@app.get("/api/admin/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get admin dashboard statistics"""
    _require_admin(user)

    from sqlalchemy import func
    from datetime import timedelta
    
    # 1. Customer
    category_stats = db.query(
        Customer.category, func.count(Customer.id)
    ).group_by(Customer.category).all()
    
    # 2. Conversation volume trend for past 7 days
    seven_days_ago = datetime.now() - timedelta(days=7)
    trend_stats = db.query(
        func.date(Conversation.started_at), func.count(Conversation.id)
    ).filter(Conversation.started_at >= seven_days_ago) \
     .group_by(func.date(Conversation.started_at)).all()
    
    # 3. Average confidence
    avg_conf = db.query(func.avg(Conversation.avg_confidence)).scalar() or 0.85

    return {
        "categories": [{"name": str(c[0].value if c[0] else "normal"), "value": c[1]} for c in category_stats],
        "trends": [{"date": str(t[0]), "count": t[1]} for t in trend_stats],
        "overall": {
            "avg_confidence": round(float(avg_conf), 2),
            "total_customers": db.query(func.count(Customer.id)).scalar(),
            "total_conversations": db.query(func.count(Conversation.id)).scalar()
        }
    }

# ========== Background tasks ==========

def classify_customer_bg(customer_id: int):
    """Background tasks: Customer classification.

    Opens a fresh DB session because the request session closes once the
    HTTP handler returns.
    """
    from shared.database.database import SessionLocal
    db = SessionLocal()
    try:
        messages = db.query(Message).join(Conversation).filter(
            Conversation.customer_id == customer_id
        ).order_by(Message.created_at.desc()).limit(20).all()

        if messages:
            logger.warning("Background classification skipped: classifier is not configured")
            return
    except Exception as e:
        logger.error(f"Background classification failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
