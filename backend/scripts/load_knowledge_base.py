"""
Script to load documents into the Maritime Knowledge Base

Usage:
    python scripts/load_knowledge_base.py

This script loads PDF, DOCX, and TXT files from the data/maritime_regulations directory
into the ChromaDB vector store using Gemini embeddings.
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import logging
from pathlib import Path
from typing import List, Dict, Any

from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

from shared.config import get_settings
from modules.maritime.maritime_knowledge_base import get_maritime_knowledge_base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Collection mapping based on file path or filename keywords
COLLECTION_KEYWORDS = {
    "imo_conventions": ["solas", "marpol", "stcw", "ism", "isps", "load_line", "tonnage", "imo", "convention"],
    "psc_requirements": ["psc", "port_state_control", "detention", "inspection"],
    "port_regulations": ["port", "harbor", "terminal", "berth", "pilot"],
    "regional_requirements": ["eu_mrv", "eca", "seca", "emission", "regional", "uscg", "us_cfr"],
    "customs_documentation": ["customs", "clearance", "manifest", "declaration", "immigration"],
}


def detect_collection(file_path: str, content: str = "") -> str:
    """Detect which collection a document belongs to based on filename and content."""
    file_lower = file_path.lower()
    content_lower = content.lower()[:2000]  # Check first 2000 chars

    for collection, keywords in COLLECTION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in file_lower or keyword in content_lower:
                return collection

    # Default to imo_conventions
    return "imo_conventions"


def extract_metadata(file_path: str, content: str) -> Dict[str, Any]:
    """Extract metadata from document content."""
    metadata = {
        "source_file": os.path.basename(file_path),
        "file_path": file_path,
    }

    # Try to extract document type from content
    content_lower = content.lower()

    if "solas" in content_lower:
        metadata["source_convention"] = "SOLAS"
    elif "marpol" in content_lower:
        metadata["source_convention"] = "MARPOL"
    elif "stcw" in content_lower:
        metadata["source_convention"] = "STCW"
    elif "ism" in content_lower or "safety management" in content_lower:
        metadata["source_convention"] = "ISM Code"
    elif "isps" in content_lower or "security" in content_lower:
        metadata["source_convention"] = "ISPS Code"

    # Extract required documents if mentioned
    required_docs = []
    doc_keywords = [
        "safety management certificate",
        "safety construction certificate",
        "safety equipment certificate",
        "load line certificate",
        "tonnage certificate",
        "iopp certificate",
        "isps certificate",
        "registry certificate",
    ]

    for doc in doc_keywords:
        if doc in content_lower:
            required_docs.append(doc.replace(" ", "_"))

    if required_docs:
        metadata["required_documents"] = json.dumps(required_docs)

    return metadata


def load_pdf(file_path: str) -> List[Document]:
    """Load a PDF file."""
    try:
        loader = PyPDFLoader(file_path)
        return loader.load()
    except Exception as e:
        logger.error(f"Error loading PDF {file_path}: {e}")
        return []


def load_text(file_path: str) -> List[Document]:
    """Load a text file."""
    try:
        loader = TextLoader(file_path, encoding='utf-8')
        return loader.load()
    except Exception as e:
        logger.error(f"Error loading text file {file_path}: {e}")
        return []


def load_documents_from_directory(directory: str) -> Dict[str, List[Document]]:
    """Load all documents from a directory, organized by collection."""
    documents_by_collection: Dict[str, List[Document]] = {
        "imo_conventions": [],
        "psc_requirements": [],
        "port_regulations": [],
        "regional_requirements": [],
        "customs_documentation": [],
    }

    # Text splitter for chunking
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )

    path = Path(directory)
    if not path.exists():
        logger.warning(f"Directory does not exist: {directory}")
        return documents_by_collection

    # Find all supported files
    supported_extensions = ['.pdf', '.txt', '.md']
    files = []
    for ext in supported_extensions:
        files.extend(path.rglob(f'*{ext}'))

    logger.info(f"Found {len(files)} files to process")

    for file_path in files:
        file_str = str(file_path)
        logger.info(f"Processing: {file_path.name}")

        # Load based on file type
        if file_path.suffix.lower() == '.pdf':
            docs = load_pdf(file_str)
        else:
            docs = load_text(file_str)

        if not docs:
            continue

        # Combine content for metadata extraction
        full_content = " ".join([d.page_content for d in docs])

        # Detect collection
        collection = detect_collection(file_str, full_content)

        # Extract metadata
        base_metadata = extract_metadata(file_str, full_content)

        # Split into chunks
        chunks = text_splitter.split_documents(docs)

        # Add metadata to each chunk
        for chunk in chunks:
            chunk.metadata.update(base_metadata)

        documents_by_collection[collection].extend(chunks)
        logger.info(f"  -> Added {len(chunks)} chunks to {collection}")

    return documents_by_collection


def load_from_json(json_file: str) -> Dict[str, List[Document]]:
    """Load documents from a JSON file.

    Expected JSON format:
    [
        {
            "collection": "imo_conventions",
            "content": "Document text...",
            "metadata": {
                "source_convention": "SOLAS",
                "chapter": "II-2",
                "regulation": "10"
            }
        }
    ]
    """
    documents_by_collection: Dict[str, List[Document]] = {
        "imo_conventions": [],
        "psc_requirements": [],
        "port_regulations": [],
        "regional_requirements": [],
        "customs_documentation": [],
    }

    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for item in data:
            collection = item.get("collection", "imo_conventions")
            content = item.get("content", "")
            metadata = item.get("metadata", {})

            if collection in documents_by_collection and content:
                doc = Document(page_content=content, metadata=metadata)
                documents_by_collection[collection].append(doc)

        logger.info(f"Loaded {sum(len(docs) for docs in documents_by_collection.values())} documents from JSON")

    except Exception as e:
        logger.error(f"Error loading JSON file: {e}")

    return documents_by_collection


def main():
    """Main function to load documents into the knowledge base."""
    logger.info("=" * 60)
    logger.info("Maritime Knowledge Base Loader")
    logger.info("=" * 60)

    # Initialize knowledge base
    logger.info("Initializing knowledge base...")
    kb = get_maritime_knowledge_base()

    if kb.embeddings is None:
        logger.error("Embeddings not initialized. Check your Google API key.")
        return

    # Show current stats
    stats = kb.get_collection_stats()
    logger.info(f"Current collection stats: {stats}")

    # Load documents from directory
    regulations_dir = "./data/maritime_regulations"
    logger.info(f"\nLoading documents from: {regulations_dir}")

    documents_by_collection = load_documents_from_directory(regulations_dir)

    # Also check for a JSON file
    json_file = os.path.join(regulations_dir, "regulations.json")
    if os.path.exists(json_file):
        logger.info(f"\nLoading documents from JSON: {json_file}")
        json_docs = load_from_json(json_file)
        for collection, docs in json_docs.items():
            documents_by_collection[collection].extend(docs)

    # Add documents to collections
    total_added = 0
    for collection_name, documents in documents_by_collection.items():
        if documents:
            logger.info(f"\nAdding {len(documents)} documents to {collection_name}...")
            count = kb.add_documents(collection_name, documents)
            total_added += count
            logger.info(f"  Added {count} documents")

    # Show final stats
    logger.info("\n" + "=" * 60)
    logger.info("Loading complete!")
    final_stats = kb.get_collection_stats()
    logger.info(f"Final collection stats: {final_stats}")
    logger.info(f"Total documents added: {total_added}")


if __name__ == "__main__":
    main()
