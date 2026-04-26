"""LLM cost ledger helpers.

Usage::

    from shared.observability.llm_ledger import record_llm_call, ledger_span

    # 1. Direct record (when you already have token counts):
    record_llm_call(
        surface="compliance",
        provider="google",
        model="gemini-2.0-flash",
        operation="chat",
        prompt_tokens=812,
        completion_tokens=315,
        latency_ms=1241,
        customer_id=customer.id,
    )

    # 2. Context-manager span (records latency + status automatically):
    with ledger_span(
        surface="hedge",
        provider="openai",
        model="gpt-4o-mini",
        operation="chat",
    ) as span:
        response = client.chat.completions.create(...)
        span.tokens(prompt=response.usage.prompt_tokens,
                    completion=response.usage.completion_tokens)

The ledger is best-effort: a failure to write the row never propagates to
the caller. The motto is "don't let observability take down a request".
"""
from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Iterator, Optional

from shared.database.database import SessionLocal

logger = logging.getLogger(__name__)


# Indicative public-list pricing in USD per 1M tokens (input / output).
# Do not treat as ground truth for billing; use vendor invoices for that.
# Update via env-driven config (TODO: settings.LLM_PRICING_OVERRIDES_JSON).
_PRICING_USD_PER_M_TOKENS: dict[str, tuple[float, float]] = {
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4o": (2.50, 10.00),
    "gpt-4.1": (2.00, 8.00),
    "gpt-4.1-mini": (0.40, 1.60),
    "gemini-2.0-flash": (0.10, 0.40),
    "gemini-2.0-pro": (1.25, 5.00),
    "gemini-3-flash-preview": (0.30, 1.20),
    "claude-3-5-sonnet": (3.00, 15.00),
    "claude-3-5-haiku": (0.80, 4.00),
    "text-embedding-3-small": (0.02, 0.0),
    "text-embedding-3-large": (0.13, 0.0),
}


def estimate_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Return a best-effort cost estimate in USD. Falls back to 0.0 if unknown."""
    if not model:
        return 0.0
    key = model.lower()
    if key.startswith("gemini/"):
        key = key.split("/", 1)[1]
    pricing = _PRICING_USD_PER_M_TOKENS.get(key)
    if not pricing:
        for known, value in _PRICING_USD_PER_M_TOKENS.items():
            if key.startswith(known):
                pricing = value
                break
    if not pricing:
        return 0.0
    in_rate, out_rate = pricing
    return (prompt_tokens / 1_000_000) * in_rate + (completion_tokens / 1_000_000) * out_rate


def record_llm_call(
    *,
    surface: str,
    provider: str,
    model: str,
    operation: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    latency_ms: int = 0,
    status: str = "ok",
    error_code: Optional[str] = None,
    customer_id: Optional[int] = None,
    trace_id: Optional[str] = None,
    cost_usd: Optional[float] = None,
) -> None:
    """Insert a single row into ``llm_calls``. Errors are swallowed."""
    from shared.database.models import LLMCall

    total_tokens = prompt_tokens + completion_tokens
    if cost_usd is None:
        cost_usd = estimate_cost_usd(model, prompt_tokens, completion_tokens)

    session = SessionLocal()
    try:
        row = LLMCall(
            customer_id=customer_id,
            trace_id=trace_id,
            surface=surface,
            provider=provider,
            model=model,
            operation=operation,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost_usd=cost_usd,
            status=status,
            error_code=error_code,
            latency_ms=latency_ms,
        )
        session.add(row)
        session.commit()
    except Exception as exc:
        logger.warning("LLM ledger write failed: %s", exc)
        try:
            session.rollback()
        except Exception:
            pass
    finally:
        session.close()


@dataclass
class _LedgerSpan:
    """Mutable span that the context manager hands to the caller."""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost_usd: Optional[float] = None
    extra: dict[str, Any] = field(default_factory=dict)

    def tokens(self, *, prompt: int = 0, completion: int = 0) -> None:
        self.prompt_tokens = prompt
        self.completion_tokens = completion

    def set_cost(self, cost_usd: float) -> None:
        self.cost_usd = cost_usd


@contextmanager
def ledger_span(
    *,
    surface: str,
    provider: str,
    model: str,
    operation: str,
    customer_id: Optional[int] = None,
    trace_id: Optional[str] = None,
) -> Iterator[_LedgerSpan]:
    """Time + record a block of LLM work. The span is always recorded,
    including on exception (with status='error' and error_code set)."""
    span = _LedgerSpan()
    start = time.perf_counter()
    status = "ok"
    error_code: Optional[str] = None
    try:
        yield span
    except Exception as exc:
        status = "error"
        error_code = type(exc).__name__
        raise
    finally:
        latency_ms = int((time.perf_counter() - start) * 1000)
        record_llm_call(
            surface=surface,
            provider=provider,
            model=model,
            operation=operation,
            prompt_tokens=span.prompt_tokens,
            completion_tokens=span.completion_tokens,
            latency_ms=latency_ms,
            status=status,
            error_code=error_code,
            customer_id=customer_id,
            trace_id=trace_id,
            cost_usd=span.cost_usd,
        )
