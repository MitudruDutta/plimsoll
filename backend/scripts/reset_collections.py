#!/usr/bin/env python
"""
Reset ChromaDB collections to fix embedding dimension mismatch.

The collections were created with 768-dimension embeddings but we now use
gemini-embedding-001 which produces 3072-dimension embeddings.

This script deletes all existing collections so they can be recreated with
the correct embedding dimensions.

Run: python scripts/reset_collections.py
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
import chromadb
from chromadb.config import Settings as ChromaSettings
from shared.config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

# Collection names to reset
COLLECTIONS = [
    "imo_conventions",
    "psc_requirements",
    "port_regulations",
    "regional_requirements",
    "customs_documentation"
]


def main():
    """Delete all collections to allow recreation with correct embedding dimensions."""
    logger.info("=" * 60)
    logger.info("ChromaDB Collection Reset Tool")
    logger.info("=" * 60)
    logger.info("\nThis will DELETE all existing collections to fix the embedding")
    logger.info("dimension mismatch (768 -> 3072 for gemini-embedding-001).")
    logger.info("")

    # Confirm
    response = input("Are you sure you want to delete all collections? (yes/no): ")
    if response.lower() != "yes":
        logger.info("Aborted.")
        return

    # Connect to ChromaDB Cloud
    logger.info("\nConnecting to ChromaDB Cloud...")

    client = chromadb.HttpClient(
        host="api.trychroma.com",
        ssl=True,
        headers={
            "Authorization": f"Bearer {settings.chroma_api_key}",
            "x-chroma-tenant": settings.chroma_tenant,
            "x-chroma-database": settings.chroma_database,
        }
    )

    # List existing collections
    logger.info("\nExisting collections:")
    existing = client.list_collections()
    for coll in existing:
        logger.info(f"  - {coll.name} (id: {coll.id})")

    # Delete each collection
    logger.info("\nDeleting collections...")
    deleted_count = 0

    for coll_name in COLLECTIONS:
        try:
            client.delete_collection(name=coll_name)
            logger.info(f"  Deleted: {coll_name}")
            deleted_count += 1
        except Exception as e:
            logger.warning(f"  Could not delete {coll_name}: {e}")

    logger.info(f"\nDeleted {deleted_count} collections.")

    # Verify
    logger.info("\nRemaining collections:")
    remaining = client.list_collections()
    if remaining:
        for coll in remaining:
            logger.info(f"  - {coll.name}")
    else:
        logger.info("  (none)")

    logger.info("\n" + "=" * 60)
    logger.info("Reset complete!")
    logger.info("")
    logger.info("Next steps:")
    logger.info("  1. Run: python scripts/load_port_data.py")
    logger.info("  2. Run: python scripts/load_maritime_regulations.py")
    logger.info("  3. Run: python scripts/test_knowledge_base_queries.py")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
