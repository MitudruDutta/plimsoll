"""Local sentence embeddings via fastembed (ONNX-backed, no torch).

Default model is ``BAAI/bge-base-en-v1.5`` (768-dim, matches the pgvector
column width). The model is downloaded on first use and cached under
``~/.cache/fastembed`` (or ``FASTEMBED_CACHE_PATH``).

Loaded lazily so import-time cost stays low for code paths that do not need
embeddings (e.g. the FastAPI app boot, tests, ``--help``).
"""

from __future__ import annotations

import logging
import threading
from typing import Iterable

from shared.config import get_settings

logger = logging.getLogger(__name__)


try:
    from fastembed import TextEmbedding  # type: ignore

    HAS_FASTEMBED = True
except ImportError:  # pragma: no cover - optional dep in slim images
    TextEmbedding = None  # type: ignore[assignment]
    HAS_FASTEMBED = False


_lock = threading.Lock()
_cached: "LocalEmbedder | None" = None


class LocalEmbedder:
    """Thin wrapper around ``fastembed.TextEmbedding``.

    Holds the loaded model and exposes ``embed_documents`` / ``embed_query``
    in shapes that match the LangChain embeddings interface, so swapping
    providers later (or feeding it into LangChain pipelines) is trivial.
    """

    def __init__(self, model_name: str) -> None:
        if not HAS_FASTEMBED:
            raise RuntimeError(
                "fastembed is not installed. Add it to the runtime image or run "
                "`uv pip install fastembed` before using local embeddings."
            )
        logger.info("Loading local embedding model: %s", model_name)
        self.model_name = model_name
        self._model = TextEmbedding(model_name=model_name)

    def embed_documents(self, texts: Iterable[str]) -> list[list[float]]:
        cleaned = [t for t in texts if t and t.strip()]
        if not cleaned:
            return []
        return [list(map(float, vec)) for vec in self._model.embed(cleaned)]

    def embed_query(self, text: str) -> list[float]:
        if not text or not text.strip():
            return []
        return list(map(float, next(self._model.query_embed([text]))))


def is_available() -> bool:
    return HAS_FASTEMBED


def get_embedder() -> LocalEmbedder | None:
    """Return a singleton ``LocalEmbedder`` or ``None`` if unavailable.

    Returning ``None`` (vs raising) lets callers degrade to lexical-only
    ranking when fastembed is missing — matches the existing behaviour of
    ``MaritimeKnowledgeBase``.
    """
    global _cached
    if _cached is not None:
        return _cached
    if not HAS_FASTEMBED:
        return None
    with _lock:
        if _cached is not None:
            return _cached
        try:
            _cached = LocalEmbedder(get_settings().embedding_model)
        except Exception as exc:  # pragma: no cover - first-load failures
            logger.warning("Local embedder init failed (%s); disabling", exc)
            return None
        return _cached


def embed_texts(texts: Iterable[str]) -> list[list[float]]:
    embedder = get_embedder()
    if embedder is None:
        return []
    return embedder.embed_documents(texts)


def embed_query(text: str) -> list[float]:
    embedder = get_embedder()
    if embedder is None:
        return []
    return embedder.embed_query(text)
