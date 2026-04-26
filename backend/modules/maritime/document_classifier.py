"""Lightweight maritime document classification helpers.

This module deliberately has no CrewAI or LLM imports. Request handlers and
basic document processing can use it without triggering agent framework startup.
"""

DOCUMENT_TYPES = {
    "safety_management_certificate": ["ISM", "SMC", "Safety Management Certificate"],
    "safety_construction_certificate": ["SOLAS", "Safety Construction", "Cargo Ship Safety Construction"],
    "safety_equipment_certificate": ["Safety Equipment", "Cargo Ship Safety Equipment"],
    "safety_radio_certificate": ["Safety Radio", "Cargo Ship Safety Radio"],
    "load_line_certificate": ["Load Line", "International Load Line", "ILL"],
    "tonnage_certificate": ["Tonnage", "International Tonnage", "ITC"],
    "iopp_certificate": ["IOPP", "Oil Pollution Prevention", "MARPOL Annex I"],
    "ispp_certificate": ["ISPP", "Sewage Pollution Prevention", "MARPOL Annex IV"],
    "iapp_certificate": ["IAPP", "Air Pollution Prevention", "MARPOL Annex VI"],
    "civil_liability_certificate": ["CLC", "Civil Liability", "Bunker Convention"],
    "isps_certificate": ["ISPS", "Security", "International Ship Security"],
    "mlc_certificate": ["MLC", "Maritime Labour Convention", "DMLC"],
    "continuous_synopsis_record": ["CSR", "Continuous Synopsis Record"],
    "registry_certificate": ["Registry", "Certificate of Registry", "Flag State"],
    "minimum_safe_manning": ["Safe Manning", "Minimum Safe Manning", "MSM"],
    "stcw_certificate": ["STCW", "Seafarer", "Competency Certificate"],
}


def classify_document_from_text(text: str) -> str:
    """Classify a maritime document type from text using keyword matching."""
    if not text:
        return "unknown"
    text_upper = text.upper()
    best_type = "unknown"
    best_score = 0
    for doc_type, keywords in DOCUMENT_TYPES.items():
        score = sum(1 for keyword in keywords if keyword.upper() in text_upper)
        if score > best_score:
            best_score = score
            best_type = doc_type
    return best_type
