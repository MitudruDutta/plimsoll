# """
# Agent Chain-of-Thought (CoT) Data Models

# AI▼Structure
# """

# from pydantic import BaseModel, Field
# from typing import List, Optional
# from datetime import datetime
# from enum import Enum


# class AgentType(str, Enum):
#     """Agent type enumeration"""
#     MARKET_SENTINEL = "market_sentinel"
#     RISK_HEDGER = "risk_hedger"
#     LOGISTICS = "logistics"
#     COMPLIANCE = "compliance"
#     ADVERSARIAL = "adversarial"


# class ReasoningAction(str, Enum):
#     """Reasoning action types"""
#     DETECT = "detect"          # Detection    ANALYZE = "analyze"        # Analysis
#     VALIDATE = "validate"      # Validation
#     CHALLENGE = "challenge"    # Challenge
#     CALCULATE = "calculate"    # Calculation
#     SEARCH = "search"          # Search
#     RECOMMEND = "recommend"    # Recommendation


# class RAGSource(BaseModel):
#     """RAG knowledge source citation"""
#     document_id: str = Field(..., description=".")
#     title: str = Field(..., description="Document title")
#     section: Optional[str] = Field(None, description="Section reference")
#     content_snippet: Optional[str] = Field(None, description="")
#     relevance_score: float = Field(..., ge=0, le=1, description="Relevance score)
#     azure_service: str = Field(default="Azure AI Search", description="Retrieval service)


# class ReasoningStep(BaseModel):
#     """ㄧ"""
#     step_id: str = Field(..., description="ラ")
#     agent_id: AgentType = Field(..., description="цAgent")
#     timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp)
#     action: ReasoningAction = Field(..., description="Action type")
#     title: str = Field(..., description="ラ")
#     content: str = Field(..., description="Reasoning content")
#     confidence: float = Field(..., ge=0, le=1, description="?)
#     azure_service: str = Field(..., description="Called Azure service")
#     sources: List[RAGSource] = Field(default_factory=list, description="Knowledge sources")
#     duration_ms: int = Field(default=0, description="ц()")
#     metadata: Optional[dict] = Field(default=None, description="Extended metadata)


# class DebateExchange(BaseModel):
#     """╄"""
#     exchange_id: str = Field(..., description="╄ID")
#     challenger_agent: AgentType = Field(default=AgentType.ADVERSARIAL)
#     defender_agent: AgentType = Field(..., description="Agent")
#     timestamp: datetime = Field(default_factory=datetime.now)

#     challenge: str = Field(..., description="ㄧ")
#     challenge_reason: str = Field(..., description="ㄧ")

#     response: str = Field(..., description="")

#     resolution: str = Field(..., description="€В?)
#     resolution_accepted: bool = Field(default=True, description="ュe")

#     sources: List[RAGSource] = Field(default_factory=list, description="")


# class DecisionProvenance(BaseModel):
#     """"""
#     decision_id: str = Field(..., description="ID")
#     timestamp: datetime = Field(default_factory=datetime.now)

#     trigger_event: str = Field(..., description="﹀")
#     trigger_agent: AgentType = Field(..., description="﹀Agent")

#     reasoning_chain: List[ReasoningStep] = Field(..., description="ㄧ?)
#     debates: List[DebateExchange] = Field(default_factory=list, description="╄")

#     final_recommendation: str = Field(..., description="€?)
#     total_duration_ms: int = Field(default=0, description="€")
#     human_approval_required: bool = Field(default=True, description="€ュ?)


# class CoTEventType(str, Enum):
#     """CoT WebSocket"""
#     COT_STEP = "COT_STEP"
#     RAG_CITATION = "RAG_CITATION"
#     DEBATE_START = "DEBATE_START"
#     DEBATE_EXCHANGE = "DEBATE_EXCHANGE"
#     DEBATE_RESOLVE = "DEBATE_RESOLVE"
#     DECISION_READY = "DECISION_READY"


# class CoTEvent(BaseModel):
#     """CoT WebSocket"""
#     type: CoTEventType
#     timestamp: datetime = Field(default_factory=datetime.now)
#     agent_id: Optional[AgentType] = None
#     data: dict = Field(default_factory=dict)
