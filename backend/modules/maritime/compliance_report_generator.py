"""
Compliance Report Generator Service

Generates structured, business-friendly compliance reports from
knowledge base queries and document analysis.
"""
import logging
import uuid
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional

from models.compliance_report import (
    ComplianceReport,
    ComplianceReportSummary,
    ComplianceStatus,
    Priority,
    RiskLevel,
    DocumentStatus,
    VesselInfo,
    DocumentCheckResult,
    DocumentGapAnalysis,
    RegulationRequirement,
    PortRequirement,
    RouteComplianceCheck,
    ActionItem,
    RiskAssessment,
    CertificateInfo,
    RegulationQueryResponse,
    PortQueryResponse,
    QuickComplianceCheck,
)
from modules.maritime.maritime_knowledge_base import get_maritime_knowledge_base, SearchResult

logger = logging.getLogger(__name__)


class ComplianceReportGenerator:
    """
    Generates structured compliance reports from knowledge base queries.

    This service takes raw search results and transforms them into
    clear, actionable reports for business users.
    """

    # Standard certificates required for most vessels
    STANDARD_CERTIFICATES = {
        "cargo_ship": [
            ("Certificate of Registry", "Flag State", "Indefinite"),
            ("International Tonnage Certificate (1969)", "Tonnage Convention", "Indefinite"),
            ("International Load Line Certificate", "Load Line Convention", "5 years"),
            ("Cargo Ship Safety Construction Certificate", "SOLAS", "5 years"),
            ("Cargo Ship Safety Equipment Certificate", "SOLAS", "5 years"),
            ("Cargo Ship Safety Radio Certificate", "SOLAS", "5 years"),
            ("Document of Compliance (DOC)", "ISM Code", "5 years"),
            ("Safety Management Certificate (SMC)", "ISM Code", "5 years"),
            ("International Ship Security Certificate (ISSC)", "ISPS Code", "5 years"),
            ("International Oil Pollution Prevention Certificate (IOPP)", "MARPOL Annex I", "5 years"),
            ("International Air Pollution Prevention Certificate (IAPP)", "MARPOL Annex VI", "5 years"),
            ("International Sewage Pollution Prevention Certificate (ISPP)", "MARPOL Annex IV", "5 years"),
            ("International Energy Efficiency Certificate (IEE)", "MARPOL Annex VI", "Indefinite"),
            ("International Ballast Water Management Certificate", "BWM Convention", "5 years"),
            ("Maritime Labour Certificate", "MLC 2006", "5 years"),
            ("Minimum Safe Manning Document", "SOLAS", "Indefinite"),
            ("Continuous Synopsis Record (CSR)", "SOLAS XI-1", "Continuous"),
        ],
        "tanker": [
            # All cargo ship certificates plus:
            ("International Oil Pollution Prevention Certificate (IOPP)", "MARPOL Annex I", "5 years"),
            ("Certificate of Fitness for Carriage of Dangerous Chemicals", "IBC Code", "5 years"),
            ("International Certificate of Fitness for Carriage of Liquefied Gases", "IGC Code", "5 years"),
        ],
        "passenger": [
            ("Passenger Ship Safety Certificate", "SOLAS", "12 months"),
            # Plus most cargo ship certificates
        ]
    }

    # ECA ports and requirements
    ECA_ZONES = {
        "Baltic Sea": {"sulphur_limit": 0.10, "ports": ["FIHEL", "SEGOT", "DKCPH", "PLGDN", "EETAL", "RULED"]},
        "North Sea": {"sulphur_limit": 0.10, "ports": ["NLRTM", "DEHAM", "BEANR", "GBFXT", "GBSOU"]},
        "North American": {"sulphur_limit": 0.10, "ports": ["USLAX", "USNYC", "USHOU", "CAHAL", "CAVAN"]},
        "US Caribbean": {"sulphur_limit": 0.10, "ports": ["USSJN", "VICHA"]},
        "Mediterranean": {"sulphur_limit": 0.10, "effective_date": "2025-05-01", "ports": ["ITGOA", "ESBCN", "FRMAR", "GRPIR"]},
    }

    # EU ports for MRV/ETS
    EU_PORTS = ["NLRTM", "DEHAM", "BEANR", "FRMAR", "ESBCN", "ITGOA", "GRPIR", "PLGDN", "SEGOT", "FIHEL"]

    def __init__(self):
        self.kb = get_maritime_knowledge_base()

    def generate_compliance_report(
        self,
        vessel_info: Dict[str, Any],
        route_ports: List[str],
        user_documents: List[Dict[str, Any]] = None,
        voyage_start_date: Optional[date] = None
    ) -> ComplianceReport:
        """
        Generate a comprehensive compliance report for a vessel and route.

        Args:
            vessel_info: Dict with vessel_name, imo_number, vessel_type, flag_state, gross_tonnage
            route_ports: List of port codes in route order
            user_documents: Optional list of user's current documents with expiry dates
            voyage_start_date: Optional planned voyage start date

        Returns:
            ComplianceReport with all findings and recommendations
        """
        report_id = f"CR-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        # Build vessel info model
        vessel = VesselInfo(
            vessel_name=vessel_info.get("vessel_name", "Unknown Vessel"),
            imo_number=vessel_info.get("imo_number"),
            vessel_type=vessel_info.get("vessel_type", "cargo_ship"),
            flag_state=vessel_info.get("flag_state", "Unknown"),
            gross_tonnage=vessel_info.get("gross_tonnage"),
            year_built=vessel_info.get("year_built"),
            classification_society=vessel_info.get("classification_society"),
        )

        # Analyze documents
        document_analysis = self._analyze_documents(vessel.vessel_type, user_documents or [])

        # Check route compliance
        route_compliance = self._check_route_compliance(route_ports, vessel_info)

        # Get IMO requirements
        imo_requirements = self._get_imo_requirements(vessel_info)

        # Get regional requirements
        regional_requirements = self._get_regional_requirements(route_ports, vessel_info)

        # Get port-specific requirements
        port_specific = self._get_port_specific_requirements(route_ports, vessel_info)

        # Assess risks
        risk_assessments = self._assess_risks(
            document_analysis, route_compliance, vessel_info, route_ports
        )

        # Generate action items
        all_actions = self._generate_action_items(
            document_analysis, route_compliance, risk_assessments, route_ports
        )

        # Categorize actions by priority
        critical_actions = [a for a in all_actions if a.priority == Priority.CRITICAL]
        high_actions = [a for a in all_actions if a.priority == Priority.HIGH]
        medium_actions = [a for a in all_actions if a.priority == Priority.MEDIUM]
        low_actions = [a for a in all_actions if a.priority == Priority.LOW]

        # Generate summary
        summary = self._generate_summary(
            document_analysis, risk_assessments, all_actions
        )

        # Calculate detention risk
        detention_risk = self._calculate_detention_risk(document_analysis, risk_assessments)

        # Generate compliance timeline
        timeline = self._generate_timeline(all_actions, voyage_start_date)

        return ComplianceReport(
            report_id=report_id,
            generated_at=datetime.now(),
            valid_until=datetime.now() + timedelta(days=30),
            vessel_info=vessel,
            route_ports=route_ports,
            voyage_start_date=voyage_start_date,
            summary=summary,
            document_analysis=document_analysis,
            route_compliance=route_compliance,
            imo_requirements=imo_requirements,
            regional_requirements=regional_requirements,
            port_specific_requirements=port_specific,
            risk_assessments=risk_assessments,
            detention_risk=detention_risk,
            critical_actions=critical_actions,
            high_priority_actions=high_actions,
            medium_priority_actions=medium_actions,
            low_priority_actions=low_actions,
            compliance_timeline=timeline,
        )

    def _analyze_documents(
        self,
        vessel_type: str,
        user_documents: List[Dict[str, Any]]
    ) -> DocumentGapAnalysis:
        """Analyze user documents against requirements."""
        # Get required certificates for vessel type
        required_certs = self.STANDARD_CERTIFICATES.get(
            vessel_type, self.STANDARD_CERTIFICATES["cargo_ship"]
        )

        # Build lookup of user documents
        user_doc_lookup = {}
        for doc in user_documents:
            doc_type = doc.get("document_type", "").lower()
            user_doc_lookup[doc_type] = doc

        valid_docs = []
        expiring_soon = []
        expired_docs = []
        missing_docs = []

        today = date.today()

        for cert_name, regulation, validity in required_certs:
            cert_key = cert_name.lower()

            # Check if user has this document
            user_doc = None
            for key, doc in user_doc_lookup.items():
                if cert_key in key or key in cert_key:
                    user_doc = doc
                    break

            if user_doc:
                expiry_str = user_doc.get("expiry_date")
                if expiry_str:
                    try:
                        if isinstance(expiry_str, date):
                            expiry_date = expiry_str
                        else:
                            expiry_date = datetime.strptime(expiry_str, "%Y-%m-%d").date()

                        days_until = (expiry_date - today).days

                        if days_until < 0:
                            # Expired
                            expired_docs.append(DocumentCheckResult(
                                document_type=cert_name,
                                status=DocumentStatus.EXPIRED,
                                expiry_date=expiry_date,
                                days_until_expiry=days_until,
                                regulation_source=regulation,
                                action_required=f"Renew immediately - expired {abs(days_until)} days ago",
                                priority=Priority.CRITICAL,
                            ))
                        elif days_until <= 30:
                            # Expiring soon
                            expiring_soon.append(DocumentCheckResult(
                                document_type=cert_name,
                                status=DocumentStatus.EXPIRING_SOON,
                                expiry_date=expiry_date,
                                days_until_expiry=days_until,
                                regulation_source=regulation,
                                action_required=f"Schedule renewal - expires in {days_until} days",
                                priority=Priority.HIGH if days_until <= 14 else Priority.MEDIUM,
                            ))
                        else:
                            # Valid
                            valid_docs.append(DocumentCheckResult(
                                document_type=cert_name,
                                status=DocumentStatus.VALID,
                                expiry_date=expiry_date,
                                days_until_expiry=days_until,
                                regulation_source=regulation,
                                priority=Priority.LOW,
                            ))
                    except (ValueError, TypeError):
                        valid_docs.append(DocumentCheckResult(
                            document_type=cert_name,
                            status=DocumentStatus.VALID,
                            regulation_source=regulation,
                            priority=Priority.LOW,
                        ))
                else:
                    # No expiry date provided, assume valid
                    valid_docs.append(DocumentCheckResult(
                        document_type=cert_name,
                        status=DocumentStatus.VALID,
                        regulation_source=regulation,
                        priority=Priority.LOW,
                    ))
            else:
                # Missing
                missing_docs.append(DocumentCheckResult(
                    document_type=cert_name,
                    status=DocumentStatus.MISSING,
                    regulation_source=regulation,
                    action_required=f"Obtain {cert_name} as required by {regulation}",
                    priority=Priority.CRITICAL if "Safety" in cert_name or "ISM" in cert_name else Priority.HIGH,
                ))

        total_required = len(required_certs)
        total_available = len(valid_docs) + len(expiring_soon)
        compliance_pct = (total_available / total_required * 100) if total_required > 0 else 0

        return DocumentGapAnalysis(
            total_required=total_required,
            total_available=total_available,
            compliance_percentage=round(compliance_pct, 1),
            valid_documents=valid_docs,
            expiring_soon=expiring_soon,
            expired_documents=expired_docs,
            missing_documents=missing_docs,
        )

    def _check_route_compliance(
        self,
        route_ports: List[str],
        vessel_info: Dict[str, Any]
    ) -> RouteComplianceCheck:
        """Check compliance requirements for the entire route."""
        port_requirements = {}
        eca_ports = []
        eu_ports = []

        for port_code in route_ports:
            # Determine if port is in ECA
            in_eca = False
            eca_name = None
            sulphur_limit = 0.50  # Global limit

            for eca, info in self.ECA_ZONES.items():
                if port_code in info.get("ports", []):
                    in_eca = True
                    eca_name = eca
                    sulphur_limit = info.get("sulphur_limit", 0.10)
                    eca_ports.append(port_code)
                    break

            # Check if EU port
            if port_code in self.EU_PORTS:
                eu_ports.append(port_code)

            # Determine PSC regime
            psc_regime = self._get_psc_regime(port_code)

            port_requirements[port_code] = PortRequirement(
                port_code=port_code,
                port_name=self._get_port_name(port_code),
                country=self._get_port_country(port_code),
                psc_regime=psc_regime,
                advance_notice_hours=self._get_advance_notice(port_code),
                pre_arrival_documents=self._get_pre_arrival_docs(port_code),
                eca_zone=in_eca,
                sulphur_limit=sulphur_limit if in_eca else None,
                scrubber_allowed=self._check_scrubber_allowed(port_code),
                special_requirements=self._get_special_requirements(port_code),
            )

        # Get common requirements for the route
        common_requirements = self._get_common_route_requirements(route_ports, vessel_info)

        return RouteComplianceCheck(
            route=route_ports,
            port_requirements=port_requirements,
            common_requirements=common_requirements,
            eca_ports=list(set(eca_ports)),
            eu_ports=list(set(eu_ports)),
        )

    def _get_imo_requirements(self, vessel_info: Dict[str, Any]) -> List[RegulationRequirement]:
        """Get applicable IMO requirements."""
        requirements = []

        # Search knowledge base for IMO requirements
        try:
            results = self.kb.search_general(
                f"IMO requirements {vessel_info.get('vessel_type', 'cargo')} vessel certificates",
                collections=["imo_conventions"],
                top_k=10
            )

            for i, result in enumerate(results):
                requirements.append(RegulationRequirement(
                    requirement_id=f"IMO-{i+1:03d}",
                    regulation=result.metadata.get("convention", "IMO"),
                    title=result.metadata.get("chapter_title", "IMO Requirement"),
                    description=result.content[:500],
                    requirement_type="MANDATORY",
                    applicability=result.metadata.get("applicability", "All ships"),
                    documents_required=self._extract_documents_from_text(result.content),
                ))
        except Exception as e:
            logger.warning(f"Error fetching IMO requirements: {e}")

        return requirements

    def _get_regional_requirements(
        self,
        route_ports: List[str],
        vessel_info: Dict[str, Any]
    ) -> List[RegulationRequirement]:
        """Get regional requirements (EU MRV, ECA, etc.)."""
        requirements = []

        # Check for EU ports
        has_eu_ports = any(p in self.EU_PORTS for p in route_ports)

        if has_eu_ports:
            requirements.append(RegulationRequirement(
                requirement_id="EU-MRV-001",
                regulation="EU Regulation 2015/757 (as amended)",
                title="EU MRV Monitoring, Reporting and Verification",
                description="Ships ≥5000 GT calling at EU/EEA ports must monitor and report CO2, CH4, and N2O emissions. Requires verified Monitoring Plan and annual Emissions Report.",
                requirement_type="MANDATORY",
                applicability="Ships ≥5000 GT calling at EU/EEA ports",
                documents_required=["EU MRV Monitoring Plan", "EU MRV Document of Compliance", "Annual Emissions Report"],
                deadline="Report by 31 March each year",
            ))

            requirements.append(RegulationRequirement(
                requirement_id="EU-ETS-001",
                regulation="EU Directive 2023/959",
                title="EU Emissions Trading System (Maritime)",
                description="From 2024, ships must surrender EU ETS allowances for verified emissions. Phase-in: 40% (2024), 70% (2025), 100% (2026+).",
                requirement_type="MANDATORY",
                applicability="Ships ≥5000 GT on EU voyages",
                documents_required=["EU ETS Account Registration", "Verified Emissions Report"],
                deadline="Surrender allowances by 30 September each year",
            ))

        # Check for ECA zones
        has_eca_ports = any(
            port in zone.get("ports", [])
            for zone in self.ECA_ZONES.values()
            for port in route_ports
        )

        if has_eca_ports:
            requirements.append(RegulationRequirement(
                requirement_id="ECA-001",
                regulation="MARPOL Annex VI Reg 14",
                title="Emission Control Area Fuel Requirements",
                description="Ships in ECAs must use fuel with max 0.10% sulphur content, or use equivalent compliance methods (scrubbers, LNG).",
                requirement_type="MANDATORY",
                applicability="All ships in designated ECAs",
                documents_required=["Bunker Delivery Notes", "Fuel Changeover Procedure", "EGCS Documentation (if fitted)"],
            ))

        return requirements

    def _get_port_specific_requirements(
        self,
        route_ports: List[str],
        vessel_info: Dict[str, Any]
    ) -> Dict[str, List[RegulationRequirement]]:
        """Get port-specific requirements."""
        port_reqs = {}

        for port_code in route_ports:
            reqs = []

            # Search knowledge base for port-specific requirements
            try:
                results = self.kb.search_general(
                    f"Port {port_code} requirements regulations",
                    collections=["port_regulations", "customs_documentation"],
                    top_k=5
                )

                for i, result in enumerate(results):
                    reqs.append(RegulationRequirement(
                        requirement_id=f"{port_code}-{i+1:03d}",
                        regulation=result.metadata.get("source", "Port Authority"),
                        title=f"Port Requirement: {result.metadata.get('requirement_name', 'Local Requirement')}",
                        description=result.content[:300],
                        requirement_type=result.metadata.get("requirement_type", "MANDATORY"),
                        applicability=vessel_info.get("vessel_type", "All vessels"),
                    ))
            except Exception as e:
                logger.warning(f"Error fetching port requirements for {port_code}: {e}")

            port_reqs[port_code] = reqs

        return port_reqs

    def _assess_risks(
        self,
        doc_analysis: DocumentGapAnalysis,
        route_compliance: RouteComplianceCheck,
        vessel_info: Dict[str, Any],
        route_ports: List[str]
    ) -> List[RiskAssessment]:
        """Assess compliance risks."""
        risks = []

        # Document-related risks
        if doc_analysis.expired_documents:
            risks.append(RiskAssessment(
                risk_area="PSC Detention - Expired Certificates",
                risk_level=RiskLevel.CRITICAL,
                probability="High",
                impact=f"Ship may be detained at port. {len(doc_analysis.expired_documents)} expired certificate(s) found.",
                mitigation="Renew all expired certificates before departure.",
                affected_ports=route_ports,
            ))

        if doc_analysis.missing_documents:
            missing_count = len(doc_analysis.missing_documents)
            risks.append(RiskAssessment(
                risk_area="PSC Detention - Missing Documents",
                risk_level=RiskLevel.HIGH if missing_count > 3 else RiskLevel.MEDIUM,
                probability="High" if missing_count > 3 else "Medium",
                impact=f"{missing_count} required document(s) not on file. May result in detention or delays.",
                mitigation="Obtain all missing documents before voyage.",
                affected_ports=route_ports,
            ))

        if doc_analysis.expiring_soon:
            risks.append(RiskAssessment(
                risk_area="Certificate Validity During Voyage",
                risk_level=RiskLevel.MEDIUM,
                probability="Medium",
                impact=f"{len(doc_analysis.expiring_soon)} certificate(s) may expire during voyage.",
                mitigation="Schedule renewals or ensure surveys completed before relevant port calls.",
                affected_ports=route_ports,
            ))

        # ECA compliance risks
        if route_compliance.eca_ports:
            risks.append(RiskAssessment(
                risk_area="ECA Non-Compliance",
                risk_level=RiskLevel.HIGH,
                probability="High if not compliant",
                impact="Fines of €10,000-100,000+ for sulphur violations. Possible detention.",
                mitigation="Ensure compliant fuel or operational EGCS for ECA transits.",
                affected_ports=route_compliance.eca_ports,
            ))

        # EU ETS risks
        if route_compliance.eu_ports:
            risks.append(RiskAssessment(
                risk_area="EU ETS Non-Compliance",
                risk_level=RiskLevel.MEDIUM,
                probability="Medium",
                impact="Penalty of €100/tonne CO2 for missing allowances. Potential denial of entry after 2 years.",
                mitigation="Ensure EU ETS account is active and sufficient allowances are available.",
                affected_ports=route_compliance.eu_ports,
            ))

        return risks

    def _generate_action_items(
        self,
        doc_analysis: DocumentGapAnalysis,
        route_compliance: RouteComplianceCheck,
        risk_assessments: List[RiskAssessment],
        route_ports: List[str]
    ) -> List[ActionItem]:
        """Generate prioritized action items."""
        actions = []
        action_id = 1

        # Actions for expired documents
        for doc in doc_analysis.expired_documents:
            actions.append(ActionItem(
                action_id=f"ACT-{action_id:04d}",
                priority=Priority.CRITICAL,
                category="Document",
                action=f"RENEW: {doc.document_type}",
                reason=f"Certificate expired {abs(doc.days_until_expiry)} days ago",
                regulation_reference=doc.regulation_source,
                deadline="Immediately - before departure",
                responsible_party="Ship Manager / DPA",
                ports_affected=route_ports,
            ))
            action_id += 1

        # Actions for missing documents
        for doc in doc_analysis.missing_documents:
            actions.append(ActionItem(
                action_id=f"ACT-{action_id:04d}",
                priority=Priority.HIGH if doc.priority == Priority.CRITICAL else Priority.MEDIUM,
                category="Document",
                action=f"OBTAIN: {doc.document_type}",
                reason=f"Required by {doc.regulation_source}",
                regulation_reference=doc.regulation_source,
                deadline="Before departure",
                responsible_party="Ship Manager",
                ports_affected=doc.ports_requiring if doc.ports_requiring else route_ports,
            ))
            action_id += 1

        # Actions for expiring documents
        for doc in doc_analysis.expiring_soon:
            actions.append(ActionItem(
                action_id=f"ACT-{action_id:04d}",
                priority=Priority.HIGH if doc.days_until_expiry <= 14 else Priority.MEDIUM,
                category="Document",
                action=f"SCHEDULE RENEWAL: {doc.document_type}",
                reason=f"Expires in {doc.days_until_expiry} days (on {doc.expiry_date})",
                regulation_reference=doc.regulation_source,
                deadline=f"Before {doc.expiry_date}",
                responsible_party="Ship Manager",
            ))
            action_id += 1

        # Actions for ECA compliance
        if route_compliance.eca_ports:
            actions.append(ActionItem(
                action_id=f"ACT-{action_id:04d}",
                priority=Priority.HIGH,
                category="Fuel",
                action="VERIFY ECA FUEL COMPLIANCE",
                reason="Route includes ECA zones requiring 0.10% sulphur fuel",
                regulation_reference="MARPOL Annex VI Reg 14",
                deadline="Before entering ECA",
                responsible_party="Chief Engineer",
                ports_affected=route_compliance.eca_ports,
            ))
            action_id += 1

        # Actions for EU compliance
        if route_compliance.eu_ports:
            actions.append(ActionItem(
                action_id=f"ACT-{action_id:04d}",
                priority=Priority.MEDIUM,
                category="Emissions",
                action="VERIFY EU MRV MONITORING PLAN",
                reason="Route includes EU ports subject to MRV/ETS requirements",
                regulation_reference="EU Regulation 2015/757",
                deadline="Before EU port call",
                responsible_party="Ship Manager / Environmental Officer",
                ports_affected=route_compliance.eu_ports,
            ))
            action_id += 1

        return actions

    def _generate_summary(
        self,
        doc_analysis: DocumentGapAnalysis,
        risk_assessments: List[RiskAssessment],
        action_items: List[ActionItem]
    ) -> ComplianceReportSummary:
        """Generate executive summary."""
        # Determine overall status
        if doc_analysis.expired_documents or any(r.risk_level == RiskLevel.CRITICAL for r in risk_assessments):
            overall_status = ComplianceStatus.NON_COMPLIANT
        elif doc_analysis.missing_documents or doc_analysis.expiring_soon:
            overall_status = ComplianceStatus.PARTIAL
        else:
            overall_status = ComplianceStatus.COMPLIANT

        # Calculate compliance score
        compliance_score = int(doc_analysis.compliance_percentage)
        if doc_analysis.expired_documents:
            compliance_score = max(0, compliance_score - 20)

        # Determine overall risk level
        if any(r.risk_level == RiskLevel.CRITICAL for r in risk_assessments):
            risk_level = RiskLevel.CRITICAL
        elif any(r.risk_level == RiskLevel.HIGH for r in risk_assessments):
            risk_level = RiskLevel.HIGH
        elif any(r.risk_level == RiskLevel.MEDIUM for r in risk_assessments):
            risk_level = RiskLevel.MEDIUM
        else:
            risk_level = RiskLevel.LOW

        # Generate key findings
        key_findings = []
        if doc_analysis.expired_documents:
            key_findings.append(f"{len(doc_analysis.expired_documents)} certificate(s) have expired and require immediate renewal")
        if doc_analysis.expiring_soon:
            key_findings.append(f"{len(doc_analysis.expiring_soon)} certificate(s) expiring within 30 days")
        if doc_analysis.missing_documents:
            key_findings.append(f"{len(doc_analysis.missing_documents)} required document(s) not on file")
        for risk in risk_assessments[:2]:  # Top 2 risks
            if risk.risk_level in [RiskLevel.CRITICAL, RiskLevel.HIGH]:
                key_findings.append(f"Risk: {risk.risk_area}")

        # Get immediate actions
        immediate_actions = [
            a.action for a in action_items
            if a.priority == Priority.CRITICAL
        ][:5]

        return ComplianceReportSummary(
            overall_status=overall_status,
            compliance_score=compliance_score,
            risk_level=risk_level,
            key_findings=key_findings[:5],
            immediate_actions=immediate_actions,
            valid_certificates=len(doc_analysis.valid_documents),
            expiring_certificates=len(doc_analysis.expiring_soon),
            missing_certificates=len(doc_analysis.missing_documents),
            estimated_time_to_compliance=self._estimate_time_to_compliance(action_items),
        )

    def _calculate_detention_risk(
        self,
        doc_analysis: DocumentGapAnalysis,
        risk_assessments: List[RiskAssessment]
    ) -> RiskLevel:
        """Calculate PSC detention risk."""
        if doc_analysis.expired_documents:
            return RiskLevel.CRITICAL
        if len(doc_analysis.missing_documents) > 3:
            return RiskLevel.HIGH
        if doc_analysis.missing_documents or doc_analysis.expiring_soon:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    def _generate_timeline(
        self,
        action_items: List[ActionItem],
        voyage_start: Optional[date]
    ) -> List[Dict[str, Any]]:
        """Generate compliance timeline."""
        timeline = []

        # Sort actions by priority
        critical_actions = [a for a in action_items if a.priority == Priority.CRITICAL]
        high_actions = [a for a in action_items if a.priority == Priority.HIGH]

        if critical_actions:
            timeline.append({
                "phase": "Immediate (Before Departure)",
                "actions": [a.action for a in critical_actions],
                "deadline": "Now",
            })

        if high_actions:
            timeline.append({
                "phase": "Pre-Voyage",
                "actions": [a.action for a in high_actions],
                "deadline": voyage_start.isoformat() if voyage_start else "Before voyage",
            })

        return timeline

    def _estimate_time_to_compliance(self, action_items: List[ActionItem]) -> Optional[str]:
        """Estimate time to achieve full compliance."""
        critical_count = sum(1 for a in action_items if a.priority == Priority.CRITICAL)
        high_count = sum(1 for a in action_items if a.priority == Priority.HIGH)

        if critical_count > 0:
            return f"{critical_count * 2}-{critical_count * 5} days (requires immediate action)"
        elif high_count > 0:
            return f"{high_count}-{high_count * 3} weeks"
        else:
            return "Already compliant or minor actions only"

    # Helper methods
    def _get_psc_regime(self, port_code: str) -> str:
        """Determine PSC regime for a port."""
        if port_code.startswith("US"):
            return "USCG"
        elif port_code[:2] in ["NL", "DE", "BE", "FR", "GB", "ES", "IT", "PT", "NO", "SE", "DK", "FI", "PL"]:
            return "Paris MOU"
        elif port_code[:2] in ["SG", "CN", "JP", "KR", "AU", "NZ", "HK", "TW", "MY", "TH", "VN", "PH", "ID"]:
            return "Tokyo MOU"
        elif port_code[:2] in ["IN", "LK", "BD", "PK", "AE", "SA", "OM", "KE", "TZ", "ZA"]:
            return "Indian Ocean MOU"
        else:
            return "Local PSC"

    def _get_port_name(self, port_code: str) -> str:
        """Get port name from code."""
        port_names = {
            "SGSIN": "Port of Singapore",
            "NLRTM": "Port of Rotterdam",
            "DEHAM": "Port of Hamburg",
            "CNSHA": "Port of Shanghai",
            "HKHKG": "Port of Hong Kong",
            "USNYC": "Port of New York",
            "USLAX": "Port of Los Angeles",
        }
        return port_names.get(port_code, f"Port {port_code}")

    def _get_port_country(self, port_code: str) -> str:
        """Get country from port code."""
        return port_code[:2]

    def _get_advance_notice(self, port_code: str) -> int:
        """Get advance notice requirement in hours."""
        if port_code.startswith("US"):
            return 96  # USCG requires 96 hours
        else:
            return 24  # Standard for most ports

    def _get_pre_arrival_docs(self, port_code: str) -> List[str]:
        """Get pre-arrival document requirements."""
        base_docs = ["Crew List", "Cargo Manifest", "Ship's Stores Declaration"]
        if port_code.startswith("US"):
            base_docs.extend(["USCG Notice of Arrival (eNOAD)", "CBP Form 1302"])
        if port_code[:2] in ["NL", "DE", "BE", "FR", "GB", "ES", "IT"]:
            base_docs.extend(["FAL Forms 1-7", "Waste Notification"])
        return base_docs

    def _check_scrubber_allowed(self, port_code: str) -> bool:
        """Check if open-loop scrubbers are allowed."""
        # Many ports ban open-loop scrubbers
        banned_ports = ["SGSIN", "CNSHA", "DEHAM", "BEANR", "USLAX"]
        return port_code not in banned_ports

    def _get_special_requirements(self, port_code: str) -> List[str]:
        """Get port-specific special requirements."""
        requirements = []
        if port_code in self.EU_PORTS:
            requirements.append("EU MRV reporting required")
            requirements.append("EU ETS allowances required from 2024")
        if port_code == "SGSIN":
            requirements.append("MPA pre-arrival notification via MARINET")
        return requirements

    def _get_common_route_requirements(
        self,
        route_ports: List[str],
        vessel_info: Dict[str, Any]
    ) -> List[RegulationRequirement]:
        """Get requirements common to all ports on route."""
        # These are requirements that apply regardless of specific port
        return []

    def _extract_documents_from_text(self, text: str) -> List[str]:
        """Extract document names from text content."""
        # Simple extraction - look for common certificate patterns
        documents = []
        cert_keywords = ["Certificate", "Document", "Record Book", "Plan", "Manual"]
        for keyword in cert_keywords:
            if keyword.lower() in text.lower():
                # Find the phrase containing the keyword
                pass  # Simplified for now
        return documents


# Singleton instance
_report_generator: Optional[ComplianceReportGenerator] = None


def get_compliance_report_generator() -> ComplianceReportGenerator:
    """Get singleton instance of compliance report generator."""
    global _report_generator
    if _report_generator is None:
        _report_generator = ComplianceReportGenerator()
    return _report_generator
