"""PII redaction for logging.

A logging filter that scrubs likely-PII tokens from log records before they
reach a handler. Pattern set covers:

- Bearer tokens / JWTs (3-segment base64url)
- Email addresses
- Common IMO / MMSI numbers (kept *partially* visible because they're
  operationally useful — last 3 digits remain)
- 16-digit numeric runs (credit-card-like)
- API key prefixes we know about (``sk-``, ``rk_``, ``AIza``, ``ghp_``, etc.)

Limitations
-----------
This is a defense-in-depth layer, not a substitute for not-logging-secrets.
It is regex-based, so it will both miss things and occasionally over-redact.
Keep structured logging discipline: prefer logging IDs and short codes over
free-form strings that could contain user data.
"""
from __future__ import annotations

import logging
import re
from typing import Iterable, Pattern

# Each entry is (regex, replacement). Replacement may use backreferences.
_PII_RULES: list[tuple[Pattern[str], str]] = [
    (re.compile(r"Bearer\s+[A-Za-z0-9._\-]+", re.IGNORECASE), "Bearer ***"),
    (re.compile(r"eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}"), "***JWT***"),
    (re.compile(r"\b(sk|rk|pk)_[A-Za-z0-9]{16,}\b"), "***SECRET***"),
    (re.compile(r"\b(AIza|ghp_|gho_|ghu_)[A-Za-z0-9_\-]{20,}\b"), "***SECRET***"),
    (
        re.compile(r"\b([A-Za-z0-9._%+\-]{1,32})@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"),
        r"\1@***",
    ),
    (re.compile(r"\bIMO[\s:]*?(\d{4})(\d{3})\b", re.IGNORECASE), r"IMO \1***"),
    (re.compile(r"\bMMSI[\s:]*?(\d{6})(\d{3})\b", re.IGNORECASE), r"MMSI \1***"),
    (re.compile(r"\b\d{12,19}\b"), "***CARD***"),
    (re.compile(r"(?i)(api[_\s\-]?key|password|secret|token)\s*[=:]\s*[^\s,;\"\']+"), r"\1=***"),
]


def _redact(value: str) -> str:
    redacted = value
    for pattern, replacement in _PII_RULES:
        redacted = pattern.sub(replacement, redacted)
    return redacted


def redact(value: str) -> str:
    """Public helper to redact a single string. Useful for tests + tools."""
    return _redact(value)


class PIIRedactor(logging.Filter):
    """Redact PII from log record messages and string args.

    The filter mutates the record so the redacted output is what handlers
    (stdout, Sentry, etc.) actually see.
    """

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: D401 - logging API
        try:
            if isinstance(record.msg, str):
                record.msg = _redact(record.msg)
            if record.args:
                if isinstance(record.args, dict):
                    record.args = {k: _redact_arg(v) for k, v in record.args.items()}
                else:
                    record.args = tuple(_redact_arg(arg) for arg in record.args)
        except Exception:  # pragma: no cover - never let logging crash the app
            pass
        return True


def _redact_arg(value: object) -> object:
    if isinstance(value, str):
        return _redact(value)
    return value


def install_pii_redaction(loggers: Iterable[str] | None = None) -> None:
    """Attach the redactor to root + named loggers (idempotent)."""
    targets = ["", *(loggers or [])]
    for name in targets:
        logger = logging.getLogger(name)
        if not any(isinstance(f, PIIRedactor) for f in logger.filters):
            logger.addFilter(PIIRedactor())
