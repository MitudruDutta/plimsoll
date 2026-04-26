import asyncio

import pytest

from shared.uploads import UploadTooLargeError, read_upload_limited


class FakeUpload:
    def __init__(self, data: bytes) -> None:
        self._data = data
        self._offset = 0

    async def read(self, size: int = -1) -> bytes:
        if self._offset >= len(self._data):
            return b""
        if size < 0:
            size = len(self._data) - self._offset
        end = min(self._offset + size, len(self._data))
        chunk = self._data[self._offset : end]
        self._offset = end
        return chunk


def test_read_upload_limited_reads_in_chunks():
    data = b"abc" * 5

    result = asyncio.run(read_upload_limited(FakeUpload(data), max_bytes=len(data), chunk_size=4))

    assert result == data


def test_read_upload_limited_rejects_oversized_stream():
    data = b"0123456789"

    with pytest.raises(UploadTooLargeError) as exc_info:
        asyncio.run(read_upload_limited(FakeUpload(data), max_bytes=6, chunk_size=4))

    assert exc_info.value.max_bytes == 6
    assert exc_info.value.total_bytes == 8
