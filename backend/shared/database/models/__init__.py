import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator

from shared.database.database import Base

try:
    from pgvector.sqlalchemy import Vector
except ImportError:  # pragma: no cover - dependency is declared, fallback keeps imports robust
    Vector = None  # type: ignore[assignment]


class PgVector(TypeDecorator):
    """pgvector column on Postgres, text fallback for SQLite/local smoke tests."""

    impl = Text
    cache_ok = True

    def __init__(self, dim: int = 768) -> None:
        super().__init__()
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and Vector is not None:
            return dialect.type_descriptor(Vector(self.dim))
        return dialect.type_descriptor(Text())


class CustomerCategory(str, enum.Enum):
    """Customer category enum"""

    HIGH_VALUE = "high_value"  # high-value customer
    NORMAL = "normal"  # normalCustomer
    LOW_VALUE = "low_value"  # low-valueCustomer


class ConversationStatus(str, enum.Enum):
    """Conversation status enum"""

    ACTIVE = "active"  # active
    CLOSED = "closed"  #
    HANDOFF = "handoff"  #


class MessageSender(str, enum.Enum):
    """"""

    CUSTOMER = "customer"  # Customer
    AI = "ai"  # AI
    HUMAN = "human"  # Human agent


# ========== Maritime Compliance Enums ==========


class VesselType(str, enum.Enum):
    """Vessel type enumeration"""

    CONTAINER = "container"
    TANKER = "tanker"
    BULK_CARRIER = "bulk_carrier"
    RO_RO = "ro_ro"
    GENERAL_CARGO = "general_cargo"
    LNG_CARRIER = "lng_carrier"
    PASSENGER = "passenger"
    FISHING = "fishing"
    OFFSHORE = "offshore"
    OTHER = "other"


class DocumentType(str, enum.Enum):
    """User document type enumeration for maritime certificates"""

    SAFETY_CERTIFICATE = "safety_certificate"  # SOLAS Safety Certificates
    LOAD_LINE_CERTIFICATE = "load_line_certificate"  # Load Line Convention
    MARPOL_CERTIFICATE = "marpol_certificate"  # MARPOL compliance
    CREW_CERTIFICATE = "crew_certificate"  # STCW certificates
    ISM_CERTIFICATE = "ism_certificate"  # ISM Code (Safety Management)
    ISPS_CERTIFICATE = "isps_certificate"  # ISPS Code (Security)
    CLASS_CERTIFICATE = "class_certificate"  # Classification society certificate
    INSURANCE_CERTIFICATE = "insurance_certificate"  # P&I, Hull insurance
    CUSTOMS_DECLARATION = "customs_declaration"  # Customs documents
    HEALTH_CERTIFICATE = "health_certificate"  # Maritime health certificate
    TONNAGE_CERTIFICATE = "tonnage_certificate"  # International Tonnage Certificate
    REGISTRY_CERTIFICATE = "registry_certificate"  # Certificate of Registry
    CREW_LIST = "crew_list"  # Crew list document
    CARGO_MANIFEST = "cargo_manifest"  # Cargo manifest
    BALLAST_WATER_CERTIFICATE = "ballast_water_certificate"  # BWM Convention
    OTHER = "other"


class RegulationType(str, enum.Enum):
    """Maritime regulation type enumeration"""

    IMO_CONVENTION = "imo_convention"  # SOLAS, MARPOL, STCW, etc.
    PORT_STATE_CONTROL = "port_state_control"  # PSC regimes (Paris MOU, Tokyo MOU)
    PORT_SPECIFIC = "port_specific"  # Individual port rules
    REGIONAL = "regional"  # EU, US, regional requirements
    CUSTOMS = "customs"  # Customs regulations
    ENVIRONMENTAL = "environmental"  # ECA, ballast water, emissions
    SECURITY = "security"  # ISPS, security requirements
    FLAG_STATE = "flag_state"  # Flag state requirements


class ComplianceStatus(str, enum.Enum):
    """Compliance check status"""

    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    PARTIAL = "partial"
    PENDING_REVIEW = "pending_review"
    EXPIRED = "expired"


class PSCRegime(str, enum.Enum):
    """Port State Control regime enumeration"""

    PARIS_MOU = "paris_mou"  # Europe and North Atlantic
    TOKYO_MOU = "tokyo_mou"  # Asia-Pacific
    INDIAN_OCEAN_MOU = "indian_ocean_mou"
    MEDITERRANEAN_MOU = "mediterranean_mou"
    ABUJA_MOU = "abuja_mou"  # West and Central Africa
    BLACK_SEA_MOU = "black_sea_mou"
    CARIBBEAN_MOU = "caribbean_mou"
    RIYADH_MOU = "riyadh_mou"  # Gulf region
    VINA_DEL_MAR = "vina_del_mar"  # Latin America
    USCG = "uscg"  # US Coast Guard
    AMSA = "amsa"  # Australian Maritime Safety Authority


# ========== Data models ==========


class Customer(Base):
    """Customer"""

    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    auth_user_id = Column(String(100), unique=True, index=True, nullable=True)  # Supabase user UUID
    name = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    company = Column(String(200))
    phone = Column(String(50))
    language = Column(String(10), default="zh-cn")

    #
    category = Column(Enum(CustomerCategory), default=CustomerCategory.NORMAL)
    priority_score = Column(Integer, default=3)  # 1-5
    classification_reason = Column(Text)

    #
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    #
    conversations = relationship("Conversation", back_populates="customer")
    vessels = relationship("Vessel", back_populates="customer")
    user_documents = relationship("UserDocument", back_populates="customer")


class Conversation(Base):
    """"""

    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    status = Column(Enum(ConversationStatus), default=ConversationStatus.ACTIVE)
    summary = Column(Text)  #

    #
    message_count = Column(Integer, default=0)
    avg_confidence = Column(Float)  # Average confidence

    #
    started_at = Column(DateTime, default=datetime.now)
    ended_at = Column(DateTime)

    #
    customer = relationship("Customer", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")


class Message(Base):
    """"""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    content = Column(Text, nullable=False)
    sender = Column(Enum(MessageSender), nullable=False)
    language = Column(String(10))

    # AI
    ai_confidence = Column(Float)  # 0.00-1.00
    retrieved_docs = Column(Text)  # RAG retrieval(JSON)

    #
    created_at = Column(DateTime, default=datetime.now)

    #
    conversation = relationship("Conversation", back_populates="messages")


class HandoffStatus(str, enum.Enum):
    """"""

    PENDING = "pending"  #
    PROCESSING = "processing"  #
    COMPLETED = "completed"  #


class Handoff(Base):
    """"""

    __tablename__ = "handoffs"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    trigger_reason = Column(String(50))  # manual/low_confidence/customer_request
    agent_name = Column(String(100))  # Sales
    status = Column(Enum(HandoffStatus), default=HandoffStatus.PENDING)

    #
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class KBDocument(Base):
    """"""

    __tablename__ = "kb_documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200))
    content = Column(Text)
    doc_type = Column(String(50))  # manual/faq/product_spec
    product_tag = Column(String(100))  # M30/M400/Dock3
    source_file = Column(String(200))

    #
    created_at = Column(DateTime, default=datetime.now)


# ========== Maritime Compliance Models ==========


class Vessel(Base):
    """Vessel registration table"""

    __tablename__ = "vessels"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    name = Column(String(200), nullable=False)
    imo_number = Column(String(20), unique=True, index=True)  # IMO Ship ID
    mmsi = Column(String(20))  # Maritime Mobile Service Identity
    call_sign = Column(String(20))
    vessel_type = Column(Enum(VesselType))
    flag_state = Column(String(100))  # Flag country
    gross_tonnage = Column(Float)
    dwt = Column(Float)  # Deadweight tonnage
    year_built = Column(Integer)
    classification_society = Column(String(100))  # DNV, Lloyd's, etc.

    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    customer = relationship("Customer", back_populates="vessels")
    documents = relationship("UserDocument", back_populates="vessel")
    compliance_checks = relationship("ComplianceCheck", back_populates="vessel")
    routes = relationship("VesselRoute", back_populates="vessel")


class VesselRoute(Base):
    """Vessel route / voyage plan"""

    __tablename__ = "vessel_routes"

    id = Column(Integer, primary_key=True, index=True)
    vessel_id = Column(Integer, ForeignKey("vessels.id"), nullable=False)
    route_name = Column(String(300), nullable=False)
    port_codes = Column(Text, nullable=False)  # JSON array: ["CNSHA", "SGSIN", "NLRTM"]
    origin_port = Column(String(10))  # First port code
    destination_port = Column(String(10))  # Last port code
    departure_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=False, index=True)  # Only one active per vessel

    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    vessel = relationship("Vessel", back_populates="routes")


class Port(Base):
    """Port information table"""

    __tablename__ = "ports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    un_locode = Column(String(10), unique=True, index=True)  # UN/LOCODE
    country = Column(String(100), nullable=False)
    country_code = Column(String(3))  # ISO 3166-1 alpha-3
    region = Column(String(100))  # Asia, Europe, Americas, etc.
    latitude = Column(Float)
    longitude = Column(Float)

    # PSC regime
    psc_regime = Column(Enum(PSCRegime), nullable=True)

    # Port characteristics
    is_eca = Column(Boolean, default=False)  # Emission Control Area
    has_shore_power = Column(Boolean, default=False)
    max_draft = Column(Float)  # meters

    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    regulations = relationship("PortRegulation", back_populates="port")


class MaritimeRegulation(Base):
    """Maritime law/regulation knowledge base"""

    __tablename__ = "maritime_regulations"

    id = Column(Integer, primary_key=True, index=True)

    # Regulation identification
    title = Column(String(500), nullable=False)
    regulation_type = Column(Enum(RegulationType), nullable=False)
    source_convention = Column(String(200))  # e.g., "SOLAS", "MARPOL Annex VI"
    chapter = Column(String(100))
    regulation_number = Column(String(50))

    # Content
    summary = Column(Text)  # Short summary
    full_text = Column(Text)  # Full regulation text

    # Applicability (JSON arrays)
    applicable_vessel_types = Column(Text)  # JSON array of VesselType
    applicable_regions = Column(Text)  # JSON array
    applicable_flag_states = Column(Text)  # JSON array
    min_gross_tonnage = Column(Float)  # Minimum GT for applicability

    # Required documents (JSON array of DocumentType)
    required_documents = Column(Text)

    # Metadata
    effective_date = Column(DateTime)
    amendment_date = Column(DateTime)
    source_url = Column(String(500))

    # Vector document reference
    vector_doc_id = Column(String(100))

    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class PortRegulation(Base):
    """Port-specific regulations"""

    __tablename__ = "port_regulations"

    id = Column(Integer, primary_key=True, index=True)
    port_id = Column(Integer, ForeignKey("ports.id"))
    maritime_regulation_id = Column(Integer, ForeignKey("maritime_regulations.id"), nullable=True)

    # Port-specific requirements
    title = Column(String(500), nullable=False)
    description = Column(Text)
    required_documents = Column(Text)  # JSON array
    advance_notice_hours = Column(Integer)  # Hours before arrival

    # Applicability
    applicable_vessel_types = Column(Text)  # JSON array

    # Contact info
    authority_name = Column(String(200))
    authority_contact = Column(String(200))

    # Vector document reference
    vector_doc_id = Column(String(100))

    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    port = relationship("Port", back_populates="regulations")
    maritime_regulation = relationship("MaritimeRegulation")


class KnowledgeDocument(Base):
    """Maritime regulation/search chunk stored in Postgres + pgvector."""

    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, index=True)
    collection_name = Column(String(80), index=True, nullable=False)
    content = Column(Text, nullable=False)
    metadata_json = Column(Text, default="{}")
    content_hash = Column(String(64), unique=True, index=True, nullable=True)
    embedding = Column(PgVector(768), nullable=True)
    embedding_model = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class UserDocument(Base):
    """Uploaded document text and metadata stored in Postgres + pgvector."""

    __tablename__ = "user_documents"

    id = Column(String(64), primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), index=True, nullable=False)
    vessel_id = Column(Integer, ForeignKey("vessels.id"), index=True, nullable=True)
    title = Column(String(300), nullable=False)
    document_type = Column(String(80), index=True, nullable=False)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(120), nullable=True)
    extracted_text = Column(Text, default="")
    ocr_provider = Column(String(80), nullable=True)
    ocr_confidence = Column(Float, nullable=True)
    issuing_authority = Column(String(255), nullable=True)
    issue_date = Column(String(64), nullable=True)
    expiry_date = Column(String(64), nullable=True)
    document_number = Column(String(120), nullable=True)
    is_validated = Column(Boolean, default=False)
    validation_notes = Column(Text, default="")
    extracted_fields_json = Column(Text, default="{}")
    embedding = Column(PgVector(768), nullable=True)
    embedding_model = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.now, index=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    customer = relationship("Customer", back_populates="user_documents")
    vessel = relationship("Vessel", back_populates="documents")


class ComplianceCheck(Base):
    """Route compliance check records"""

    __tablename__ = "compliance_checks"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    vessel_id = Column(Integer, ForeignKey("vessels.id"))

    # Route info
    route_name = Column(String(300))
    route_ports = Column(Text)  # JSON array of port codes

    # Results
    overall_status = Column(Enum(ComplianceStatus))
    compliance_score = Column(Float)  # 0-100

    # Detailed results (JSON)
    port_results = Column(Text)  # Per-port compliance details
    missing_documents = Column(Text)  # JSON array
    recommendations = Column(Text)  # JSON array

    # Natural language report
    summary_report = Column(Text)
    detailed_report = Column(Text)

    # CrewAI metadata
    crew_run_id = Column(String(100))
    agent_outputs = Column(Text)  # Raw agent outputs (JSON)

    # Timestamps
    created_at = Column(DateTime, default=datetime.now)

    # Relationships
    customer = relationship("Customer")
    vessel = relationship("Vessel", back_populates="compliance_checks")


# ========== LLM cost ledger ==========


class LLMCall(Base):
    """Per-call ledger of LLM invocations for cost + latency observability.

    Every LLM call (chat, embedding, vision, OCR, agent) should record one
    row here so the ops dashboard can answer:
      - Which surface burns the most tokens? (group by ``surface``)
      - Which model has the worst p95 latency? (``latency_ms``)
      - Which tenant is generating the bill? (``customer_id``)
      - Did this call succeed? (``status`` + ``error_code``)

    The table is intentionally lightweight: we do not store prompts here
    (PII surface). For prompt audit we point ``trace_id`` at the request
    trace in OTel/Sentry.
    """

    __tablename__ = "llm_calls"

    id = Column(Integer, primary_key=True, index=True)

    # Tenancy + correlation
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    trace_id = Column(String(64), index=True, nullable=True)
    surface = Column(String(64), index=True, nullable=False)  # e.g. "compliance", "hedge", "ocr"

    # Provider + model
    provider = Column(String(32), nullable=False)  # openai | google | anthropic | local | ollama
    model = Column(String(128), nullable=False)
    operation = Column(String(32), nullable=False)  # chat | embedding | vision | rerank

    # Tokens + cost
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)

    # Outcome
    status = Column(String(16), default="ok")  # ok | error | timeout | rate_limited
    error_code = Column(String(64), nullable=True)
    latency_ms = Column(Integer, default=0)

    # Timestamp
    created_at = Column(DateTime, default=datetime.now, index=True)
