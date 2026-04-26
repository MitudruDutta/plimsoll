"""
OCR Service - Document text extraction using Gemini Vision
Handles PDF, PNG, JPG for maritime certificates and permits
"""

import base64
import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

from shared.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class OCRResult:
    """Result of OCR text extraction"""

    text: str
    confidence: float
    provider: str = "gemini"
    pages: int = 1
    extracted_fields: dict[str, Any] = field(default_factory=dict)
    raw_response: dict | None = None
    error: str | None = None

    @property
    def success(self) -> bool:
        return self.error is None and len(self.text) > 0


class OCRService:
    """
    OCR Service using Gemini Vision for text extraction

    Supports:
    - PDF documents
    - PNG images
    - JPG/JPEG images

    Extracts:
    - Full text content
    - Structured fields (dates, document numbers, authorities)
    """

    SUPPORTED_MIME_TYPES = {
        "application/pdf": "pdf",
        "image/png": "png",
        "image/jpeg": "jpeg",
        "image/jpg": "jpeg",
    }

    # Patterns for extracting structured fields from maritime documents.
    # Each list is tried in order; the first match wins. Chinese variants are
    # added because a meaningful share of port-state and crew documents
    # circulate in zh (Maritime Safety Administration of the PRC, MSA).
    FIELD_PATTERNS = {
        "document_number": [
            r"(?:Certificate|Document)\s*(?:No|Number|#)[:\s]*([A-Z0-9\-/]+)",
            r"(?:No|Number)[:\s]*([A-Z0-9\-/]{5,})",
            r"(?:\u8bc1\u4e66|\u8bc1\u4ef6)\s*(?:\u7f16)?\s*\u53f7[:\uff1a\s]*([A-Z0-9\-/\u4e00-\u9fff]{4,})",
        ],
        "issue_date": [
            r"(?:Issue|Issued|Date of Issue)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
            r"(?:Issue|Issued)[:\s]*(\d{1,2}\s+\w+\s+\d{4})",
            r"\u53d1\u8bc1\u65e5\u671f[:\uff1a\s]*(\d{4}\s*\u5e74\s*\d{1,2}\s*\u6708\s*\d{1,2}\s*\u65e5)",
            r"(?:\u53d1\u8bc1|\u7b7e\u53d1)\s*\u65e5\s*\u671f?[:\uff1a\s]*(\d{4}[\-/\.]\d{1,2}[\-/\.]\d{1,2})",
        ],
        "expiry_date": [
            r"(?:Expir|Valid Until|Valid To|Validity)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
            r"(?:Expir|Valid Until)[:\s]*(\d{1,2}\s+\w+\s+\d{4})",
            r"(?:\u6709\u6548\u671f\u6ee1|\u5230\u671f|\u5230\u671f\u65e5)[:\uff1a\s]*(\d{4}\s*\u5e74\s*\d{1,2}\s*\u6708\s*\d{1,2}\s*\u65e5)",
            r"(?:\u6709\u6548\u671f\u6ee1|\u5230\u671f)[:\uff1a\s]*(\d{4}[\-/\.]\d{1,2}[\-/\.]\d{1,2})",
        ],
        "vessel_name": [
            r"(?:Vessel|Ship)\s*(?:Name)?[:\s]*([A-Z][A-Z\s\-\.]+)",
            r"M/V\s+([A-Z][A-Z\s\-\.]+)",
            r"(?:\u8239\u540d|\u8239\u8236\u540d\u79f0)[:\uff1a\s]*([\u4e00-\u9fffA-Z][\u4e00-\u9fffA-Za-z0-9\s\-\.]{1,40})",
        ],
        "imo_number": [
            r"IMO\s*(?:No|Number|#)?[:\s]*(\d{7})",
            r"IMO[\s\u53f7\uff1a:]*?(\d{7})",
        ],
        "flag_state": [
            r"(?:Flag|Registry|Port of Registry)[:\s]*([A-Z][a-zA-Z\s]+)",
            r"(?:\u8239\u65d7|\u822a\u8239\u56fd\u65d7)[:\uff1a\s]*([\u4e00-\u9fffA-Za-z\s]{2,40})",
        ],
        "issuing_authority": [
            r"(?:Issued by|Authority|Administration)[:\s]*([A-Z][a-zA-Z\s\-\.]+(?:Authority|Administration|Society|Bureau)?)",
            r"(?:\u53d1\u8bc1\u673a\u5173|\u9881\u53d1\u673a\u6784|\u4e3b\u7ba1\u673a\u5173)[:\uff1a\s]*([\u4e00-\u9fffA-Za-z\s]{2,80})",
        ],
        "gross_tonnage": [
            r"(?:Gross\s*Tonnage|GT)[:\s]*([\d,\.]+)",
            r"(?:\u603b\u5428|\u603b\u5428\u4f4d)[:\uff1a\s]*([\d,\.]+)",
        ],
    }

    # Plausible Chinese keywords that appear on certificates issued by China
    # MSA / classification societies; if any are present we treat the doc as
    # Chinese so the date parser tries the zh formats first.
    _CHINESE_KEYWORDS = (
        "\u8bc1\u4e66",  # certificate
        "\u8239\u540d",  # vessel name
        "\u53d1\u8bc1",  # issued
        "\u6709\u6548\u671f",  # validity period
        "\u8239\u65d7",  # flag
    )

    def __init__(self):
        self.api_key = settings.google_api_key
        self._client: httpx.AsyncClient | None = None

        if not self.api_key:
            logger.warning("Google API key not configured. OCR will run in MOCK mode.")

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=60.0)
        return self._client

    async def close(self):
        """Close HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def extract_text(self, file_path: str, mime_type: str | None = None) -> OCRResult:
        """
        Extract text from a document using Gemini Vision

        Args:
            file_path: Path to the file
            mime_type: MIME type of the file (auto-detected if not provided)

        Returns:
            OCRResult with extracted text and metadata
        """
        # Validate file exists
        if not os.path.exists(file_path):
            return OCRResult(text="", confidence=0.0, error=f"File not found: {file_path}")

        # Auto-detect mime type if not provided
        if not mime_type:
            mime_type = self._detect_mime_type(file_path)

        # Validate mime type
        if mime_type not in self.SUPPORTED_MIME_TYPES:
            return OCRResult(text="", confidence=0.0, error=f"Unsupported file type: {mime_type}")

        # Read file content
        try:
            with open(file_path, "rb") as f:
                file_content = f.read()
            return await self.extract_text_from_bytes(file_content, mime_type, Path(file_path).name)
        except Exception as e:
            logger.error(f"OCR extraction error: {e}")
            return OCRResult(text="", confidence=0.0, error=str(e))

    async def extract_text_from_bytes(
        self, content: bytes, mime_type: str, filename: str | None = None
    ) -> OCRResult:
        """
        Extract text from file bytes directly.
        Uses Gemini Vision as primary OCR engine.
        """
        # 1. Try JSON Parsing first (for structured data files)
        try:
            text_content = content.decode("utf-8")
            data = json.loads(text_content)

            # Check for known structure (ship_intelligence_profile)
            if isinstance(data, dict) and "ship_intelligence_profile" in data:
                profile = data["ship_intelligence_profile"]
                vessel_particulars = profile.get("vessel_particulars", {})

                logger.info(f"JSON Parser: Successfully extracted data from {filename}")

                return OCRResult(
                    text=json.dumps(data, indent=2),
                    confidence=1.0,
                    provider="json_parser",
                    extracted_fields={
                        "vessel_name": vessel_particulars.get("vessel_name"),
                        "imo_number": vessel_particulars.get("imo_number"),
                        "call_sign": vessel_particulars.get("call_sign"),
                        "flag_state": vessel_particulars.get("flag"),
                        "vessel_type": vessel_particulars.get("vessel_type"),
                        "gross_tonnage": "N/A",
                        "issue_date": datetime.now().strftime("%Y-%m-%d"),
                    },
                )
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass  # Not a JSON file, or binary content

        if mime_type not in self.SUPPORTED_MIME_TYPES:
            return OCRResult(text="", confidence=0.0, error=f"Unsupported file type: {mime_type}")

        # 2. Use Gemini Vision OCR
        if self.api_key and "DEMO_KEY" not in self.api_key:
            try:
                logger.info(f"Using Gemini Vision OCR for {filename}...")

                prompt = """
                Extract the following fields from this maritime document into JSON format:
                - vessel_name
                - imo_number
                - call_sign
                - flag_state
                - vessel_type
                - gross_tonnage
                - issue_date (YYYY-MM-DD or whatever is present)
                - expiry_date (YYYY-MM-DD or whatever is present)
                - issuing_authority
                - document_number

                Return ONLY raw JSON. No markdown formatting (no ```json blocks).
                """

                b64_content = base64.b64encode(content).decode("utf-8")
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={self.api_key}"

                payload = {
                    "contents": [
                        {
                            "parts": [
                                {"text": prompt},
                                {"inline_data": {"mime_type": mime_type, "data": b64_content}},
                            ]
                        }
                    ]
                }

                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json=payload, timeout=60.0)

                if resp.status_code == 200:
                    result = resp.json()
                    candidates = result.get("candidates", [])
                    if candidates:
                        raw_text = candidates[0]["content"]["parts"][0]["text"]
                        raw_text = raw_text.replace("```json", "").replace("```", "").strip()

                        try:
                            extracted_data = json.loads(raw_text)
                            logger.info(f"Gemini Vision OCR Success for {filename}")

                            return OCRResult(
                                text=json.dumps(extracted_data, indent=2),
                                confidence=0.95,
                                provider="gemini",
                                pages=1,
                                extracted_fields=extracted_data,
                            )
                        except json.JSONDecodeError as je:
                            logger.warning(
                                f"Gemini returned invalid JSON: {je}. Raw: {raw_text[:100]}..."
                            )
                    else:
                        logger.warning("Gemini response contained no candidates.")
                else:
                    logger.error(f"Gemini API returned status {resp.status_code}: {resp.text}")

            except Exception as e:
                logger.error(f"Gemini Vision OCR Failed: {e}")

        # 3. Static Mock (Fallback when Gemini is not available)
        logger.warning("Using Static Mock Data (Gemini not configured or failed)")
        return self._mock_extract_from_bytes(content, mime_type, filename)

    def _extract_structured_fields(self, text: str) -> dict[str, Any]:
        """Extract structured fields from text using regex patterns."""
        fields: dict[str, Any] = {}
        fields["language"] = self._detect_language(text)

        for field_name, patterns in self.FIELD_PATTERNS.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    value = match.group(1).strip()
                    value = re.sub(r"\s+", " ", value)
                    fields[field_name] = value
                    break

        for date_field in ("issue_date", "expiry_date"):
            if date_field in fields:
                parsed_date = self._parse_date(fields[date_field])
                if parsed_date:
                    fields[f"{date_field}_parsed"] = parsed_date.isoformat()

        return fields

    def _parse_date(self, date_str: str) -> datetime | None:
        """Parse date string to datetime, handling EN + ZH formats."""
        if not date_str:
            return None

        normalized = self._normalize_chinese_date(date_str)
        date_formats = [
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%Y.%m.%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%d.%m.%Y",
            "%m/%d/%Y",
            "%m-%d-%Y",
            "%d %B %Y",
            "%d %b %Y",
        ]

        for fmt in date_formats:
            try:
                return datetime.strptime(normalized, fmt)
            except ValueError:
                continue

        return None

    @staticmethod
    def _normalize_chinese_date(date_str: str) -> str:
        """Convert ``YYYY\u5e74M\u6708D\u65e5`` to ``YYYY-MM-DD``."""
        if not date_str:
            return date_str
        year = date_str
        for source, target in (("\u5e74", "-"), ("\u6708", "-"), ("\u65e5", "")):
            year = year.replace(source, target)
        return re.sub(r"\s+", "", year).strip("-")

    def _detect_language(self, text: str) -> str:
        """Cheap language sniffer. ``zh`` if any Han characters or known
        Chinese keywords show up, otherwise ``en``."""
        if not text:
            return "en"
        if any(keyword in text for keyword in self._CHINESE_KEYWORDS):
            return "zh"
        if re.search(r"[\u4e00-\u9fff]", text):
            return "zh"
        return "en"

    def _detect_mime_type(self, file_path: str) -> str:
        """Detect MIME type from file extension"""
        ext = Path(file_path).suffix.lower()
        mime_map = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
        }
        return mime_map.get(ext, "application/octet-stream")

    def _mock_extract_from_bytes(
        self, content: bytes, mime_type: str, filename: str | None
    ) -> OCRResult:
        """Generate static mock OCR result"""
        doc_no = hash(content[:100]) % 10000
        mock_text = f"""
INTERNATIONAL MARITIME CERTIFICATE

Certificate No: MOCK-{doc_no:04d}

Vessel Name: M/V TEST VESSEL
IMO Number: 1234567

This document has been processed in MOCK mode.
Google API key is not configured.

Issue Date: 15/06/2024
Expiry Date: 14/06/2025
"""

        return OCRResult(
            text=mock_text.strip(),
            confidence=0.70,
            provider="mock",
            pages=1,
            extracted_fields={
                "document_number": f"MOCK-{doc_no:04d}",
                "vessel_name": "TEST VESSEL",
                "imo_number": "1234567",
                "issue_date": "15/06/2024",
                "expiry_date": "14/06/2025",
            },
        )


# Singleton instance
_ocr_service: OCRService | None = None


def get_ocr_service() -> OCRService:
    """Get OCRService singleton instance"""
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = OCRService()
    return _ocr_service
