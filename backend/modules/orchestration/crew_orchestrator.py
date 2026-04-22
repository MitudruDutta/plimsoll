"""
CrewAI orchestration layer (feature-flagged).

When enabled, this uses CrewAI to orchestrate a single agent that:
- Consumes RAG context from the existing knowledge base.
- Generates an answer and meta signals (confidence, should_handoff, product_tag).

If CrewAI is not installed or errors, the caller should fall back to the
existing single-agent chatbot.
"""
import json
import logging
from typing import Dict, List, Optional

import os
# from modules.maritime.knowledge_base import get_knowledge_base
# from modules.orchestration.chatbot import DJIChatbot  # fallback helpers (product detection, etc.)
from shared.config import get_settings

logger = logging.getLogger(__name__)


class CrewAIUnavailable(Exception):
    """Raised when CrewAI is not installed or cannot be initialized."""


class CrewAIOrchestrator:
    def __init__(self):
        try:
            from crewai import Agent, Task, Crew, LLM
        except Exception as exc:  # pragma: no cover - runtime guard
            raise CrewAIUnavailable(f"CrewAI not available: {exc}") from exc

        self.Agent = Agent
        self.Task = Task
        self.Crew = Crew
        self.LLM = LLM
        self.settings = get_settings()
        self.llm = self._init_llm()

    def chat(self, customer_id: int, message: str, language: str = "zh-cn") -> Dict:
        """
        Run the CrewAI-powered flow.

        Returns a dict compatible with the existing chatbot output:
            {
                "answer": str,
                "confidence": float,
                "should_handoff": bool,
                "product_tag": Optional[str],
            }
        """
        # Build RAG context up front (outside CrewAI) to keep determinism.
        product_tag = self._detect_product(message)
        docs = self.kb.search(message, product_filter=product_tag, top_k=5)
        context = self._build_context(docs)

        agent = self.Agent(
            role="DJI Sales AI Crew",
            goal="Provide accurate, concise, product-aware responses for DJI industrial drones.",
            backstory=(
                "You are a senior B2B sales engineer for DJI Matrice series."
                "You must rely on the provided RAG context. Keep responses concise, "
                "cite sources when mentioning specs, and flag low confidence for handoff."
            ),
            verbose=False,
            llm=self.llm,
        )

        task = self.Task(
            description=self._build_task_description(message, context, language),
            agent=agent,
            expected_output=(
                "JSON with keys: answer (string), confidence (0-1 float), "
                "should_handoff (bool), product_tag (string or null)."
            ),
        )

        crew = self.Crew(
            agents=[agent],
            tasks=[task],
            verbose=True,
            
        )

        raw_result = crew.kickoff()
        parsed = self._parse_result(raw_result)

        # Merge defaults if parsing fails partially
        parsed.setdefault("product_tag", product_tag)
        parsed.setdefault("confidence", self._infer_confidence_from_docs(docs))
        parsed.setdefault("should_handoff", parsed.get("confidence", 0.0) < 0.7)

        return {
            "answer": parsed.get("answer", ",."),
            "confidence": float(parsed.get("confidence", 0.6)),
            "should_handoff": bool(parsed.get("should_handoff", False)),
            "product_tag": parsed.get("product_tag"),
        }

    # ---------- internal helpers ----------
    def _build_context(self, docs: List) -> str:
        if not docs:
            return ""
        parts = []
        for doc in docs:
            meta = doc.metadata or {}
            product = meta.get("product_tag", "")
            doc_type = meta.get("doc_type", "")
            parts.append(f"[{product} - {doc_type}] {doc.page_content[:400]}")
        return "\n\n---\n\n".join(parts)

    def _build_task_description(self, message: str, context: str, language: str) -> str:
        return f"""
(DJI)Sales.Customer.

:
{context}

Customer:
{message}

:
- ,
- ,“M30”
- Language: {'' if language == 'zh-cn' else 'English'}
- : 50-120
- JSON,:
{{
  "answer": "...",
  "confidence": 0.85,
  "should_handoff": false,
  "product_tag": "M30"
}}
"""

    def _parse_result(self, result: object) -> Dict:
        text = result
        try:
            # crewai may return a CrewOutput; convert to string
            if hasattr(result, "raw"):
                text = result.raw
            elif not isinstance(result, str):
                text = str(result)
            match = json.loads(text)
            return match if isinstance(match, dict) else {}
        except Exception:
            # Try to extract JSON manually
            import re

            json_match = re.search(r"\{.*\}", text, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except Exception:
                    return {}
            return {}

    def _detect_product(self, message: str) -> Optional[str]:
        try:
            return self.fallback_detector._detect_product(message)
        except Exception:
            return None

    def _infer_confidence_from_docs(self, docs: List) -> float:
        if not docs:
            return 0.5
        if len(docs) >= 2:
            return 0.85
        return 0.7

    def _init_llm(self):
        """
        Configure CrewAI to use Google Gemini or OpenAI.
        Priority: Google API key > OpenAI API key > fallback
        """
        try:
            # Try Google Gemini first
            if self.settings.google_api_key:
                os.environ.setdefault("GOOGLE_API_KEY", self.settings.google_api_key)
                return self.LLM(
                    model="gemini/gemini-3-flash-preview",
                    api_key=self.settings.google_api_key
                )

            # Fall back to OpenAI if configured
            if (self.settings.llm_provider or "").lower() == "openai" and self.settings.openai_api_key:
                os.environ.setdefault("OPENAI_API_KEY", self.settings.openai_api_key)
                if self.settings.openai_base_url:
                    os.environ.setdefault("OPENAI_BASE_URL", self.settings.openai_base_url)
                model_name = self.settings.openai_model or "gpt-4o-mini"
                return self.LLM(model=model_name)

            logger.warning("No LLM API key configured (GOOGLE_API_KEY or OPENAI_API_KEY)")
            return None
        except Exception as exc:
            logger.warning(f"Failed to init CrewAI LLM: {exc}")
            return None


_crew_orchestrator = None


def get_crew_orchestrator() -> Optional[CrewAIOrchestrator]:
    """Lazy singleton with safe fallback if CrewAI is missing."""
    global _crew_orchestrator
    if _crew_orchestrator is not None:
        return _crew_orchestrator
    try:
        _crew_orchestrator = CrewAIOrchestrator()
    except CrewAIUnavailable as exc:
        logger.warning(f"CrewAI unavailable, fallback to default chatbot: {exc}")
        _crew_orchestrator = None
    return _crew_orchestrator

