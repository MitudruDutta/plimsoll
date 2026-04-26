"""
CrewAI Crew for Document Processing and Analysis
Multi-agent system for document classification, requirements lookup, and gap analysis
"""
import os
import time
import json
import logging
from typing import List, Optional, Dict, Any, Tuple

from shared.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# Try to import CrewAI
try:
    from crewai import Agent, Task, Crew, LLM
    HAS_CREWAI = True
except Exception as exc:
    HAS_CREWAI = False
    logger.warning("CrewAI document processing crew unavailable: %s", exc)


def test_gemini_connection(api_key: str, timeout: int = 10) -> None:
    """Test Google Gemini connection before initializing crew"""
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        model.generate_content("ping", request_options={"timeout": timeout})
    except Exception as e:
        raise RuntimeError(f"Gemini health check failed: {type(e).__name__}: {e}") from e


DOCUMENT_ANALYSIS_RULES = """You MUST follow these document analysis rules:
1) For document classification, check for specific certificate keywords (SOLAS, MARPOL, ISM, ISPS, etc.)
2) Extract ALL available metadata fields: document number, dates, vessel info, authorities
3) Be precise about expiry dates - calculate days until expiry and flag expired/expiring soon
4) For gap analysis, categorize findings by priority: CRITICAL, HIGH, MEDIUM
5) Always provide actionable recommendations with specific next steps
6) Output should be valid JSON when structured data is requested
Keep outputs focused and actionable for ship operators.
"""


def _init_llm():
    """Initialize LLM for CrewAI - uses Google Gemini by default"""
    if not HAS_CREWAI:
        raise RuntimeError("CrewAI not installed")

    # Try Google Gemini first (preferred)
    if settings.google_api_key:
        os.environ.setdefault("GOOGLE_API_KEY", settings.google_api_key)
        # Test connection
        test_gemini_connection(api_key=settings.google_api_key)
        return LLM(
            model="gemini/gemini-2.0-flash",
            api_key=settings.google_api_key
        )

    # Fall back to OpenAI if configured
    if settings.openai_api_key:
        os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)
        if settings.openai_base_url:
            os.environ.setdefault("OPENAI_BASE_URL", settings.openai_base_url)
        model_name = settings.openai_model or "gpt-4o-mini"
        return LLM(model=model_name)

    raise RuntimeError("No LLM API key configured. Set GOOGLE_API_KEY or OPENAI_API_KEY.")


def build_document_analysis_crew(
    document_texts: List[Dict[str, Any]],
    vessel_info: Dict[str, Any],
    route_ports: List[str]
) -> Tuple[Any, List[Any]]:
    """
    Build CrewAI crew for document analysis

    Args:
        document_texts: List of dicts with document OCR text and metadata
            [{"id": "...", "filename": "...", "ocr_text": "...", "file_type": "..."}, ...]
        vessel_info: Dict with vessel details (name, imo_number, vessel_type, flag_state)
        route_ports: List of port codes in route order

    Returns:
        Tuple of (Crew, List[Task])
    """
    if not HAS_CREWAI:
        raise RuntimeError("CrewAI not installed. Cannot build document analysis crew.")

    from modules.orchestration.document_tools import get_document_tools

    llm = _init_llm()
    tools = get_document_tools()

    common_backstory = (
        "You are part of a maritime document analysis team specializing in "
        "certificate verification, regulatory compliance, and document processing.\n"
        + DOCUMENT_ANALYSIS_RULES
    )

    # Format inputs for agents
    vessel_str = json.dumps(vessel_info, indent=2)
    route_str = " -> ".join(route_ports)
    docs_summary = "\n".join([
        f"- Document {i+1}: {d.get('filename', 'Unknown')} ({d.get('file_type', 'unknown')})"
        for i, d in enumerate(document_texts)
    ])

    # Prepare document texts for analysis
    all_doc_texts = "\n\n".join([
        f"=== DOCUMENT {i+1}: {d.get('filename', 'Unknown')} ===\n{d.get('ocr_text', '')[:3000]}"
        for i, d in enumerate(document_texts)
    ])

    # ========== AGENTS ==========

    document_analyzer = Agent(
        role="Maritime Document Analyzer",
        goal="Analyze uploaded documents to classify types and extract all metadata",
        backstory=common_backstory + "\nYou specialize in maritime certificate analysis. "
                  "You can identify document types from their content and extract key fields "
                  "like document numbers, issue dates, expiry dates, and vessel information.",
        llm=llm,
        tools=tools,
        verbose=True,
    )

    requirements_researcher = Agent(
        role="Document Requirements Researcher",
        goal="Determine all documents required for the vessel's voyage based on vessel type, flag state, and route",
        backstory=common_backstory + "\nYou are an expert on maritime regulatory requirements. "
                  "You know exactly which certificates and documents are required for different "
                  "vessel types, flag states, and port destinations.",
        llm=llm,
        tools=tools,
        verbose=True,
    )

    gap_analyst = Agent(
        role="Compliance Gap Analyst",
        goal="Compare the vessel's documents against requirements and produce actionable gap analysis",
        backstory=common_backstory + "\nYou excel at document gap analysis. "
                  "You identify missing documents, expired certificates, and documents expiring soon. "
                  "You provide prioritized, actionable recommendations for achieving compliance.",
        llm=llm,
        tools=tools,
        verbose=True,
    )

    # ========== TASKS ==========

    tasks: List[Task] = []

    # Task 1: Analyze uploaded documents
    tasks.append(Task(
        description=f"""
Analyze the following uploaded document(s) to classify their types and extract metadata.

DOCUMENTS TO ANALYZE:
{all_doc_texts}

For each document:
1. Use the document_classifier tool to determine the document type
2. Use the metadata_extractor tool to extract key fields:
   - Document number
   - Issue date
   - Expiry date
   - Vessel name
   - IMO number
   - Flag state
   - Issuing authority
3. Calculate if the document is expired or expiring soon (within 30 days)
4. Flag any concerns (missing fields, unusual values)

Output as JSON array:
[
  {{
    "document_id": 1,
    "filename": "...",
    "classified_type": "...",
    "confidence": 0.0-1.0,
    "metadata": {{
      "document_number": "...",
      "issue_date": "YYYY-MM-DD",
      "expiry_date": "YYYY-MM-DD",
      "vessel_name": "...",
      "imo_number": "...",
      "flag_state": "...",
      "issuing_authority": "..."
    }},
    "status": "valid|expired|expiring_soon",
    "days_until_expiry": int or null,
    "concerns": []
  }}
]

Limit: 500 words.
""",
        agent=document_analyzer,
        expected_output="JSON array with document classifications and metadata"
    ))

    # Task 2: Determine requirements based on context
    tasks.append(Task(
        description=f"""
Determine all documents required for this vessel's voyage.

VESSEL INFORMATION:
{vessel_str}

ROUTE: {route_str}

Use the requirements_lookup tool to find all required documents based on:
1. Vessel type: {vessel_info.get('vessel_type', 'container')}
2. Flag state: {vessel_info.get('flag_state', 'Unknown')}
3. Destination ports: {route_ports}

Include:
1. Mandatory IMO convention certificates (SOLAS, MARPOL, ISM, ISPS, etc.)
2. Port-specific requirements for each destination
3. Regional requirements (EU MRV if applicable, ECA compliance)
4. Flag state specific requirements

Output as JSON:
{{
  "context": {{
    "vessel_type": "...",
    "flag_state": "...",
    "ports": [...]
  }},
  "required_documents": [
    {{
      "document_type": "...",
      "requirement_source": "IMO/Port/Regional",
      "mandatory": true/false,
      "applies_to_ports": ["ALL"] or ["SGSIN", "NLRTM"]
    }}
  ],
  "total_required": int
}}

Limit: 400 words.
""",
        agent=requirements_researcher,
        expected_output="JSON with complete list of required documents"
    ))

    # Task 3: Gap analysis
    tasks.append(Task(
        description=f"""
Compare the analyzed documents against the requirements to produce a gap analysis.

Use the document_comparison tool with:
- user_documents_json: The analyzed documents from Task 1
- required_documents_json: The required document types from Task 2

Produce a comprehensive gap analysis report:

1. COMPLIANT DOCUMENTS
   - Documents that are present and valid

2. EXPIRING SOON (within 30 days)
   - Documents that need renewal soon
   - Include expiry dates and days remaining

3. EXPIRED DOCUMENTS
   - Documents that have expired
   - Urgency level: CRITICAL

4. MISSING DOCUMENTS
   - Documents that are required but not uploaded
   - Include which regulations require them

5. COMPLIANCE SCORE
   - Calculate overall compliance percentage

6. PRIORITIZED RECOMMENDATIONS
   - Rank by priority: CRITICAL, HIGH, MEDIUM
   - Include specific actions and deadlines

Output as JSON:
{{
  "overall_status": "COMPLIANT|PARTIAL|NON_COMPLIANT",
  "compliance_score": 0-100,
  "summary": "1-2 sentence summary",
  "valid_documents": [...],
  "expiring_soon": [...],
  "expired_documents": [...],
  "missing_documents": [...],
  "recommendations": [
    {{
      "priority": "CRITICAL|HIGH|MEDIUM",
      "action": "...",
      "documents": [...],
      "deadline": "immediate|within_30_days|before_voyage"
    }}
  ]
}}

Limit: 600 words.
""",
        agent=gap_analyst,
        expected_output="JSON gap analysis report with recommendations"
    ))

    # Create Crew
    crew = Crew(
        agents=[
            document_analyzer,
            requirements_researcher,
            gap_analyst
        ],
        tasks=tasks,
        verbose=True
    )

    return crew, tasks


async def run_document_analysis(
    document_texts: List[Dict[str, Any]],
    vessel_info: Dict[str, Any],
    route_ports: List[str]
) -> Dict[str, Any]:
    """
    Run the full document analysis using CrewAI

    Args:
        document_texts: List of dicts with OCR text from uploaded documents
        vessel_info: Vessel information dict
        route_ports: List of port codes

    Returns:
        Dict with analysis results and agent outputs
    """
    if not HAS_CREWAI:
        return {
            "error": "CrewAI not installed",
            "mock_result": True,
            "overall_status": "PENDING_REVIEW",
            "message": "Document analysis requires CrewAI to be installed"
        }

    if not settings.document_analysis_use_crewai:
        return {
            "error": "CrewAI document analysis is disabled",
            "mock_result": True,
            "overall_status": "PENDING_REVIEW",
            "message": "Enable document_analysis_use_crewai in settings"
        }

    try:
        crew, tasks = build_document_analysis_crew(
            document_texts=document_texts,
            vessel_info=vessel_info,
            route_ports=route_ports
        )

        # Run the crew
        result = crew.kickoff()

        # Try to parse the final result as JSON
        try:
            # Get the last task output which should be the gap analysis
            result_str = str(result)
            # Try to find JSON in the result
            json_start = result_str.find('{')
            json_end = result_str.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                parsed_result = json.loads(result_str[json_start:json_end])
            else:
                parsed_result = None
        except json.JSONDecodeError:
            parsed_result = None

        return {
            "success": True,
            "crew_output": str(result),
            "parsed_result": parsed_result,
            "tasks_completed": len(tasks),
            "documents_analyzed": len(document_texts),
            "vessel_info": vessel_info,
            "route_ports": route_ports
        }

    except Exception as e:
        logger.error(f"Document analysis crew error: {e}")
        return {
            "error": str(e),
            "success": False,
            "overall_status": "ERROR"
        }


class DocumentAnalysisOrchestrator:
    """
    Orchestrator for CrewAI document analysis
    Provides singleton pattern and manages analysis workflow
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._available = HAS_CREWAI and settings.document_analysis_use_crewai

    @property
    def is_available(self) -> bool:
        return self._available

    async def analyze_documents(
        self,
        document_texts: List[Dict[str, Any]],
        vessel_info: Dict[str, Any],
        route_ports: List[str]
    ) -> Dict[str, Any]:
        """Run document analysis"""
        return await run_document_analysis(
            document_texts=document_texts,
            vessel_info=vessel_info,
            route_ports=route_ports
        )


def get_document_analysis_orchestrator() -> DocumentAnalysisOrchestrator:
    """Get singleton orchestrator instance"""
    return DocumentAnalysisOrchestrator()
