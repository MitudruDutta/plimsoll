"""
Test script for Route Compliance Check
Run with: python scripts/test_compliance_check.py
"""
import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from shared.database.database import SessionLocal, engine, Base
from shared.database.models import Vessel, VesselType, Customer
from modules.maritime.compliance_service import ComplianceService
from modules.maritime.document_service import DocumentService
from modules.maritime.maritime_knowledge_base import get_maritime_knowledge_base
from datetime import datetime


def setup_test_data(db: Session):
    """Create test vessel and documents"""

    # Check if test customer exists
    customer = db.query(Customer).filter(Customer.name == "Test Shipping Co").first()
    if not customer:
        customer = Customer(
            name="Test Shipping Co",
            email="test@shipping.com",
            phone="123-456-7890"
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        print(f"Created test customer: {customer.name} (ID: {customer.id})")

    # Check if test vessel exists
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
            year_built=2018
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


async def test_knowledge_base_search():
    """Test the maritime knowledge base search"""
    print("\n" + "="*70)
    print("TEST 1: Maritime Knowledge Base Search")
    print("="*70)

    kb = get_maritime_knowledge_base()

    # Check if running in mock mode
    if kb.mock_mode:
        print("\n⚠️  Knowledge Base is running in MOCK MODE")
        print("   (langchain/chromadb dependencies may not be installed)")

    # Get collection stats
    stats = kb.get_collection_stats()
    print(f"\nCollection Statistics:")
    for name, count in stats.items():
        print(f"  - {name}: {count} documents")

    # Test search
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


async def test_port_requirements():
    """Test port-specific requirement search"""
    print("\n" + "="*70)
    print("TEST 2: Port Requirements Search")
    print("="*70)

    kb = get_maritime_knowledge_base()

    # Search for Rotterdam (ECA zone, Paris MOU)
    print("\nSearching requirements for Rotterdam (NLRTM)...")
    results = kb.search_by_port("NLRTM", vessel_type="container", top_k=5)

    print(f"\nFound {len(results)} regulations for Rotterdam:")
    for i, result in enumerate(results, 1):
        print(f"\n  {i}. [{result.source}] (score: {result.score:.2f})")
        print(f"     {result.content[:200]}...")


async def test_required_documents():
    """Test required documents lookup"""
    print("\n" + "="*70)
    print("TEST 3: Required Documents for Port Call")
    print("="*70)

    kb = get_maritime_knowledge_base()

    print("\nGetting required documents for container vessel at Singapore (SGSIN)...")
    docs = kb.search_required_documents("SGSIN", "container")

    print(f"\nRequired Documents ({len(docs)} total):")
    for doc in docs:
        print(f"  - {doc['document_type']}")
        print(f"    Source: {doc['regulation_source']}")
        print(f"    Description: {doc['description'][:80]}...")
        print()


async def test_route_compliance(db: Session, vessel: Vessel):
    """Test full route compliance check"""
    print("\n" + "="*70)
    print("TEST 4: Route Compliance Check")
    print("="*70)

    compliance_service = ComplianceService(db)

    # Define test route: Singapore -> Rotterdam -> Hamburg
    route = ["SGSIN", "NLRTM", "DEHAM"]

    print(f"\nVessel: {vessel.name} (IMO: {vessel.imo_number})")
    print(f"Type: {vessel.vessel_type.value}")
    print(f"Flag: {vessel.flag_state}")
    print(f"Route: {' -> '.join(route)}")

    # Get vessel documents from Chroma-backed document service
    documents = DocumentService().get_vessel_documents(vessel.id)
    print(f"\nVessel has {len(documents)} documents on file:")
    for doc in documents:
        expiry_date = None
        expiry_value = doc.get("expiry_date")
        if expiry_value:
            try:
                expiry_date = datetime.fromisoformat(expiry_value)
            except ValueError:
                expiry_date = None
        status = "Valid" if expiry_date and expiry_date > datetime.now() else "Expired/Unknown"
        days_left = (expiry_date - datetime.now()).days if expiry_date else "N/A"
        print(f"  - {doc.get('document_type', 'unknown')}: {status} ({days_left} days)")

    # Run compliance check (non-AI mode for faster testing)
    print("\n" + "-"*50)
    print("Running compliance check...")
    print("-"*50)

    vessel_info = {
        "id": vessel.id,
        "name": vessel.name,
        "imo_number": vessel.imo_number,
        "vessel_type": vessel.vessel_type.value,
        "flag_state": vessel.flag_state,
        "gross_tonnage": vessel.gross_tonnage
    }

    result = compliance_service.check_route_compliance(
        vessel_id=vessel.id,
        port_codes=route,
        route_name="Singapore to Hamburg"
    )

    # Display results
    print(f"\n{'='*50}")
    print(f"COMPLIANCE RESULT: {result.overall_status.upper()}")
    print(f"{'='*50}")

    for port_result in result.port_results:
        port_status_icon = "✅" if port_result.status == "compliant" else "❌"
        print(f"\n{port_status_icon} Port: {port_result.port_code} ({port_result.port_name})")
        print(f"   Status: {port_result.status}")
        print(f"   PSC Regime: {port_result.psc_regime or 'Unknown'}")
        print(f"   Is ECA Zone: {'Yes' if port_result.is_eca else 'No'}")

        if port_result.missing_documents:
            print(f"   ❌ Missing Documents ({len(port_result.missing_documents)}):")
            for doc in port_result.missing_documents[:5]:  # Show first 5
                print(f"      - {doc}")

        if port_result.expiring_documents:
            print(f"   ⚠️  Expiring Documents ({len(port_result.expiring_documents)}):")
            for doc in port_result.expiring_documents:
                print(f"      - {doc}")

        if port_result.expired_documents:
            print(f"   🚫 Expired Documents ({len(port_result.expired_documents)}):")
            for doc in port_result.expired_documents:
                print(f"      - {doc}")

    # Print narrative report
    if result.narrative_report:
        print(f"\n{'='*50}")
        print("NARRATIVE REPORT")
        print(f"{'='*50}")
        print(result.narrative_report)

    return result


async def main():
    """Main test runner"""
    print("\n" + "="*70)
    print("MARITIME COMPLIANCE SYSTEM - TEST SUITE")
    print("="*70)

    # Create tables if needed
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Setup test data
        print("\nSetting up test data...")
        vessel = setup_test_data(db)

        # Run tests
        await test_knowledge_base_search()
        await test_port_requirements()
        await test_required_documents()
        await test_route_compliance(db, vessel)

        print("\n" + "="*70)
        print("ALL TESTS COMPLETED")
        print("="*70)

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
