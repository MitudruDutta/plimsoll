"""Smoke test for the maritime compliance pipeline.

Exercises the knowledge base and ``ComplianceService`` end-to-end against
whatever data is on the local box. This is *not* a unit test; it is a
manual repro tool. Run with::

    python -m scripts.test_compliance_check

Expectations:
- Local DB exists (SQLite is fine).
- Maritime knowledge base has been ingested (see ``load_maritime_regulations.py``).
- A test customer + vessel exists or will be created.

The script fails fast if the schema drifts: it only relies on attributes
that ``compliance_service.PortComplianceResult`` and
``RouteComplianceResult`` actually define.
"""
from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime

from sqlalchemy.orm import Session

from modules.maritime.compliance_service import ComplianceService
from modules.maritime.document_service import DocumentService
from modules.maritime.maritime_knowledge_base import get_maritime_knowledge_base
from shared.database.database import Base, SessionLocal, engine
from shared.database.models import Customer, Vessel, VesselType


def setup_test_data(db: Session) -> Vessel:
    """Create a stable test customer + vessel if missing."""
    customer = db.query(Customer).filter(Customer.name == "Test Shipping Co").first()
    if not customer:
        customer = Customer(
            name="Test Shipping Co",
            email="test@shipping.example",
            phone="000-000-0000",
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        print(f"Created test customer: {customer.name} (ID: {customer.id})")

    vessel = db.query(Vessel).filter(Vessel.imo_number == "9876543").first()
    if not vessel:
        vessel = Vessel(
            customer_id=customer.id,
            name="MV Test Explorer",
            imo_number="9876543",
            mmsi="123456789",
            call_sign="TXPL",
            vessel_type=VesselType.CONTAINER,
            flag_state="Panama",
            gross_tonnage=45000.0,
            dwt=52000.0,
            year_built=2018,
        )
        db.add(vessel)
        db.commit()
        db.refresh(vessel)
        print(f"Created test vessel: {vessel.name} (ID: {vessel.id})")
    else:
        print(f"Using existing vessel: {vessel.name} (ID: {vessel.id})")

    doc_service = DocumentService()
    existing_docs = doc_service.get_vessel_documents(vessel.id)
    print(f"Vessel has {len(existing_docs)} uploaded documents in the document store")
    if not existing_docs:
        print("Upload documents through the API/UI before expecting a compliant result.")
    return vessel


async def test_knowledge_base_search() -> None:
    print("\n" + "=" * 70)
    print("TEST 1: Maritime Knowledge Base Search")
    print("=" * 70)

    kb = get_maritime_knowledge_base()
    if getattr(kb, "mock_mode", False):
        print("\n[!] Knowledge Base is running in MOCK MODE")
        print("    (langchain/chromadb dependencies may not be installed)")

    stats = kb.get_collection_stats()
    print("\nCollection Statistics:")
    for name, count in stats.items():
        print(f"  - {name}: {count} documents")

    print("\nSearching for 'SOLAS fire safety requirements'...")
    results = kb.search_general("SOLAS fire safety requirements", top_k=3)

    print(f"\nFound {len(results)} results:")
    for i, result in enumerate(results, 1):
        print(f"\n  Result {i}:")
        print(f"    Source: {result.source}")
        print(f"    Score: {result.score:.3f}")
        print(f"    Content: {result.content[:150]}...")
        if result.metadata:
            print(f"    Metadata: {result.metadata}")


async def test_port_requirements() -> None:
    print("\n" + "=" * 70)
    print("TEST 2: Port Requirements Search")
    print("=" * 70)

    kb = get_maritime_knowledge_base()
    print("\nSearching requirements for Rotterdam (NLRTM)...")
    results = kb.search_by_port("NLRTM", vessel_type="container", top_k=5)

    print(f"\nFound {len(results)} regulations for Rotterdam:")
    for i, result in enumerate(results, 1):
        print(f"\n  {i}. [{result.source}] (score: {result.score:.2f})")
        print(f"     {result.content[:200]}...")


async def test_required_documents() -> None:
    print("\n" + "=" * 70)
    print("TEST 3: Required Documents for Port Call")
    print("=" * 70)

    kb = get_maritime_knowledge_base()
    print("\nGetting required documents for container vessel at Singapore (SGSIN)...")
    docs = kb.search_required_documents("SGSIN", "container")

    print(f"\nRequired Documents ({len(docs)} total):")
    for doc in docs:
        print(f"  - {doc.get('document_type', 'unknown')}")
        print(f"    Source: {doc.get('regulation_source', 'unknown')}")
        description = (doc.get("description") or "")[:80]
        print(f"    Description: {description}...")
        print()


def _document_status(doc: dict) -> tuple[str, str]:
    expiry_value = doc.get("expiry_date")
    if not expiry_value:
        return ("Unknown", "N/A")
    try:
        expiry_date = datetime.fromisoformat(expiry_value)
    except (TypeError, ValueError):
        return ("Unknown", "N/A")

    days_left = (expiry_date - datetime.now()).days
    return ("Valid" if days_left >= 0 else "Expired", str(days_left))


async def test_route_compliance(db: Session, vessel: Vessel):
    print("\n" + "=" * 70)
    print("TEST 4: Route Compliance Check")
    print("=" * 70)

    compliance_service = ComplianceService(db)
    route = ["SGSIN", "NLRTM", "DEHAM"]

    print(f"\nVessel: {vessel.name} (IMO: {vessel.imo_number})")
    print(f"Type: {vessel.vessel_type.value}")
    print(f"Flag: {vessel.flag_state}")
    print(f"Route: {' -> '.join(route)}")

    documents = DocumentService().get_vessel_documents(vessel.id)
    print(f"\nVessel has {len(documents)} documents on file:")
    for doc in documents:
        status, days = _document_status(doc)
        print(f"  - {doc.get('document_type', 'unknown')}: {status} ({days} days)")

    print("\n" + "-" * 50)
    print("Running compliance check...")
    print("-" * 50)

    result = compliance_service.check_route_compliance(
        vessel_id=vessel.id,
        port_codes=route,
        route_name="Singapore to Hamburg",
    )

    print(f"\n{'=' * 50}")
    print(f"COMPLIANCE RESULT: {result.overall_status.value.upper()}")
    print(f"Compliance score: {result.compliance_score:.1f}")
    print(f"Risk level: {result.risk_level}")
    print(f"{'=' * 50}")

    for port_result in result.port_results:
        ok = port_result.status.value == "compliant"
        marker = "[OK]" if ok else "[!!]"
        print(f"\n{marker} Port: {port_result.port_code} ({port_result.port_name})")
        print(f"   Status: {port_result.status.value}")

        if port_result.special_requirements:
            print(f"   Special requirements ({len(port_result.special_requirements)}):")
            for req in port_result.special_requirements[:5]:
                print(f"      - {req}")

        if port_result.risk_factors:
            print(f"   Risk factors ({len(port_result.risk_factors)}):")
            for factor in port_result.risk_factors[:5]:
                print(f"      - {factor}")

        if port_result.missing_documents:
            print(f"   Missing documents ({len(port_result.missing_documents)}):")
            for doc in port_result.missing_documents[:5]:
                print(f"      - {doc}")

        if port_result.expired_documents:
            print(f"   Expired documents ({len(port_result.expired_documents)}):")
            for doc in port_result.expired_documents:
                print(f"      - {doc}")

    if result.summary_report:
        print(f"\n{'=' * 50}")
        print("SUMMARY REPORT")
        print(f"{'=' * 50}")
        print(result.summary_report)

    return result


async def main() -> None:
    print("\n" + "=" * 70)
    print("MARITIME COMPLIANCE SYSTEM - TEST SUITE")
    print("=" * 70)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("\nSetting up test data...")
        vessel = setup_test_data(db)

        await test_knowledge_base_search()
        await test_port_requirements()
        await test_required_documents()
        await test_route_compliance(db, vessel)

        print("\n" + "=" * 70)
        print("ALL TESTS COMPLETED")
        print("=" * 70)
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
