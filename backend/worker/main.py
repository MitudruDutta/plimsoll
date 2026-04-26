"""Plimsoll background worker entrypoint.

The PRD moves OCR, CrewAI, reports, and visual-risk batch work out of HTTP
handlers. This module is the runnable container boundary for that migration.
Queue consumers will be added behind QUEUE_BACKEND as pgmq/arq lands.
"""

from __future__ import annotations

import asyncio
import logging
import signal

from shared.config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Worker:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._stop = asyncio.Event()

    def stop(self) -> None:
        self._stop.set()

    async def run(self) -> None:
        logger.info(
            "Worker starting",
            extra={
                "queue_backend": self.settings.queue_backend,
                "redis_configured": bool(self.settings.redis_url),
                "kb_backend": self.settings.kb_backend,
                "upload_backend": self.settings.upload_backend,
            },
        )

        if self.settings.queue_backend == "none":
            logger.warning("QUEUE_BACKEND=none; worker is idle.")

        while not self._stop.is_set():
            await asyncio.sleep(1)

        logger.info("Worker stopped")


async def _amain() -> None:
    worker = Worker()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, worker.stop)
    await worker.run()


def main() -> None:
    asyncio.run(_amain())


if __name__ == "__main__":
    main()
