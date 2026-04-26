"""Upload helpers for bounded reads.

FastAPI's ``UploadFile.read()`` will read the whole remaining stream when no
size is supplied. Request handlers should use these helpers for legacy
multipart upload paths so oversized files are rejected while streaming.
"""

from __future__ import annotations

from fastapi import UploadFile

DEFAULT_UPLOAD_CHUNK_SIZE = 1024 * 1024


class UploadTooLargeError(ValueError):
    """Raised when a streaming upload exceeds the configured byte limit."""

    def __init__(self, *, max_bytes: int, total_bytes: int) -> None:
        self.max_bytes = max_bytes
        self.total_bytes = total_bytes
        super().__init__(f"File too large. Maximum size is {max_bytes} bytes")


async def read_upload_limited(
    file: UploadFile,
    *,
    max_bytes: int,
    chunk_size: int = DEFAULT_UPLOAD_CHUNK_SIZE,
) -> bytes:
    """Read an upload in chunks and fail once it crosses ``max_bytes``."""
    if max_bytes <= 0:
        raise ValueError("max_bytes must be greater than zero")
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")

    chunks: list[bytes] = []
    total = 0

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise UploadTooLargeError(max_bytes=max_bytes, total_bytes=total)
        chunks.append(chunk)

    return b"".join(chunks)
