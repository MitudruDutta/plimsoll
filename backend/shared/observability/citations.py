"""Citation payloads for agent / RAG outputs.

Every agent surface that the user can see (compliance check, market sentinel,
hedge recommendation, visual risk, …) MUST attach evidence. This module is
the single source of truth for the shape of that evidence.

Three types of citations are supported:

1. ``regulation`` — IMO convention, MOU rule, port-specific regulation.
   Carries source name, optional chapter/regulation number, and a URL when
   we have one.
2. ``document`` — a tenant-uploaded document (certificate, manifest, …).
   Carries the doc id and page number when known.
3. ``source`` — generic web/news/data source (e.g. UKMTO bulletin, Reuters,
   Argus tape, Sentinel-2 acquisition).

The contract is enforced by ``ensure_citations()``: if a payload claims
``confidence > 0`` but ships zero citations, that's a bug that should fail
loud in tests/CI rather than ship a hallucination to a customer.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Iterable, Literal, Optional

from pydantic import BaseModel, Field

CitationKind = Literal["regulation", "document", "source"]


class Citation(BaseModel):
    """One piece of evidence backing a claim."""

    kind: CitationKind
    title: str
    url: Optional[str] = None

    # `regulation` extras
    convention: Optional[str] = None  # e.g. "SOLAS", "MARPOL Annex VI"
    regulation_number: Optional[str] = None
    chapter: Optional[str] = None

    # `document` extras
    document_id: Optional[str] = None
    page: Optional[int] = None

    # `source` extras
    publisher: Optional[str] = None
    published_at: Optional[datetime] = None

    # Provenance
    retrieved_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    snippet: Optional[str] = None  # short quote for transparency


class CitedPayload(BaseModel):
    """Mixin shape for any agent output that ships citations."""

    citations: list[Citation] = Field(default_factory=list)


class MissingCitationsError(ValueError):
    """Raised when an output that requires evidence ships none."""


def ensure_citations(
    payload: Any,
    *,
    surface: str,
    minimum: int = 1,
) -> None:
    """Guard: raise if ``payload.citations`` does not have ``minimum`` entries.

    Accepts either a ``CitedPayload`` (or subclass) or a plain dict with a
    ``"citations"`` key. Use this at the edge of every agent surface
    immediately before returning to the caller.
    """
    if isinstance(payload, CitedPayload):
        cites = payload.citations
    elif isinstance(payload, dict):
        cites = payload.get("citations") or []
    else:
        raise MissingCitationsError(
            f"{surface}: cannot enforce citations on {type(payload).__name__}"
        )

    if not isinstance(cites, list) or len(cites) < minimum:
        raise MissingCitationsError(
            f"{surface}: agent output ships {len(cites) if isinstance(cites, list) else 0} "
            f"citations, requires at least {minimum}"
        )


def merge_citations(*sources: Iterable[Citation]) -> list[Citation]:
    """Deduplicate citations across multiple sources (preserves order)."""
    seen: set[tuple[str, str | None, str | None]] = set()
    merged: list[Citation] = []
    for source in sources:
        for cite in source:
            key = (cite.title, cite.url, cite.document_id)
            if key in seen:
                continue
            seen.add(key)
            merged.append(cite)
    return merged
