"""Postgres/pgvector-backed maritime knowledge base.

This module intentionally has no external vector-database dependency. It stores regulation chunks
and uploaded document OCR text in Postgres tables with pgvector columns. Vector
ranking can be added once embedding generation is configured; until then the
service uses deterministic metadata filters plus lightweight lexical scoring so
local development stays bootable without cloud LLM credentials.
"""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from functools import lru_cache
from typing import Any

from sqlalchemy import bindparam, func, or_

from shared.config import get_settings
from shared.database.database import SessionLocal
from shared.database.models import KnowledgeDocument, UserDocument
from shared.embeddings import embed_query as _embed_query
from shared.embeddings import embed_texts as _embed_texts
from shared.embeddings import is_available as _embeddings_available

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class SimpleDocument:
    """Small compatibility type matching the LangChain Document surface we use."""

    page_content: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SearchResult:
    """Search result with metadata."""

    content: str
    metadata: dict[str, Any]
    score: float = 0.0
    source: str = ""


class MaritimeKnowledgeBase:
    """Maritime regulation and user-document search backed by Postgres."""

    COLLECTIONS = {
        "imo_conventions": "IMO conventions (SOLAS, MARPOL, STCW, etc.)",
        "psc_requirements": "Port State Control requirements",
        "port_regulations": "Port-specific regulations",
        "regional_requirements": "Regional requirements (EU MRV, US CFR, etc.)",
        "customs_documentation": "Customs and documentation requirements",
        "user_documents": "User-uploaded certificates and permits",
    }

    Document = SimpleDocument

    def __init__(self) -> None:
        self.mock_mode = settings.kb_backend == "disabled"
        self.embedding_model = settings.embedding_model
        self.embedding_dim = settings.embedding_dim
        # Compatibility for older scripts that check `kb.embeddings is None`.
        self.embeddings = None if self.mock_mode else "pgvector"
        # When fastembed is installed we can populate the pgvector column and
        # rank by cosine similarity. Otherwise we fall back to lexical-only.
        self._embeddings_available = (not self.mock_mode) and _embeddings_available()

    def _metadata_to_json(self, metadata: dict[str, Any]) -> str:
        return json.dumps(metadata or {}, default=str, ensure_ascii=False, sort_keys=True)

    def _metadata_from_json(self, value: str | None) -> dict[str, Any]:
        if not value:
            return {}
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}

    def _content_hash(self, collection_name: str, content: str, metadata: dict[str, Any]) -> str:
        digest = hashlib.sha256()
        digest.update(collection_name.encode("utf-8"))
        digest.update(b"\0")
        digest.update(content.encode("utf-8"))
        digest.update(b"\0")
        digest.update(self._metadata_to_json(metadata).encode("utf-8"))
        return digest.hexdigest()

    def _row_to_result(self, row: KnowledgeDocument, query: str = "") -> SearchResult:
        metadata = self._metadata_from_json(row.metadata_json)
        return SearchResult(
            content=row.content,
            metadata=metadata,
            score=self._lexical_score(query, row.content, metadata) if query else 1.0,
            source=row.collection_name,
        )

    def _user_row_to_dict(self, row: UserDocument) -> dict[str, Any]:
        return {
            "id": row.id,
            "customer_id": row.customer_id,
            "vessel_id": row.vessel_id,
            "title": row.title,
            "document_type": row.document_type,
            "file_path": row.file_path,
            "file_name": row.file_name,
            "file_size": row.file_size,
            "mime_type": row.mime_type,
            "text": row.extracted_text or "",
            "ocr_provider": row.ocr_provider,
            "ocr_confidence": row.ocr_confidence,
            "issuing_authority": row.issuing_authority,
            "issue_date": row.issue_date or "",
            "expiry_date": row.expiry_date or "",
            "document_number": row.document_number,
            "is_validated": bool(row.is_validated),
            "validation_notes": row.validation_notes,
            "extracted_fields_json": row.extracted_fields_json or "{}",
            "created_at": row.created_at.isoformat() if row.created_at else "",
            "updated_at": row.updated_at.isoformat() if row.updated_at else "",
        }

    def _matches_filters(self, metadata: dict[str, Any], filters: dict[str, Any]) -> bool:
        for key, value in filters.items():
            candidate = metadata.get(key)
            if candidate is None:
                return False
            if isinstance(candidate, str) and isinstance(value, str):
                if value.lower() not in candidate.lower():
                    return False
            elif candidate != value:
                return False
        return True

    def _lexical_score(self, query: str, content: str, metadata: dict[str, Any]) -> float:
        haystack = f"{content} {self._metadata_to_json(metadata)}".lower()
        terms = [term for term in query.lower().replace("/", " ").split() if len(term) > 2]
        if not terms:
            return 0.0
        matches = sum(1 for term in terms if term in haystack)
        return matches / len(terms)

    # ------------------------------------------------------------------
    # Regulation/document chunk search
    # ------------------------------------------------------------------

    def add_documents(self, collection_name: str, documents: list[Any]) -> int:
        if self.mock_mode:
            logger.warning("KB_BACKEND=disabled; skipping %s documents", len(documents))
            return 0
        if collection_name not in self.COLLECTIONS:
            logger.error("Unknown collection %s", collection_name)
            return 0

        # Pre-extract content/metadata so we can batch-embed in one pass.
        prepared: list[tuple[str, dict[str, Any], str]] = []
        for doc in documents:
            content = getattr(doc, "page_content", None) or getattr(doc, "content", "") or ""
            metadata = dict(getattr(doc, "metadata", {}) or {})
            if not content.strip():
                continue
            content_hash = self._content_hash(collection_name, content, metadata)
            prepared.append((content, metadata, content_hash))

        embeddings_by_index: dict[int, list[float]] = {}
        if self._embeddings_available and prepared:
            try:
                vectors = _embed_texts([item[0] for item in prepared])
                for idx, vec in enumerate(vectors):
                    if vec:
                        embeddings_by_index[idx] = vec
            except Exception:  # pragma: no cover - encoder runtime errors
                logger.exception("Embedding generation failed; storing rows without vectors")

        added = 0
        session = SessionLocal()
        try:
            for idx, (content, metadata, content_hash) in enumerate(prepared):
                exists = (
                    session.query(KnowledgeDocument)
                    .filter(KnowledgeDocument.content_hash == content_hash)
                    .first()
                )
                if exists:
                    continue
                session.add(
                    KnowledgeDocument(
                        collection_name=collection_name,
                        content=content,
                        metadata_json=self._metadata_to_json(metadata),
                        content_hash=content_hash,
                        embedding=embeddings_by_index.get(idx),
                        embedding_model=self.embedding_model,
                    )
                )
                added += 1
            session.commit()
            return added
        except Exception:
            session.rollback()
            logger.exception("Failed to add documents to %s", collection_name)
            return 0
        finally:
            session.close()

    def get_collection_stats(self) -> dict[str, int]:
        stats = dict.fromkeys(self.COLLECTIONS, 0)
        if self.mock_mode:
            return stats

        session = SessionLocal()
        try:
            rows = (
                session.query(KnowledgeDocument.collection_name, func.count(KnowledgeDocument.id))
                .group_by(KnowledgeDocument.collection_name)
                .all()
            )
            for name, count in rows:
                stats[name] = int(count)
            stats["user_documents"] = session.query(UserDocument).count()
            return stats
        finally:
            session.close()

    def search_general(
        self,
        query: str,
        filters: dict[str, Any] | None = None,
        top_k: int = 5,
        collections: list[str] | None = None,
    ) -> list[SearchResult]:
        if self.mock_mode:
            return []

        selected = collections or [name for name in self.COLLECTIONS if name != "user_documents"]
        selected = [name for name in selected if name in self.COLLECTIONS and name != "user_documents"]
        if not selected:
            return []

        query_vector: list[float] | None = None
        if self._embeddings_available and query.strip():
            try:
                vec = _embed_query(query)
                if vec:
                    query_vector = vec
            except Exception:  # pragma: no cover - runtime encoder failures
                logger.exception("Query embedding failed; falling back to lexical")

        session = SessionLocal()
        try:
            db_query = session.query(KnowledgeDocument).filter(
                KnowledgeDocument.collection_name.in_(selected)
            )
            if query_vector is not None:
                # `PgVector` is a TypeDecorator so SQLAlchemy doesn't surface
                # pgvector's custom comparator (no `cosine_distance` helper).
                # Use the raw `<=>` operator and pass the bound parameter with
                # the column's own type so pgvector's bind processor converts
                # the python list into the on-wire vector format.
                distance = KnowledgeDocument.embedding.op("<=>")(
                    bindparam(
                        "query_vector",
                        query_vector,
                        type_=KnowledgeDocument.embedding.type,
                    )
                )
                rows = (
                    db_query.filter(KnowledgeDocument.embedding.isnot(None))
                    .order_by(distance.asc())
                    .limit(max(top_k * 4, 20))
                    .all()
                )
                if not rows:
                    # Index hasn't been ingested with vectors yet — degrade
                    # to lexical so the route still returns useful hits.
                    query_vector = None
            if query_vector is None:
                terms = [term for term in query.split() if len(term) > 2][:6]
                if terms:
                    db_query = db_query.filter(
                        or_(*[KnowledgeDocument.content.ilike(f"%{term}%") for term in terms])
                    )
                rows = (
                    db_query.order_by(KnowledgeDocument.updated_at.desc())
                    .limit(max(top_k * 4, 20))
                    .all()
                )

            results = []
            for row in rows:
                result = self._row_to_result(row, query)
                if filters and not self._matches_filters(result.metadata, filters):
                    continue
                results.append(result)
            if query_vector is None:
                results.sort(key=lambda item: item.score, reverse=True)
            return results[:top_k]
        finally:
            session.close()

    def search_by_port(
        self, port_code: str, vessel_type: str | None = None, top_k: int = 10
    ) -> list[SearchResult]:
        filters: dict[str, Any] = {"port_code": port_code}
        if vessel_type:
            filters["vessel_type"] = vessel_type
        return self.search_general(
            query=f"port requirements regulations {port_code} {vessel_type or ''}",
            filters=filters,
            top_k=top_k,
            collections=["port_regulations", "psc_requirements", "customs_documentation"],
        )

    def search_by_route(
        self, port_codes: list[str], vessel_info: dict[str, Any], top_k_per_port: int = 5
    ) -> dict[str, list[SearchResult]]:
        return {
            port_code: self.search_by_port(
                port_code, vessel_info.get("vessel_type"), top_k=top_k_per_port
            )
            + self.search_regional_requirements(port_code, vessel_info, top_k=3)
            for port_code in port_codes
        }

    def search_required_documents(self, port_code: str, vessel_type: str) -> list[dict[str, Any]]:
        results = self.search_general(
            query=f"required documents certificates {vessel_type} {port_code}",
            top_k=20,
            collections=["port_regulations", "psc_requirements", "customs_documentation"],
        )
        required = []
        seen = set()
        for result in results:
            raw_docs = result.metadata.get("required_documents", [])
            if isinstance(raw_docs, str):
                try:
                    raw_docs = json.loads(raw_docs)
                except json.JSONDecodeError:
                    raw_docs = [raw_docs]
            for doc_type in raw_docs or []:
                if doc_type in seen:
                    continue
                seen.add(doc_type)
                required.append(
                    {
                        "document_type": doc_type,
                        "regulation_source": result.metadata.get(
                            "source_convention", result.source
                        ),
                        "description": result.content[:200],
                        "port_code": port_code,
                    }
                )
        return required

    def search_regional_requirements(
        self, port_code: str, vessel_info: dict[str, Any], top_k: int = 5
    ) -> list[SearchResult]:
        return self.search_general(
            query=f"regional requirements {port_code} {vessel_info.get('vessel_type', '')}",
            top_k=top_k,
            collections=["regional_requirements"],
        )

    # ------------------------------------------------------------------
    # Business-friendly helpers used by tools/routes
    # ------------------------------------------------------------------

    def query_for_business(
        self,
        query: str,
        vessel_type: str | None = None,
        port_codes: list[str] | None = None,
        top_k: int = 10,
    ) -> dict[str, Any]:
        search_query = " ".join([query, vessel_type or "", " ".join(port_codes or [])]).strip()
        results = self.search_general(search_query, top_k=top_k)
        docs_needed = []
        for result in results:
            for item in result.metadata.get("required_documents", []) or []:
                if item not in docs_needed:
                    docs_needed.append(item)
        return {
            "query_summary": f"Found {len(results)} relevant records for: {query}",
            "regulations": [
                {
                    "regulation": r.metadata.get("source_convention", r.source),
                    "title": r.metadata.get("title", "Maritime requirement"),
                    "content": r.content[:500],
                    "relevance_score": round(r.score, 3),
                }
                for r in results[:5]
            ],
            "requirements": [
                {
                    "requirement": r.metadata.get("title", "Maritime requirement"),
                    "regulation": r.metadata.get("source_convention", r.source),
                    "applicability": r.metadata.get("applicability", "Unknown"),
                    "type": r.metadata.get("requirement_type", "MANDATORY"),
                }
                for r in results[:5]
            ],
            "documents_needed": docs_needed[:10],
            "action_items": [],
            "risk_factors": [],
            "sources": list({r.metadata.get("source_document", r.source) for r in results}),
            "metadata": {"backend": "pgvector", "top_k": top_k},
        }

    def get_structured_port_requirements(
        self, port_code: str, vessel_type: str = "container"
    ) -> dict[str, Any]:
        port_results = self.search_by_port(port_code, vessel_type, top_k=10)
        required_docs = self.search_required_documents(port_code, vessel_type)
        regional_results = self.search_regional_requirements(
            port_code, {"vessel_type": vessel_type}, top_k=5
        )
        return {
            "port_code": port_code,
            "vessel_type": vessel_type,
            "summary": f"Found {len(port_results)} requirements for {port_code}",
            "requirements_by_category": {
                "port_specific": [r.content[:300] for r in port_results],
                "regional": [r.content[:300] for r in regional_results],
            },
            "required_documents": required_docs,
            "regional_requirements": [
                {"content": r.content[:300], "metadata": r.metadata} for r in regional_results
            ],
            "total_requirements": len(port_results),
        }

    def get_compliance_summary_for_route(
        self, port_codes: list[str], vessel_info: dict[str, Any]
    ) -> dict[str, Any]:
        route_requirements = self.search_by_route(port_codes, vessel_info, top_k_per_port=5)
        return {
            "route_ports": port_codes,
            "vessel_info": vessel_info,
            "port_summaries": {
                port: {"requirements_count": len(results)} for port, results in route_requirements.items()
            },
            "total_requirements_found": sum(len(results) for results in route_requirements.values()),
            "recommendations": [
                "Keep vessel certificates current for every port call.",
                "Prepare pre-arrival notifications according to each port's requirements.",
            ],
        }

    # ------------------------------------------------------------------
    # Uploaded document CRUD/search
    # ------------------------------------------------------------------

    def add_user_document(self, doc_id: str, text: str, metadata: dict[str, Any]) -> str:
        session = SessionLocal()
        try:
            row = UserDocument(
                id=doc_id,
                customer_id=int(metadata["customer_id"]),
                vessel_id=int(metadata["vessel_id"]) if metadata.get("vessel_id") else None,
                title=metadata.get("title", "Untitled"),
                document_type=metadata.get("document_type", "other"),
                file_path=metadata.get("file_path", ""),
                file_name=metadata.get("file_name"),
                file_size=int(metadata.get("file_size") or 0),
                mime_type=metadata.get("mime_type"),
                extracted_text=text or "",
                ocr_provider=metadata.get("ocr_provider"),
                ocr_confidence=float(metadata.get("ocr_confidence") or 0.0),
                issuing_authority=metadata.get("issuing_authority"),
                issue_date=metadata.get("issue_date") or "",
                expiry_date=metadata.get("expiry_date") or "",
                document_number=metadata.get("document_number"),
                is_validated=bool(metadata.get("is_validated", False)),
                validation_notes=metadata.get("validation_notes", ""),
                extracted_fields_json=metadata.get("extracted_fields_json", "{}"),
                embedding=None,
                embedding_model=self.embedding_model,
            )
            session.merge(row)
            session.commit()
            return doc_id
        except Exception:
            session.rollback()
            logger.exception("Failed to add user document %s", doc_id)
            raise
        finally:
            session.close()

    def get_user_document_by_id(self, doc_id: str) -> dict[str, Any] | None:
        session = SessionLocal()
        try:
            row = session.get(UserDocument, doc_id)
            return self._user_row_to_dict(row) if row else None
        finally:
            session.close()

    def get_user_documents(
        self, where_filter: dict[str, Any] | None = None, limit: int = 100
    ) -> list[dict[str, Any]]:
        session = SessionLocal()
        try:
            query = session.query(UserDocument)
            for key, value in (where_filter or {}).items():
                if hasattr(UserDocument, key):
                    query = query.filter(getattr(UserDocument, key) == value)
            rows = query.order_by(UserDocument.created_at.desc()).limit(limit).all()
            return [self._user_row_to_dict(row) for row in rows]
        finally:
            session.close()

    def delete_user_document(self, doc_id: str) -> bool:
        session = SessionLocal()
        try:
            row = session.get(UserDocument, doc_id)
            if not row:
                return False
            session.delete(row)
            session.commit()
            return True
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def update_user_document_metadata(self, doc_id: str, metadata_updates: dict[str, Any]) -> bool:
        session = SessionLocal()
        try:
            row = session.get(UserDocument, doc_id)
            if not row:
                return False
            mapping = {
                "title",
                "document_type",
                "file_path",
                "file_name",
                "file_size",
                "mime_type",
                "ocr_provider",
                "ocr_confidence",
                "issuing_authority",
                "issue_date",
                "expiry_date",
                "document_number",
                "is_validated",
                "validation_notes",
                "extracted_fields_json",
            }
            for key, value in metadata_updates.items():
                if key in mapping:
                    setattr(row, key, value)
            row.updated_at = datetime.now()
            session.commit()
            return True
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def count_user_documents(self, where_filter: dict[str, Any] | None = None) -> int:
        return len(self.get_user_documents(where_filter=where_filter, limit=1_000_000))

    def search_user_documents(
        self,
        query_text: str,
        where_filter: dict[str, Any] | None = None,
        n_results: int = 5,
        min_score: float = 0.0,
    ) -> list[dict[str, Any]]:
        docs = self.get_user_documents(where_filter=where_filter, limit=200)
        scored = []
        for doc in docs:
            score = self._lexical_score(query_text, doc.get("text", ""), doc)
            if score >= min_score:
                doc["score"] = score
                scored.append(doc)
        scored.sort(key=lambda item: item.get("score", 0), reverse=True)
        return scored[:n_results]

    def match_required_document(
        self,
        required_doc_type: str,
        where_filter: dict[str, Any] | None = None,
        min_score: float = 0.35,
    ) -> dict[str, Any] | None:
        matches = self.search_user_documents(
            query_text=required_doc_type,
            where_filter=where_filter,
            n_results=1,
            min_score=min_score,
        )
        return matches[0] if matches else None

    def match_documents_against_requirements(
        self,
        required_doc_types: list[str],
        where_filter: dict[str, Any] | None = None,
        min_score: float = 0.35,
    ) -> dict[str, dict[str, Any]]:
        return {
            doc_type: {
                "required": True,
                "match": self.match_required_document(doc_type, where_filter, min_score),
            }
            for doc_type in required_doc_types
        }


@lru_cache(maxsize=1)
def get_maritime_knowledge_base() -> MaritimeKnowledgeBase:
    """Get or create the maritime knowledge base singleton."""
    return MaritimeKnowledgeBase()
