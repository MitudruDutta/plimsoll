#!/usr/bin/env python
"""
Test script for Maritime Knowledge Base Queries

This script tests various query scenarios to verify the knowledge base
is properly loaded and returns relevant results.

Run: python scripts/test_knowledge_base_queries.py
"""

import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging

from modules.maritime.maritime_knowledge_base import SearchResult, get_maritime_knowledge_base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def print_results(results: list[SearchResult], max_content_length: int = 300):
    """Pretty print search results."""
    if not results:
        print("  No results found.")
        return

    for i, result in enumerate(results, 1):
        print(f"\n  Result {i}:")
        print(f"    Source: {result.source}")
        print(f"    Score: {result.score:.4f}")
        if result.metadata:
            # Print key metadata fields
            if "convention" in result.metadata:
                print(f"    Convention: {result.metadata.get('convention')}")
            if "chapter" in result.metadata:
                print(f"    Chapter: {result.metadata.get('chapter')}")
            if "annex" in result.metadata:
                print(f"    Annex: {result.metadata.get('annex')}")
            if "requirement_name" in result.metadata:
                print(f"    Requirement: {result.metadata.get('requirement_name')}")
            if "psc_regime" in result.metadata:
                print(f"    PSC Regime: {result.metadata.get('psc_regime')}")
        content_preview = result.content[:max_content_length].replace("\n", " ")
        if len(result.content) > max_content_length:
            content_preview += "..."
        print(f"    Content: {content_preview}")


def test_query(kb, query: str, collections: list[str] | None = None, top_k: int = 3):
    """Run a test query and print results."""
    print(f"\n{'=' * 70}")
    print(f'Query: "{query}"')
    if collections:
        print(f"Collections: {collections}")
    print("-" * 70)

    results = kb.search_general(query, top_k=top_k, collections=collections)
    print_results(results)
    return results


def main():
    """Run test queries against the knowledge base."""
    logger.info("=" * 70)
    logger.info("Maritime Knowledge Base Query Tests")
    logger.info("=" * 70)

    # Initialize knowledge base
    logger.info("\nInitializing knowledge base...")
    kb = get_maritime_knowledge_base()

    if kb.embeddings is None:
        logger.error("Embeddings not initialized. Check your Google API key.")
        return

    # Show current stats
    print("\nCollection Statistics:")
    stats = kb.get_collection_stats()
    for name, count in stats.items():
        print(f"  {name}: {count} documents")

    # Test queries for IMO Conventions
    print("\n" + "=" * 70)
    print("TESTING IMO CONVENTIONS QUERIES")
    print("=" * 70)

    test_query(kb, "What are SOLAS fire safety requirements?", collections=["imo_conventions"])

    test_query(
        kb, "ISM Code Document of Compliance DOC requirements", collections=["imo_conventions"]
    )

    test_query(
        kb, "MARPOL Annex VI sulphur limits emission control areas", collections=["imo_conventions"]
    )

    test_query(kb, "ISPS Code ship security plan requirements", collections=["imo_conventions"])

    test_query(kb, "ballast water management D-2 standard", collections=["imo_conventions"])

    # Test queries for PSC Requirements
    print("\n" + "=" * 70)
    print("TESTING PORT STATE CONTROL QUERIES")
    print("=" * 70)

    test_query(
        kb, "Paris MOU inspection targeting ship risk profile", collections=["psc_requirements"]
    )

    test_query(kb, "USCG QUALSHIP 21 program requirements", collections=["psc_requirements"])

    test_query(
        kb, "What certificates are checked during PSC inspection?", collections=["psc_requirements"]
    )

    test_query(kb, "Tokyo MOU black grey white list", collections=["psc_requirements"])

    # Test queries for Regional Requirements
    print("\n" + "=" * 70)
    print("TESTING REGIONAL REQUIREMENTS QUERIES")
    print("=" * 70)

    test_query(
        kb,
        "EU MRV monitoring reporting verification emissions 2024",
        collections=["regional_requirements"],
    )

    test_query(
        kb, "EU ETS maritime emissions trading allowances", collections=["regional_requirements"]
    )

    test_query(kb, "FuelEU Maritime GHG intensity limits", collections=["regional_requirements"])

    test_query(
        kb,
        "ECA SECA sulphur emission control areas Baltic North Sea",
        collections=["regional_requirements"],
    )

    test_query(
        kb, "Mediterranean Sea emission control area 2025", collections=["regional_requirements"]
    )

    # Test queries for Customs Documentation
    print("\n" + "=" * 70)
    print("TESTING CUSTOMS DOCUMENTATION QUERIES")
    print("=" * 70)

    test_query(
        kb, "US Notice of Arrival 96 hour requirement", collections=["customs_documentation"]
    )

    test_query(kb, "FAL forms required for port arrival", collections=["customs_documentation"])

    test_query(
        kb, "complete list certificates required cargo ships", collections=["customs_documentation"]
    )

    test_query(kb, "pre-arrival notification requirements", collections=["customs_documentation"])

    # Cross-collection queries
    print("\n" + "=" * 70)
    print("TESTING CROSS-COLLECTION QUERIES")
    print("=" * 70)

    test_query(kb, "What documents do I need for Singapore port call?", top_k=5)

    test_query(kb, "Oil tanker Rotterdam emission requirements", top_k=5)

    test_query(kb, "Container ship safety certificates EU ports", top_k=5)

    # Test port-specific search
    print("\n" + "=" * 70)
    print("TESTING PORT-SPECIFIC SEARCH")
    print("=" * 70)

    print("\nSearching for Singapore (SGSIN) requirements...")
    port_results = kb.search_by_port("SGSIN", vessel_type="container", top_k=5)
    print_results(port_results)

    print("\nSearching for Rotterdam (NLRTM) requirements...")
    port_results = kb.search_by_port("NLRTM", vessel_type="tanker", top_k=5)
    print_results(port_results)

    # Test route search
    print("\n" + "=" * 70)
    print("TESTING ROUTE SEARCH")
    print("=" * 70)

    vessel_info = {"vessel_type": "container", "gross_tonnage": 50000, "flag_state": "Panama"}
    route_ports = ["SGSIN", "NLRTM", "DEHAM"]

    print(f"\nSearching for route: {' -> '.join(route_ports)}")
    print(f"Vessel: {vessel_info}")

    route_results = kb.search_by_route(route_ports, vessel_info, top_k_per_port=3)
    for port, results in route_results.items():
        print(f"\n  Port: {port}")
        print(f"  Results: {len(results)}")
        for r in results[:2]:  # Show top 2 per port
            print(f"    - {r.source}: {r.content[:100]}...")

    # Test required documents search
    print("\n" + "=" * 70)
    print("TESTING REQUIRED DOCUMENTS SEARCH")
    print("=" * 70)

    print("\nSearching for required documents for container ship at Singapore...")
    req_docs = kb.search_required_documents("SGSIN", "container")
    if req_docs:
        for doc in req_docs[:10]:
            print(f"  - {doc.get('document_type')}: {doc.get('regulation_source')}")
    else:
        print(
            "  No specific document requirements found (this is expected if port_regulations collection is empty)"
        )

    print("\n" + "=" * 70)
    print("TEST COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
