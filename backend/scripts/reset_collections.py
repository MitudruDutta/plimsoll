"""Reset pgvector-backed knowledge collections.

This development utility clears rows from ``knowledge_documents``. User-uploaded
documents are left untouched unless ``--include-user-documents`` is passed.
"""

from __future__ import annotations

import argparse
import logging

from shared.database.database import SessionLocal
from shared.database.models import KnowledgeDocument, UserDocument

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset pgvector knowledge collections")
    parser.add_argument(
        "--include-user-documents",
        action="store_true",
        help="Also delete uploaded user document metadata and OCR text.",
    )
    args = parser.parse_args()

    session = SessionLocal()
    try:
        deleted_kb = session.query(KnowledgeDocument).delete()
        deleted_user_docs = 0
        if args.include_user_documents:
            deleted_user_docs = session.query(UserDocument).delete()
        session.commit()
        logger.info("Deleted %s knowledge documents", deleted_kb)
        if args.include_user_documents:
            logger.info("Deleted %s user documents", deleted_user_docs)
    except Exception:
        session.rollback()
        logger.exception("Reset failed")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
