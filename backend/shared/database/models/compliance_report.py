"""
Pydantic models for compliance reports.

These are data transfer objects used by the compliance report generator
to structure compliance check results.
"""

from datetime import date, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

# ========== Enums ==========


class ComplianceStatus(str, Enum):
    """Overall compliance status"""

    COMPLIANT = "compliant"
    PARTIAL = "partial"
    NON_COMPLIANT = "non_compliant"


class Priority(str, Enum):
    """Action item priority levels"""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RiskLevel(str, Enum):
    """Risk assessment levels"""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class DocumentStatus(str, Enum):
    """Document validity status"""

    VALID = "valid"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED = "expired"
    MISSING = "missing"
    PENDING_VERIFICATION = "pending_verification"


# ========== Data Models ==========


class VesselInfo(BaseModel):
    """Vessel information for compliance reports"""

    vessel_name: str
    imo_number: str | None = None
    vessel_type: str = "cargo_ship"
    flag_state: str = "Unknown"
    gross_tonnage: float | None = None
    year_built: int | None = None
    classification_society: str | None = None


class CertificateInfo(BaseModel):
    """Certificate/document information"""

    certificate_name: str
    certificate_type: str
    issuing_authority: str | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    status: DocumentStatus = DocumentStatus.VALID
    document_number: str | None = None


class DocumentCheckResult(BaseModel):
    """Result of checking a single document"""

    document_type: str
    status: DocumentStatus
    expiry_date: date | None = None
    days_until_expiry: int | None = None
    regulation_source: str | None = None
    action_required: str | None = None
    priority: Priority = Priority.LOW
    ports_requiring: list[str] | None = None


class DocumentGapAnalysis(BaseModel):
    """Analysis of document gaps and compliance"""

    total_required: int
    total_available: int
    compliance_percentage: float
    valid_documents: list[DocumentCheckResult] = Field(default_factory=list)
    expiring_soon: list[DocumentCheckResult] = Field(default_factory=list)
    expired_documents: list[DocumentCheckResult] = Field(default_factory=list)
    missing_documents: list[DocumentCheckResult] = Field(default_factory=list)


class RegulationRequirement(BaseModel):
    """A specific regulation requirement"""

    requirement_id: str
    regulation: str
    title: str
    description: str
    requirement_type: str = "MANDATORY"
    applicability: str | None = None
    documents_required: list[str] = Field(default_factory=list)
    deadline: str | None = None
    source_url: str | None = None


class PortRequirement(BaseModel):
    """Port-specific requirements"""

    port_code: str
    port_name: str
    country: str
    psc_regime: str
    advance_notice_hours: int = 24
    pre_arrival_documents: list[str] = Field(default_factory=list)
    eca_zone: bool = False
    sulphur_limit: float | None = None
    scrubber_allowed: bool = True
    special_requirements: list[str] = Field(default_factory=list)


class RouteComplianceCheck(BaseModel):
    """Compliance check for an entire route"""

    route: list[str]
    port_requirements: dict[str, PortRequirement] = Field(default_factory=dict)
    common_requirements: list[RegulationRequirement] = Field(default_factory=list)
    eca_ports: list[str] = Field(default_factory=list)
    eu_ports: list[str] = Field(default_factory=list)


class ActionItem(BaseModel):
    """A required action for compliance"""

    action_id: str
    priority: Priority
    category: str
    action: str
    reason: str
    regulation_reference: str | None = None
    deadline: str | None = None
    responsible_party: str | None = None
    ports_affected: list[str] = Field(default_factory=list)
    estimated_cost: str | None = None
    estimated_time: str | None = None


class RiskAssessment(BaseModel):
    """Assessment of a compliance risk"""

    risk_area: str
    risk_level: RiskLevel
    probability: str
    impact: str
    mitigation: str
    affected_ports: list[str] = Field(default_factory=list)
    financial_exposure: str | None = None


class ComplianceReportSummary(BaseModel):
    """Executive summary of compliance report"""

    overall_status: ComplianceStatus
    compliance_score: int  # 0-100
    risk_level: RiskLevel
    key_findings: list[str] = Field(default_factory=list)
    immediate_actions: list[str] = Field(default_factory=list)
    valid_certificates: int = 0
    expiring_certificates: int = 0
    missing_certificates: int = 0
    estimated_time_to_compliance: str | None = None


class ComplianceReport(BaseModel):
    """Full compliance report"""

    report_id: str
    generated_at: datetime
    valid_until: datetime
    vessel_info: VesselInfo
    route_ports: list[str]
    voyage_start_date: date | None = None

    # Summary
    summary: ComplianceReportSummary

    # Document analysis
    document_analysis: DocumentGapAnalysis

    # Route compliance
    route_compliance: RouteComplianceCheck

    # Requirements
    imo_requirements: list[RegulationRequirement] = Field(default_factory=list)
    regional_requirements: list[RegulationRequirement] = Field(default_factory=list)
    port_specific_requirements: dict[str, list[RegulationRequirement]] = Field(default_factory=dict)

    # Risk assessment
    risk_assessments: list[RiskAssessment] = Field(default_factory=list)
    detention_risk: RiskLevel = RiskLevel.LOW

    # Action items by priority
    critical_actions: list[ActionItem] = Field(default_factory=list)
    high_priority_actions: list[ActionItem] = Field(default_factory=list)
    medium_priority_actions: list[ActionItem] = Field(default_factory=list)
    low_priority_actions: list[ActionItem] = Field(default_factory=list)

    # Timeline
    compliance_timeline: list[dict[str, Any]] = Field(default_factory=list)


# ========== Query Response Models ==========


class RegulationQueryResponse(BaseModel):
    """Response for regulation queries"""

    query: str
    regulations: list[RegulationRequirement] = Field(default_factory=list)
    summary: str | None = None
    sources: list[str] = Field(default_factory=list)


class PortQueryResponse(BaseModel):
    """Response for port-specific queries"""

    port_code: str
    port_name: str
    requirements: list[PortRequirement] = Field(default_factory=list)
    regulations: list[RegulationRequirement] = Field(default_factory=list)
    summary: str | None = None


class QuickComplianceCheck(BaseModel):
    """Quick compliance status check"""

    vessel_name: str
    route: list[str]
    overall_status: ComplianceStatus
    risk_level: RiskLevel
    critical_issues: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
