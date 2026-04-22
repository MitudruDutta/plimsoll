"""
Pydantic models for compliance reports.

These are data transfer objects used by the compliance report generator
to structure compliance check results.
"""
from datetime import datetime, date
from enum import Enum
from typing import List, Dict, Any, Optional
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
    imo_number: Optional[str] = None
    vessel_type: str = "cargo_ship"
    flag_state: str = "Unknown"
    gross_tonnage: Optional[float] = None
    year_built: Optional[int] = None
    classification_society: Optional[str] = None


class CertificateInfo(BaseModel):
    """Certificate/document information"""
    certificate_name: str
    certificate_type: str
    issuing_authority: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    status: DocumentStatus = DocumentStatus.VALID
    document_number: Optional[str] = None


class DocumentCheckResult(BaseModel):
    """Result of checking a single document"""
    document_type: str
    status: DocumentStatus
    expiry_date: Optional[date] = None
    days_until_expiry: Optional[int] = None
    regulation_source: Optional[str] = None
    action_required: Optional[str] = None
    priority: Priority = Priority.LOW
    ports_requiring: Optional[List[str]] = None


class DocumentGapAnalysis(BaseModel):
    """Analysis of document gaps and compliance"""
    total_required: int
    total_available: int
    compliance_percentage: float
    valid_documents: List[DocumentCheckResult] = Field(default_factory=list)
    expiring_soon: List[DocumentCheckResult] = Field(default_factory=list)
    expired_documents: List[DocumentCheckResult] = Field(default_factory=list)
    missing_documents: List[DocumentCheckResult] = Field(default_factory=list)


class RegulationRequirement(BaseModel):
    """A specific regulation requirement"""
    requirement_id: str
    regulation: str
    title: str
    description: str
    requirement_type: str = "MANDATORY"
    applicability: Optional[str] = None
    documents_required: List[str] = Field(default_factory=list)
    deadline: Optional[str] = None
    source_url: Optional[str] = None


class PortRequirement(BaseModel):
    """Port-specific requirements"""
    port_code: str
    port_name: str
    country: str
    psc_regime: str
    advance_notice_hours: int = 24
    pre_arrival_documents: List[str] = Field(default_factory=list)
    eca_zone: bool = False
    sulphur_limit: Optional[float] = None
    scrubber_allowed: bool = True
    special_requirements: List[str] = Field(default_factory=list)


class RouteComplianceCheck(BaseModel):
    """Compliance check for an entire route"""
    route: List[str]
    port_requirements: Dict[str, PortRequirement] = Field(default_factory=dict)
    common_requirements: List[RegulationRequirement] = Field(default_factory=list)
    eca_ports: List[str] = Field(default_factory=list)
    eu_ports: List[str] = Field(default_factory=list)


class ActionItem(BaseModel):
    """A required action for compliance"""
    action_id: str
    priority: Priority
    category: str
    action: str
    reason: str
    regulation_reference: Optional[str] = None
    deadline: Optional[str] = None
    responsible_party: Optional[str] = None
    ports_affected: List[str] = Field(default_factory=list)
    estimated_cost: Optional[str] = None
    estimated_time: Optional[str] = None


class RiskAssessment(BaseModel):
    """Assessment of a compliance risk"""
    risk_area: str
    risk_level: RiskLevel
    probability: str
    impact: str
    mitigation: str
    affected_ports: List[str] = Field(default_factory=list)
    financial_exposure: Optional[str] = None


class ComplianceReportSummary(BaseModel):
    """Executive summary of compliance report"""
    overall_status: ComplianceStatus
    compliance_score: int  # 0-100
    risk_level: RiskLevel
    key_findings: List[str] = Field(default_factory=list)
    immediate_actions: List[str] = Field(default_factory=list)
    valid_certificates: int = 0
    expiring_certificates: int = 0
    missing_certificates: int = 0
    estimated_time_to_compliance: Optional[str] = None


class ComplianceReport(BaseModel):
    """Full compliance report"""
    report_id: str
    generated_at: datetime
    valid_until: datetime
    vessel_info: VesselInfo
    route_ports: List[str]
    voyage_start_date: Optional[date] = None
    
    # Summary
    summary: ComplianceReportSummary
    
    # Document analysis
    document_analysis: DocumentGapAnalysis
    
    # Route compliance
    route_compliance: RouteComplianceCheck
    
    # Requirements
    imo_requirements: List[RegulationRequirement] = Field(default_factory=list)
    regional_requirements: List[RegulationRequirement] = Field(default_factory=list)
    port_specific_requirements: Dict[str, List[RegulationRequirement]] = Field(default_factory=dict)
    
    # Risk assessment
    risk_assessments: List[RiskAssessment] = Field(default_factory=list)
    detention_risk: RiskLevel = RiskLevel.LOW
    
    # Action items by priority
    critical_actions: List[ActionItem] = Field(default_factory=list)
    high_priority_actions: List[ActionItem] = Field(default_factory=list)
    medium_priority_actions: List[ActionItem] = Field(default_factory=list)
    low_priority_actions: List[ActionItem] = Field(default_factory=list)
    
    # Timeline
    compliance_timeline: List[Dict[str, Any]] = Field(default_factory=list)


# ========== Query Response Models ==========

class RegulationQueryResponse(BaseModel):
    """Response for regulation queries"""
    query: str
    regulations: List[RegulationRequirement] = Field(default_factory=list)
    summary: Optional[str] = None
    sources: List[str] = Field(default_factory=list)


class PortQueryResponse(BaseModel):
    """Response for port-specific queries"""
    port_code: str
    port_name: str
    requirements: List[PortRequirement] = Field(default_factory=list)
    regulations: List[RegulationRequirement] = Field(default_factory=list)
    summary: Optional[str] = None


class QuickComplianceCheck(BaseModel):
    """Quick compliance status check"""
    vessel_name: str
    route: List[str]
    overall_status: ComplianceStatus
    risk_level: RiskLevel
    critical_issues: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)

