"""Cross-cutting observability + safety primitives.

Modules:
- ``security_headers``: ASGI middleware that sets CSP/HSTS/etc.
- ``pii_filter``: Logging filter that redacts PII from log records.
- ``llm_ledger``: Helper for recording LLM calls (B7.6).
"""
