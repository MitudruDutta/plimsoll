#!/usr/bin/env python
"""
Comprehensive Maritime Regulations Knowledge Base Loader

This script uploads detailed maritime compliance data to ChromaDB collections:
- imo_conventions: SOLAS, MARPOL, STCW, ISM, ISPS, Load Line, Tonnage conventions
- psc_requirements: Port State Control requirements by MOU region
- port_regulations: Port-specific regulations and procedures
- regional_requirements: EU MRV, ECA/SECA zones, regional emission requirements
- customs_documentation: Customs, pre-arrival, and documentation requirements

Data sourced from:
- IMO official conventions and circulars
- Port State Control MOU websites (Paris, Tokyo, USCG, etc.)
- EU MRV and ETS regulations
- MARPOL Annex VI emission control requirements

Run: python scripts/load_maritime_regulations.py
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import logging
from datetime import datetime
from typing import List, Dict, Any
from langchain_core.documents import Document
from modules.maritime.maritime_knowledge_base import get_maritime_knowledge_base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# IMO CONVENTIONS DATA
# =============================================================================

IMO_CONVENTIONS_DATA: List[Dict[str, Any]] = [
    # SOLAS Convention
    {
        "convention": "SOLAS",
        "full_name": "International Convention for the Safety of Life at Sea, 1974",
        "chapter": "I",
        "chapter_title": "General Provisions",
        "content": """
SOLAS Chapter I - General Provisions covers the application of the convention, surveys and certificates,
and port state control provisions.

Key Requirements:
1. Application: Applies to ships engaged on international voyages (passenger ships and cargo ships of 500 GT and above)
2. Surveys: Initial survey before ship enters service, periodic surveys at intervals not exceeding 5 years,
   intermediate surveys, annual surveys, and additional surveys as occasion arises
3. Certificates: Passenger Ship Safety Certificate, Cargo Ship Safety Construction Certificate,
   Cargo Ship Safety Equipment Certificate, Cargo Ship Safety Radio Certificate
4. Duration and Validity: Certificates valid for maximum 5 years with annual/intermediate endorsements
5. Port State Control: Contracting governments may inspect foreign ships to verify valid certificates

Certificate Requirements:
- Passenger Ship Safety Certificate: Valid for max 12 months
- Cargo Ship Safety Construction Certificate: Valid for max 5 years
- Cargo Ship Safety Equipment Certificate: Valid for max 5 years
- Cargo Ship Safety Radio Certificate: Valid for max 5 years
- Exemption Certificate: When exemptions granted under SOLAS

Amendments entering force 1 January 2024:
- New mooring safety requirements for ships >3000 GT
- GMDSS modernization requirements
- Revised Chapter IV radiocommunications
        """,
        "source_convention": "SOLAS 1974 as amended",
        "last_updated": "2024-01-01",
        "applicability": "Ships engaged on international voyages",
        "required_certificates": ["Passenger Ship Safety Certificate", "Cargo Ship Safety Construction Certificate",
                                  "Cargo Ship Safety Equipment Certificate", "Cargo Ship Safety Radio Certificate"]
    },
    {
        "convention": "SOLAS",
        "full_name": "International Convention for the Safety of Life at Sea, 1974",
        "chapter": "II-1",
        "chapter_title": "Construction - Structure, subdivision and stability, machinery and electrical installations",
        "content": """
SOLAS Chapter II-1 covers ship construction requirements including structure, subdivision, stability,
machinery and electrical installations.

Key Requirements:
1. Subdivision and Damage Stability: Ships must maintain adequate stability in damaged conditions
2. Machinery Installations: Main propulsion, steering gear, and essential auxiliary machinery requirements
3. Electrical Installations: Main source of electrical power, emergency source of power, distribution systems
4. Additional requirements for specific ship types

Required Documentation:
- Stability booklet approved by Administration
- Damage control plans and booklets
- Loading conditions information
- Trim and stability computer (if fitted)

2024 Updates:
- New regulation II-1/3-13 on lifting appliances and anchor handling winches (ships constructed on/after 1 Jan 2026)
- Electronic inclinometer requirement for containerships and bulk carriers ≥3000 GT (constructed on/after 1 Jan 2026)
        """,
        "source_convention": "SOLAS 1974 as amended",
        "last_updated": "2024-01-01",
        "applicability": "All passenger ships and cargo ships",
        "required_documents": ["Stability Booklet", "Damage Control Plan", "Loading Manual"]
    },
    {
        "convention": "SOLAS",
        "full_name": "International Convention for the Safety of Life at Sea, 1974",
        "chapter": "II-2",
        "chapter_title": "Fire protection, fire detection and fire extinction",
        "content": """
SOLAS Chapter II-2 covers fire safety requirements for ships.

Key Principles:
1. Division of ship into main vertical zones by thermal and structural boundaries
2. Separation of accommodation spaces from machinery spaces and cargo spaces
3. Restricted use of combustible materials
4. Detection of fire in zone of origin
5. Containment and extinction of fire in space of origin
6. Protection of means of escape and access for firefighting
7. Ready availability of fire-extinguishing appliances
8. Minimization of possibility of ignition of flammable cargo vapours

Required Certificates and Documents:
- Fire Safety Systems Certificate (if applicable)
- Fire Control Plan
- Fire Training Manual
- Maintenance Plan for fire protection systems
- Records of fire drills

2026 Requirements:
- PFOS ban: Use or storage of fire extinguishing media containing perfluorooctane sulfonic acid (PFOS)
  prohibited after first survey on/after 1 January 2026 (Resolution MSC.532(107))
        """,
        "source_convention": "SOLAS 1974 as amended",
        "last_updated": "2024-01-01",
        "applicability": "All ships",
        "required_documents": ["Fire Control Plan", "Fire Training Manual", "Fire Safety Systems Maintenance Plan"]
    },
    {
        "convention": "SOLAS",
        "full_name": "International Convention for the Safety of Life at Sea, 1974",
        "chapter": "III",
        "chapter_title": "Life-saving appliances and arrangements",
        "content": """
SOLAS Chapter III covers life-saving appliances and arrangements.

Key Requirements:
1. Lifeboats: Sufficient capacity for all persons on board, launching arrangements, equipment
2. Life rafts: Inflatable or rigid, sufficient capacity, proper stowage
3. Rescue boats: At least one rescue boat capable of recovering persons from water
4. Lifejackets: For every person on board plus additional for watch personnel
5. Lifebuoys: Minimum number based on ship length with self-igniting lights and smoke signals
6. Line-throwing appliances
7. General alarm system and public address system
8. Emergency training and drills

Required Documentation:
- Life-Saving Appliances (LSA) Certificate (Form E)
- Training Manual for life-saving appliances
- Instructions for on-board maintenance of LSA
- Muster list
- Records of drills and inspections

Drill Requirements:
- Abandon ship drill and fire drill: Weekly for passenger ships, monthly for cargo ships
- Lifeboat drills must include lowering lifeboats, starting engines
- All crew must participate in at least one abandon ship drill and fire drill per month
        """,
        "source_convention": "SOLAS 1974 as amended",
        "last_updated": "2024-01-01",
        "applicability": "All ships",
        "required_documents": ["LSA Form E", "Training Manual", "Muster List", "Drill Records"]
    },
    {
        "convention": "SOLAS",
        "full_name": "International Convention for the Safety of Life at Sea, 1974",
        "chapter": "IV",
        "chapter_title": "Radiocommunications",
        "content": """
SOLAS Chapter IV covers radio communication requirements (revised 1 January 2024).

GMDSS (Global Maritime Distress and Safety System) Requirements:
1. Sea Areas:
   - A1: Within range of VHF coast stations with DSC alerting
   - A2: Within range of MF coast stations with DSC alerting
   - A3: Within coverage of Inmarsat geostationary satellites
   - A4: All other areas (polar regions)

2. Equipment Requirements by Sea Area:
   - All ships: VHF radio, NAVTEX receiver, EPIRB, SART, portable two-way VHF radiotelephone
   - A1 areas: VHF DSC
   - A2 areas: MF DSC + A1 equipment
   - A3 areas: Ship earth station or MF/HF DSC + A1/A2 equipment
   - A4 areas: MF/HF DSC

3. Watchkeeping Requirements:
   - Continuous DSC watch on VHF Ch 70 and MF 2187.5 kHz
   - Ships in A3/A4: HF DSC frequencies

2024 Updates (Resolution MSC.496(105)):
- Modernized GMDSS requirements with generic performance standards
- Removed carriage requirements for obsolete systems (HF NBDP)
- Communication equipment moved from Chapter III to Chapter IV
- Existing certificates don't need reissue before expiry due to reorganization
        """,
        "source_convention": "SOLAS 1974 as amended",
        "last_updated": "2024-01-01",
        "applicability": "All ships of 300 GT and above on international voyages",
        "required_certificates": ["Cargo Ship Safety Radio Certificate"],
        "required_documents": ["Radio Record Book", "GMDSS Radio Log"]
    },
    {
        "convention": "SOLAS",
        "full_name": "International Convention for the Safety of Life at Sea, 1974",
        "chapter": "V",
        "chapter_title": "Safety of Navigation",
        "content": """
SOLAS Chapter V covers safety of navigation requirements.

Key Requirements:
1. Navigational equipment (Regulation V/19):
   - Magnetic compass (and spare)
   - Radar (3 GHz and 9 GHz for ships ≥3000 GT)
   - AIS (Automatic Identification System)
   - ECDIS (Electronic Chart Display)
   - GPS or equivalent
   - Speed and distance measuring device
   - Echo-sounding device
   - Rudder angle indicator, propeller indicators

2. Voyage Planning (Regulation V/34):
   - Prior to departure: Passage plan from berth to berth
   - Consider all pertinent information
   - Monitor vessel's progress continuously

3. Bridge Watchkeeping:
   - Adequate and effective watch at all times
   - Standards per STCW Convention

4. Mandatory Ship Reporting Systems:
   - Comply with adopted ship reporting systems
   - AIS transmission at all times unless security concerns

2026 Requirements:
- Electronic inclinometer for containerships and bulk carriers ≥3000 GT (constructed on/after 1 Jan 2026)
        """,
        "source_convention": "SOLAS 1974 as amended",
        "last_updated": "2024-01-01",
        "applicability": "All ships on international voyages",
        "required_documents": ["Voyage Plan", "Navigation Records", "AIS Data"]
    },
    {
        "convention": "SOLAS",
        "full_name": "International Convention for the Safety of Life at Sea, 1974",
        "chapter": "IX",
        "chapter_title": "Management for the Safe Operation of Ships (ISM Code)",
        "content": """
SOLAS Chapter IX makes the International Safety Management (ISM) Code mandatory.

ISM Code Objectives:
1. Ensure safety at sea
2. Prevent human injury or loss of life
3. Avoid damage to the environment (marine environment) and property

Key Requirements:
1. Safety Management System (SMS):
   - Safety and environmental protection policy
   - Instructions and procedures for safe operation
   - Defined levels of authority and communication
   - Procedures for reporting accidents and non-conformities
   - Emergency preparedness procedures
   - Internal audits and management reviews

2. Designated Person Ashore (DPA):
   - Direct access to highest level of management
   - Monitor safety and pollution prevention aspects
   - Ensure adequate resources and shore-based support

Required Certificates:
- Document of Compliance (DOC): Issued to Company, valid 5 years with annual verification
- Safety Management Certificate (SMC): Issued to ship, valid 5 years with intermediate verification

Application:
- Passenger ships (including passenger high-speed craft): Since 1 July 1998
- Cargo ships and mobile offshore drilling units ≥500 GT: Since 1 July 2002
        """,
        "source_convention": "SOLAS 1974 / ISM Code",
        "last_updated": "2024-01-01",
        "applicability": "Passenger ships and cargo ships ≥500 GT",
        "required_certificates": ["Document of Compliance (DOC)", "Safety Management Certificate (SMC)"],
        "required_documents": ["Safety Management Manual", "SMS Procedures", "Internal Audit Records"]
    },
    {
        "convention": "SOLAS",
        "full_name": "International Convention for the Safety of Life at Sea, 1974",
        "chapter": "XI-1",
        "chapter_title": "Special measures to enhance maritime safety",
        "content": """
SOLAS Chapter XI-1 covers special measures to enhance maritime safety.

Key Requirements:
1. Authorization of Recognized Organizations:
   - Flag States to ensure ROs acting on their behalf meet IMO guidelines

2. Enhanced Surveys:
   - Bulk carriers and oil tankers: Enhanced Survey Programme (ESP)

3. Ship Identification Number (IMO Number):
   - Permanent marking on hull and superstructure
   - Every ship ≥100 GT assigned unique IMO number

4. Continuous Synopsis Record (CSR):
   - Record of ship's history
   - Issued by flag State
   - Contains: Flag State, date of registration, ship identification number, ship name, port of registry,
     registered owner, registered charterer, company responsible for ISM, classification societies,
     Administration issuing DOC
   - Must be kept on board and updated when changes occur
        """,
        "source_convention": "SOLAS 1974 as amended",
        "last_updated": "2024-01-01",
        "applicability": "All ships engaged on international voyages",
        "required_documents": ["Continuous Synopsis Record (CSR)"]
    },
    {
        "convention": "SOLAS",
        "full_name": "International Convention for the Safety of Life at Sea, 1974",
        "chapter": "XI-2",
        "chapter_title": "Special measures to enhance maritime security (ISPS Code)",
        "content": """
SOLAS Chapter XI-2 makes the International Ship and Port Facility Security (ISPS) Code mandatory.

ISPS Code Structure:
- Part A: Mandatory requirements
- Part B: Guidance for implementation (parts mandatory, parts recommendatory)

Key Requirements:
1. Ship Security Assessment (SSA):
   - Identify existing security measures
   - Identify key shipboard operations to be protected
   - Identify possible threats and likelihood of occurrence
   - Identify weaknesses in security

2. Ship Security Plan (SSP):
   - Measures to prevent weapons/dangerous substances on board
   - Identification of restricted areas and measures
   - Measures to prevent unauthorized access
   - Procedures for responding to security threats
   - Procedures for evacuation
   - Duties of shipboard personnel assigned security responsibilities
   - Procedures for interfacing with port facility security

3. Ship Security Officer (SSO):
   - Designated by the Company
   - Must hold STCW Certificate of Proficiency
   - Responsible for implementing and maintaining SSP

4. Security Levels:
   - Level 1: Normal (minimum protective security measures)
   - Level 2: Heightened (additional protective measures)
   - Level 3: Exceptional (further specific protective measures)

Required Certificates:
- International Ship Security Certificate (ISSC): Valid 5 years with intermediate verification
- Interim ISSC: Valid 6 months (for new ships or flag transfer)

Application:
- Passenger ships (including high-speed passenger craft)
- Cargo ships ≥500 GT (including high-speed cargo craft)
- Mobile offshore drilling units
        """,
        "source_convention": "SOLAS 1974 / ISPS Code",
        "last_updated": "2024-01-01",
        "applicability": "Passenger ships and cargo ships ≥500 GT",
        "required_certificates": ["International Ship Security Certificate (ISSC)"],
        "required_documents": ["Ship Security Plan (SSP)", "Ship Security Assessment (SSA)"]
    },
    # MARPOL Convention
    {
        "convention": "MARPOL",
        "full_name": "International Convention for the Prevention of Pollution from Ships",
        "annex": "I",
        "annex_title": "Prevention of Pollution by Oil",
        "content": """
MARPOL Annex I - Regulations for the Prevention of Pollution by Oil (entered into force 2 October 1983)

Key Requirements:
1. Construction Requirements:
   - Double hull requirements for oil tankers
   - Segregated ballast tanks (SBT)
   - Crude oil washing (COW) systems

2. Equipment Requirements:
   - Oil discharge monitoring equipment
   - Oil-water separating equipment (15 ppm)
   - Oil filtering equipment
   - Standard discharge connection

3. Operational Requirements:
   - Prohibited discharge of oil within 50 nm of nearest land
   - Oil content of effluent must not exceed 15 ppm
   - Ship must be en route with operational ODME
   - For oil tankers: Discharge rate max 30 liters per nautical mile

4. Special Areas (more stringent requirements):
   - Mediterranean Sea, Baltic Sea, Black Sea, Red Sea, Gulfs area, Gulf of Aden,
     Antarctic area, North West European Waters, Oman area of Arabian Sea, Southern South African waters

Required Certificate:
- International Oil Pollution Prevention (IOPP) Certificate: Valid 5 years

Required Documents:
- Oil Record Book Part I (Machinery space operations) - All ships ≥400 GT
- Oil Record Book Part II (Cargo/ballast operations) - Oil tankers ≥150 GT
- Shipboard Oil Pollution Emergency Plan (SOPEP) - All ships ≥400 GT and oil tankers ≥150 GT
        """,
        "source_convention": "MARPOL 73/78",
        "last_updated": "2024-01-01",
        "applicability": "All ships ≥400 GT, oil tankers ≥150 GT",
        "required_certificates": ["International Oil Pollution Prevention (IOPP) Certificate"],
        "required_documents": ["Oil Record Book Part I", "Oil Record Book Part II", "SOPEP"]
    },
    {
        "convention": "MARPOL",
        "full_name": "International Convention for the Prevention of Pollution from Ships",
        "annex": "II",
        "annex_title": "Control of Pollution by Noxious Liquid Substances in Bulk",
        "content": """
MARPOL Annex II - Regulations for the Control of Pollution by Noxious Liquid Substances Carried in Bulk

Key Requirements:
1. Categorization of Substances:
   - Category X: Major hazard to marine resources or human health (prohibited discharge)
   - Category Y: Hazard to marine resources or human health (limited discharge)
   - Category Z: Minor hazard (less stringent requirements)
   - Other Substances (OS): No harm within applicable criteria

2. Discharge Requirements:
   - Category X: No discharge into the sea (prewash to reception facility mandatory)
   - Category Y: Max 1 ppm in wake, ship proceeding en route at ≥7 knots, below waterline
   - Category Z: Same as Y with less stringent residue limits

3. Special Areas:
   - Antarctic area: All discharge of noxious liquid substances prohibited

4. Construction Requirements:
   - Ships certified to carry Category X, Y or Z substances
   - Underwater discharge arrangements
   - Ventilation systems for cargo tanks

Required Certificate:
- International Pollution Prevention Certificate for the Carriage of Noxious Liquid Substances in Bulk (NLS Certificate)

Required Documents:
- Cargo Record Book
- Procedures and Arrangements Manual (P&A Manual)
- Shipboard Marine Pollution Emergency Plan for Noxious Liquid Substances (SMPEP)
        """,
        "source_convention": "MARPOL 73/78",
        "last_updated": "2024-01-01",
        "applicability": "Chemical tankers and NLS carriers",
        "required_certificates": ["NLS Certificate"],
        "required_documents": ["Cargo Record Book", "P&A Manual", "SMPEP"]
    },
    {
        "convention": "MARPOL",
        "full_name": "International Convention for the Prevention of Pollution from Ships",
        "annex": "III",
        "annex_title": "Prevention of Pollution by Harmful Substances Carried by Sea in Packaged Form",
        "content": """
MARPOL Annex III - Prevention of Pollution by Harmful Substances Carried by Sea in Packaged Form

Key Requirements:
1. Packaging:
   - Adequate to minimize hazard to marine environment
   - Must meet IMDG Code standards

2. Marking and Labelling:
   - Marine Pollutant mark required
   - Durable identification marks

3. Documentation:
   - Proper shipping name and UN number
   - Marine pollutant indication on documentation
   - Container/vehicle packing certificate

4. Stowage:
   - Proper stowage to minimize danger
   - Secure to prevent shifting
   - Segregation from incompatible goods

5. Jettisoning:
   - Jettisoning of harmful substances prohibited except for safety of ship or saving life at sea

Required Documents:
- Dangerous Goods Manifest or Stowage Plan (identifying location of marine pollutants)
- Document of Compliance for ships carrying dangerous goods (if applicable)
        """,
        "source_convention": "MARPOL 73/78",
        "last_updated": "2024-01-01",
        "applicability": "Ships carrying harmful substances in packaged form",
        "required_documents": ["Dangerous Goods Manifest", "Stowage Plan"]
    },
    {
        "convention": "MARPOL",
        "full_name": "International Convention for the Prevention of Pollution from Ships",
        "annex": "IV",
        "annex_title": "Prevention of Pollution by Sewage from Ships",
        "content": """
MARPOL Annex IV - Prevention of Pollution by Sewage from Ships

Key Requirements:
1. Discharge Requirements Outside Special Areas:
   - Treated sewage: Discharge permitted using approved treatment plant
   - Untreated sewage: Only permitted >12 nm from nearest land, ship proceeding ≥4 knots
   - Comminuted/disinfected sewage: >3 nm from nearest land

2. Discharge Requirements in Special Areas (Baltic Sea):
   - More stringent nitrogen and phosphorus removal requirements
   - Applies to passenger ships from specific dates based on construction date

3. Equipment Requirements:
   - Sewage treatment plant, or
   - Sewage comminuting and disinfecting system, or
   - Sewage holding tank of adequate capacity

4. Standard Discharge Connections:
   - Ships must be fitted for connection to port reception facilities

Required Certificate:
- International Sewage Pollution Prevention Certificate (ISPP): Valid 5 years

Required Documents:
- Sewage treatment plant operation manual
- Records of sewage discharge operations
        """,
        "source_convention": "MARPOL 73/78",
        "last_updated": "2024-01-01",
        "applicability": "Ships ≥400 GT or certified to carry >15 persons on international voyages",
        "required_certificates": ["International Sewage Pollution Prevention Certificate (ISPP)"],
        "required_documents": ["Operation Manual", "Discharge Records"]
    },
    {
        "convention": "MARPOL",
        "full_name": "International Convention for the Prevention of Pollution from Ships",
        "annex": "V",
        "annex_title": "Prevention of Pollution by Garbage from Ships",
        "content": """
MARPOL Annex V - Prevention of Pollution by Garbage from Ships (Revised 2013)

COMPLETE BAN on discharge of all plastics into the sea.

Discharge Requirements Outside Special Areas:
- Plastics: All discharge prohibited
- Food waste: Permitted >12 nm from nearest land (comminuted/ground: >3 nm)
- Cargo residues (non-HME): >12 nm from nearest land
- Cargo residues (HME): >12 nm, >25 m depth, ship en route
- Cleaning agents: Permitted outside special areas
- Animal carcasses: As far from land as possible, >100 nm

Special Areas (stricter requirements):
- Baltic Sea, North Sea, Antarctic, Wider Caribbean, Mediterranean, Black Sea, Red Sea, Gulfs area
- Generally: No discharge except food waste >12 nm from nearest land and ice shelves

Required Documents:
- Garbage Management Plan: All ships ≥100 GT and ships certified to carry ≥15 persons
- Garbage Record Book: All ships ≥400 GT and ships certified to carry ≥15 persons
- Placard: Display of disposal requirements

Record Book Entries:
- Date, time, position of ship
- Category of garbage
- Estimated amount discharged or incinerated
- Signature of officer in charge
        """,
        "source_convention": "MARPOL 73/78",
        "last_updated": "2024-01-01",
        "applicability": "All ships",
        "required_documents": ["Garbage Management Plan", "Garbage Record Book", "Disposal Placard"]
    },
    {
        "convention": "MARPOL",
        "full_name": "International Convention for the Prevention of Pollution from Ships",
        "annex": "VI",
        "annex_title": "Prevention of Air Pollution from Ships",
        "content": """
MARPOL Annex VI - Regulations for the Prevention of Air Pollution from Ships

SULPHUR OXIDE (SOx) EMISSIONS:
1. Global Sulphur Cap (from 1 January 2020):
   - Maximum 0.50% m/m sulphur content in fuel oil

2. Emission Control Areas (ECAs) - 0.10% m/m sulphur limit:
   - Baltic Sea (entered force 2006)
   - North Sea (entered force 2007)
   - North American ECA (entered force 2012)
   - United States Caribbean Sea ECA (entered force 2014)
   - Mediterranean Sea ECA (enters force 1 May 2025)
   - Canadian Arctic Waters ECA (enters force 1 March 2026)
   - Norwegian Sea ECA (enters force 1 March 2026)

NITROGEN OXIDE (NOx) EMISSIONS:
- Tier I: Ships constructed 2000-2010
- Tier II: Ships constructed 2011+ (outside NECAs)
- Tier III: Ships constructed 2016+ operating in NECAs (North American, US Caribbean, Baltic Sea, North Sea)

ENERGY EFFICIENCY:
- EEDI: Energy Efficiency Design Index (new ships)
- EEXI: Energy Efficiency Existing Ship Index (existing ships, from 2023)
- SEEMP: Ship Energy Efficiency Management Plan
- CII: Carbon Intensity Indicator (annual operational rating A-E)

Required Certificates:
- International Air Pollution Prevention Certificate (IAPP): Valid 5 years
- Engine International Air Pollution Prevention Certificate (EIAPP): Per engine
- International Energy Efficiency Certificate (IEEC)

Required Documents:
- Bunker Delivery Note (BDN) with sulphur content - retain 3 years
- Fuel oil changeover procedures (for ships using different fuels)
- Technical File (NOx compliance)
- SEEMP Part I (Energy Efficiency Plan)
- SEEMP Part II (Fuel oil consumption data collection)
        """,
        "source_convention": "MARPOL 73/78",
        "last_updated": "2024-01-01",
        "applicability": "Ships ≥400 GT, engines >130 kW",
        "required_certificates": ["IAPP Certificate", "EIAPP Certificate", "IEE Certificate"],
        "required_documents": ["Bunker Delivery Notes", "SEEMP", "Technical File", "Fuel Changeover Procedure"]
    },
    # STCW Convention
    {
        "convention": "STCW",
        "full_name": "International Convention on Standards of Training, Certification and Watchkeeping for Seafarers, 1978",
        "chapter": "General",
        "chapter_title": "Standards of Competence and Certification",
        "content": """
STCW Convention - Standards of Training, Certification and Watchkeeping for Seafarers

Purpose: Establish international standards for the training, certification and watchkeeping of seafarers.

Key Requirements:
1. Certificates of Competency (CoC):
   - Master, Chief Mate, Officer in Charge of Navigational Watch
   - Chief Engineer Officer, Second Engineer Officer, Officer in Charge of Engineering Watch
   - Electro-Technical Officer
   - GMDSS Radio Operators

2. Certificates of Proficiency (CoP):
   - Basic Training (STCW VI/1): Personal survival, fire prevention, elementary first aid, personal safety
   - Survival Craft and Rescue Boats (STCW VI/2)
   - Advanced Fire Fighting (STCW VI/3)
   - Medical First Aid / Medical Care (STCW VI/4)
   - Ship Security Officer (STCW VI/5)
   - Security Awareness / Designated Security Duties (STCW VI/6)
   - Proficiency in Survival Craft (PSC)
   - Proficiency in Fast Rescue Boats (FRB)

3. Revalidation Requirements:
   - Certificates valid for maximum 5 years
   - Revalidation requires: Approved seagoing service, or Approved training, or Passing examination

4. Flag State Endorsement:
   - CoCs issued by other parties must be endorsed by flag State
   - Endorsements must be in English

5. Watchkeeping Standards:
   - Principles to be observed in keeping navigational/engineering watch
   - Fitness for duty requirements (rest hours)
   - Drug and alcohol policies (BAC limit 0.05% or lower as per flag State)

Required Records:
   - Training Record Book
   - Record of rest hours
   - Evidence of medical fitness (Medical Certificate valid max 2 years)
        """,
        "source_convention": "STCW 1978 as amended (Manila 2010)",
        "last_updated": "2024-01-01",
        "applicability": "All seafarers serving on seagoing ships",
        "required_certificates": ["Certificate of Competency", "Certificates of Proficiency", "Medical Certificate"],
        "required_documents": ["Training Record Book", "Rest Hour Records"]
    },
    # Load Line Convention
    {
        "convention": "Load Line",
        "full_name": "International Convention on Load Lines, 1966",
        "chapter": "General",
        "chapter_title": "Freeboard and Load Line Marks",
        "content": """
International Load Line Convention (LL 66/88) - Freeboard Assignment

Purpose: Ensure ships have sufficient reserve buoyancy and stability for safe operation.

Key Requirements:
1. Freeboard Assignment:
   - Minimum freeboard based on ship type, length, depth, sheer, superstructure
   - Type A ships (tankers): Lower freeboards permitted
   - Type B ships (all other): Standard freeboards
   - Type B-60 and B-100: Reduced freeboards for ships meeting enhanced subdivision

2. Load Line Marks:
   - Deck line: 300mm x 25mm horizontal line at freeboard deck
   - Load line disc: 300mm diameter circle with horizontal line through center
   - Zone and seasonal marks: Different load lines for different conditions

3. Zones and Seasonal Areas:
   - Tropical (T): Highest permitted load line
   - Summer (S): Standard load line
   - Winter (W): Lower than summer
   - Winter North Atlantic (WNA): Lowest for North Atlantic in winter
   - Fresh Water (F): Higher than salt water marks

4. Survey Requirements:
   - Initial survey before ship enters service
   - Annual surveys
   - Periodical surveys (every 5 years)

Required Certificate:
- International Load Line Certificate (LL Certificate): Valid 5 years

Required Documents:
- Stability information
- Loading manual
- Record of structural alterations
        """,
        "source_convention": "Load Line Convention 1966/1988 Protocol",
        "last_updated": "2024-01-01",
        "applicability": "Ships ≥24m in length on international voyages",
        "required_certificates": ["International Load Line Certificate"],
        "required_documents": ["Stability Information", "Loading Manual"]
    },
    # Tonnage Convention
    {
        "convention": "Tonnage",
        "full_name": "International Convention on Tonnage Measurement of Ships, 1969",
        "chapter": "General",
        "chapter_title": "Gross and Net Tonnage Measurement",
        "content": """
International Tonnage Convention 1969 - Ship Tonnage Measurement

Purpose: Establish uniform principles for tonnage measurement of ships engaged on international voyages.

Key Definitions:
1. Gross Tonnage (GT):
   - Function of total volume of all enclosed spaces
   - Formula: GT = K1 × V
   - Used for: Safety regulations, manning, registration fees

2. Net Tonnage (NT):
   - Function of useful capacity (cargo spaces)
   - Formula: NT = K2 × Vc × (4d/3D)² + K3 × (N1 + N2/10)
   - Used for: Port dues, canal tolls, pilotage fees
   - Cannot be less than 0.30 × GT

Measurement Process:
1. Initial measurement survey
2. Re-measurement when alterations affect tonnage
3. No annual or periodic surveys required (certificate valid indefinitely unless alterations made)

Required Certificate:
- International Tonnage Certificate (1969): Valid indefinitely (unless alterations made)
- Must show: Ship name, distinctive number/letters, port of registry, GT, NT, date measured

Important Notes:
- Many regulations reference GT for applicability thresholds
- Different GT thresholds trigger different requirements:
  - ≥300 GT: AIS, GMDSS
  - ≥400 GT: MARPOL Annex I/IV/V
  - ≥500 GT: ISM, ISPS
  - ≥3000 GT: Additional SOLAS requirements
        """,
        "source_convention": "Tonnage Convention 1969",
        "last_updated": "2024-01-01",
        "applicability": "All ships on international voyages",
        "required_certificates": ["International Tonnage Certificate (1969)"]
    },
    # Ballast Water Convention
    {
        "convention": "BWM",
        "full_name": "International Convention for the Control and Management of Ships' Ballast Water and Sediments, 2004",
        "chapter": "General",
        "chapter_title": "Ballast Water Management",
        "content": """
Ballast Water Management Convention (BWM Convention) - entered into force 8 September 2017

Purpose: Prevent spread of harmful aquatic organisms and pathogens through ships' ballast water.

Key Requirements:
1. Ballast Water Management Plan:
   - Ship-specific plan for ballast water management
   - Approved by Administration or RO

2. Ballast Water Record Book:
   - Record of all ballast water operations
   - Retain on board for minimum 2 years

3. Management Standards:
   - D-1 Standard (Ballast Water Exchange):
     * Exchange ≥95% volumetric
     * 200nm from land, water depth ≥200m
     * If impracticable, as far from land as possible, minimum 50nm, ≥200m depth

   - D-2 Standard (Ballast Water Treatment):
     * Discharge must meet strict organism limits
     * <10 viable organisms per m³ (≥50μm)
     * <10 viable organisms per mL (10-50μm)
     * Indicator microbe limits (Vibrio cholerae, E. coli, Enterococci)

4. Implementation Schedule (D-2):
   - Ships constructed before 8 September 2017: By first IOPP renewal survey after 8 September 2019
   - Ships constructed on/after 8 September 2017: From delivery

5. Surveys and Certification:
   - Initial survey before entering service
   - Annual surveys
   - Intermediate surveys
   - Renewal surveys (every 5 years)

Required Certificate:
- International Ballast Water Management Certificate: Valid 5 years

Required Documents:
- Ballast Water Management Plan
- Ballast Water Record Book
- Type Approval Certificate for BWMS (if D-2 standard)
        """,
        "source_convention": "BWM Convention 2004",
        "last_updated": "2024-01-01",
        "applicability": "Ships designed to carry ballast water on international voyages",
        "required_certificates": ["International Ballast Water Management Certificate"],
        "required_documents": ["Ballast Water Management Plan", "Ballast Water Record Book"]
    },
]


# =============================================================================
# PORT STATE CONTROL DATA
# =============================================================================

PSC_REQUIREMENTS_DATA: List[Dict[str, Any]] = [
    # Paris MOU
    {
        "psc_regime": "Paris MOU",
        "full_name": "Paris Memorandum of Understanding on Port State Control",
        "region": "Europe and North Atlantic",
        "member_states": ["Belgium", "Bulgaria", "Canada", "Croatia", "Cyprus", "Denmark", "Estonia",
                         "Finland", "France", "Germany", "Greece", "Iceland", "Ireland", "Italy",
                         "Latvia", "Lithuania", "Malta", "Netherlands", "Norway", "Poland", "Portugal",
                         "Romania", "Russia", "Slovenia", "Spain", "Sweden", "United Kingdom"],
        "content": """
Paris MOU - Port State Control in Europe and North Atlantic

Inspection Targeting - New Inspection Regime (NIR):
1. Ship Risk Profile:
   - High Risk Ship (HRS): Priority I inspection, window 5-6 months
   - Standard Risk Ship (SRS): Priority II inspection, window 10-12 months
   - Low Risk Ship (LRS): Priority II inspection, window 24-36 months

2. Risk Parameters:
   - Ship type (tankers, bulk carriers, passenger ships = higher risk)
   - Ship age (older ships = higher risk)
   - Flag performance (White, Grey, Black list)
   - Recognized Organization performance
   - Company performance
   - Deficiency history
   - Detention history

3. Inspection Types:
   - Initial inspection: Verification of certificates and documents, general condition
   - More detailed inspection: When clear grounds exist
   - Expanded inspection: Mandatory for HRS and certain ship types >12 years old
   - Concentrated Inspection Campaign (CIC): Annual focus on specific area

4. Black/Grey/White List:
   - White List: Flag States with good PSC record (fewer inspections)
   - Grey List: Flag States with average performance
   - Black List: Flag States with poor performance (more inspections, potential banning)

5. Banning:
   - Ships detained 3+ times in 36 months in Paris MOU region
   - Refused access for defined period based on number of detentions

Common Detainable Deficiencies:
- ISM Code non-conformities
- Fire safety deficiencies
- Life-saving appliance deficiencies
- Structural deficiencies
- Crew competency issues
- Working and living conditions (MLC)
        """,
        "source": "Paris MOU Secretariat",
        "last_updated": "2024-01-01",
        "inspection_rate": "25% of ships calling at ports",
        "priority_areas": ["ISM compliance", "Fire safety", "Life-saving appliances", "MARPOL compliance"]
    },
    # Tokyo MOU
    {
        "psc_regime": "Tokyo MOU",
        "full_name": "Memorandum of Understanding on Port State Control in the Asia-Pacific Region",
        "region": "Asia-Pacific",
        "member_states": ["Australia", "Canada", "Chile", "China", "Fiji", "Hong Kong", "Indonesia",
                         "Japan", "Korea", "Malaysia", "New Zealand", "Papua New Guinea", "Peru",
                         "Philippines", "Russia", "Singapore", "Thailand", "Vanuatu", "Vietnam"],
        "content": """
Tokyo MOU - Port State Control in Asia-Pacific Region

New Inspection Regime (NIR) - implemented 1 January 2014:

1. Ship Risk Profile:
   - High Risk Ship (HRS): Inspection priority within 5-6 months
   - Standard Risk Ship (SRS): Inspection within 10-12 months
   - Low Risk Ship (LRS): Inspection within 24-36 months

2. Risk Factors:
   - Type of ship (high-risk types: oil tankers, chemical tankers, gas carriers, bulk carriers, passenger ships)
   - Age of ship
   - Flag State performance
   - Recognized Organization performance
   - Company performance
   - Number of deficiencies in last 36 months
   - Number of detentions in last 36 months

3. Inspection Selection:
   - Priority I: Must be inspected (overdue HRS/SRS/LRS)
   - Priority II: May be inspected (within window)
   - Unexpected factor: Ships with recent operational issues

4. Black/Grey/White List:
   - Published annually
   - Based on 3-year rolling average of inspection results
   - Affects ship risk profile calculation

Key Focus Areas:
- STCW compliance (seafarer certification)
- ISM Code compliance
- ISPS Code compliance
- MARPOL compliance (particularly Annex VI)
- MLC 2006 compliance
- Ballast Water Management

Information Sharing:
- APCIS (Asia-Pacific Computerized Information System)
- Shared with other MOU regions
        """,
        "source": "Tokyo MOU Secretariat",
        "last_updated": "2024-01-01",
        "inspection_rate": "80% inspection rate target",
        "priority_areas": ["STCW compliance", "ISM/ISPS", "MARPOL Annex VI", "MLC 2006"]
    },
    # USCG PSC
    {
        "psc_regime": "USCG",
        "full_name": "United States Coast Guard Port State Control",
        "region": "United States",
        "member_states": ["United States"],
        "content": """
US Coast Guard Port State Control Program

The USCG does not participate in a MOU but maintains its own PSC program aligned with IMO standards.

Targeting Matrix:
1. Priority I (Highest):
   - Vessels not examined within past 12 months
   - Vessels with serious/multiple prior deficiencies
   - Flag States with poor safety records
   - Vessels with operational problems

2. Priority II:
   - Vessels with examination dates approaching
   - Vessels based on intelligence or boarding priority

3. Targeting Factors:
   - QUALSHIP 21 status (quality shipping for 21st century)
   - Flag State safety record
   - Classification society performance
   - Company performance history
   - Vessel history (detentions, deficiencies, casualties)
   - Voyage history (high-risk trades)

QUALSHIP 21 Program:
- Voluntary quality incentive program
- Requirements: Flag State on USCG targeting list, class society with USCG agreement,
  no detentions/COTP orders in 3 years, low deficiency ratio, 3-year USCG exam history
- Benefits: Reduced examination frequency (annual instead of more frequent)

Examination Types:
1. Safety Examination: Certificates, documentation, vessel condition
2. Expanded Examination: Based on clear grounds or targeting
3. Drill Participation: Fire, abandon ship, SOPEP drills
4. Control Verification Examination: Follow-up on deficiencies

Key Focus Areas:
- 46 CFR (US domestic requirements)
- Title 33 CFR (Navigation and vessel inspection)
- SOLAS, MARPOL, STCW compliance
- MTSA (Maritime Transportation Security Act) compliance

Penalties:
- Civil penalties up to $100,000 per violation (MARPOL)
- Criminal penalties for willful violations
- Detention until deficiencies corrected
- Denial of entry for repeat offenders
        """,
        "source": "US Coast Guard",
        "last_updated": "2024-01-01",
        "inspection_rate": "All foreign vessels examined",
        "priority_areas": ["QUALSHIP 21", "MTSA security", "MARPOL compliance", "Crew competency"]
    },
    # Indian Ocean MOU
    {
        "psc_regime": "Indian Ocean MOU",
        "full_name": "Indian Ocean Memorandum of Understanding on Port State Control",
        "region": "Indian Ocean",
        "member_states": ["Australia", "Bangladesh", "Comoros", "Djibouti", "Eritrea", "Ethiopia", "France",
                         "India", "Iran", "Kenya", "Maldives", "Mauritius", "Mozambique", "Myanmar",
                         "Oman", "Seychelles", "South Africa", "Sri Lanka", "Sudan", "Tanzania", "Yemen"],
        "content": """
Indian Ocean MOU - Port State Control in Indian Ocean Region

Risk-Based Targeting System:

1. Ship Risk Profile:
   - High Risk Ship (HRS)
   - Standard Risk Ship (SRS)
   - Low Risk Ship (LRS)

2. Risk Calculation Factors:
   - Generic factors: Ship type, age
   - Historic factors: Deficiencies, detentions
   - Flag State performance
   - RO performance
   - Company performance

3. Inspection Windows:
   - HRS: 2-4 months
   - SRS: 5-8 months
   - LRS: 9-18 months

4. Inspection Types:
   - Initial inspection
   - More detailed inspection
   - Expanded inspection
   - CIC (Concentrated Inspection Campaign)

5. IOMOU Information System:
   - Database for inspection information sharing
   - Connected to other MOU systems

Regional Concerns:
- Security in piracy-affected waters
- ISPS Code compliance
- Crew welfare (MLC 2006)
- Pollution prevention (high traffic shipping lanes)
        """,
        "source": "Indian Ocean MOU Secretariat",
        "last_updated": "2024-01-01",
        "inspection_rate": "Risk-based approach",
        "priority_areas": ["ISPS security", "Piracy countermeasures", "MLC welfare", "Pollution prevention"]
    },
    # Common PSC Inspection Checklist
    {
        "psc_regime": "Common",
        "full_name": "Common PSC Inspection Requirements",
        "region": "Global",
        "member_states": ["All"],
        "content": """
Common Port State Control Inspection Requirements - All Regions

Initial Inspection (Certificate and Document Check):

1. Statutory Certificates:
   □ Certificate of Registry
   □ International Tonnage Certificate (1969)
   □ International Load Line Certificate
   □ Cargo Ship Safety Construction Certificate
   □ Cargo Ship Safety Equipment Certificate
   □ Cargo Ship Safety Radio Certificate
   □ Passenger Ship Safety Certificate (if applicable)
   □ International Oil Pollution Prevention Certificate (IOPP)
   □ International Pollution Prevention Certificate for Carriage of NLS (if applicable)
   □ International Sewage Pollution Prevention Certificate
   □ International Air Pollution Prevention Certificate (IAPP)
   □ International Ballast Water Management Certificate
   □ International Energy Efficiency Certificate
   □ Document of Compliance (DOC)
   □ Safety Management Certificate (SMC)
   □ International Ship Security Certificate (ISSC)
   □ Maritime Labour Certificate (MLC)

2. Other Documents:
   □ Continuous Synopsis Record (CSR)
   □ Minimum Safe Manning Document
   □ Ship Security Plan (available for inspection)
   □ SOPEP / SMPEP
   □ Garbage Management Plan
   □ Ballast Water Management Plan
   □ Fire Control Plan
   □ Muster List
   □ Stability Information
   □ Oil Record Book
   □ Garbage Record Book
   □ Ballast Water Record Book
   □ Cargo Record Book (tankers)
   □ Ship's log book
   □ GMDSS Radio Log

3. Crew Certificates:
   □ Certificates of Competency (original)
   □ Flag State endorsements
   □ STCW certificates (GMDSS, etc.)
   □ Medical certificates
   □ Training record books

4. Operational Verification:
   □ Fire safety equipment
   □ Life-saving appliances
   □ Navigation equipment
   □ Communication equipment
   □ Pollution prevention equipment
   □ Cargo operations (if applicable)
   □ Crew familiarization

Clear Grounds for More Detailed Inspection:
- Missing certificates/documents
- Certificates not valid/expired
- Evidence of crew unfamiliarity with essential procedures
- Deficiencies found during initial inspection
- Cargo operations not in accordance with accepted practice
- Oil sheen around ship
- Previous detention record
- Passenger ship safety concerns
        """,
        "source": "IMO Procedures for PSC 2023",
        "last_updated": "2024-01-01",
        "inspection_rate": "Per regional MOU",
        "priority_areas": ["Certificates validity", "Crew competency", "Safety equipment", "Operational compliance"]
    },
]


# =============================================================================
# REGIONAL REQUIREMENTS DATA
# =============================================================================

REGIONAL_REQUIREMENTS_DATA: List[Dict[str, Any]] = [
    # EU MRV
    {
        "requirement_type": "Emissions Monitoring",
        "requirement_name": "EU MRV",
        "full_name": "EU Monitoring, Reporting and Verification of CO2 Emissions from Maritime Transport",
        "region": "European Union / EEA",
        "content": """
EU MRV Regulation (EU) 2015/757 as amended by Regulation (EU) 2023/957

Scope (from 1 January 2024):
- Ships ≥5000 GT calling at EU/EEA ports for commercial transport of cargo/passengers
- Voyages to, from, and between EU/EEA ports
- From 1 January 2025: Includes general cargo ships 400-5000 GT and offshore ships ≥400 GT

Emissions to Monitor (from 1 January 2024):
- CO2 (carbon dioxide)
- CH4 (methane) - NEW
- N2O (nitrous oxide) - NEW

Monitoring Plan Requirements:
1. Must be verified by accredited verifier before first monitoring period
2. Modifications require re-verification
3. Must include:
   - Ship identification and Company details
   - Emission sources and calculation methods
   - Procedures for data quality assurance
   - Methods to address data gaps

Annual Reporting:
- Report by 31 March each year (for previous calendar year)
- Report must be verified by accredited verifier
- Submission to European Commission via THETIS-MRV

Data to Report:
- CO2, CH4, N2O emissions per voyage and annually
- Fuel consumption and type
- Transport work (for cargo ships)
- Time at sea and in ports
- Average energy efficiency (gCO2/t-nm for cargo ships)

Document of Compliance:
- Issued after successful verification
- Must be carried on board
- Valid from date of issue to 30 June of following reporting period

Penalties:
- Non-compliance may result in expulsion order (denial of entry to EU ports)
- Financial penalties as per Member State legislation

Integration with EU ETS (from 1 January 2024):
- MRV data forms basis for EU ETS allowance calculations
- 40% of verified emissions in 2024
- 70% in 2025
- 100% from 2026
        """,
        "source": "EU Regulation 2015/757, 2023/957",
        "last_updated": "2024-01-01",
        "applicability": "Ships ≥5000 GT calling at EU/EEA ports",
        "required_documents": ["Monitoring Plan", "Annual Emissions Report", "Document of Compliance"]
    },
    # EU ETS Maritime
    {
        "requirement_type": "Emissions Trading",
        "requirement_name": "EU ETS Maritime",
        "full_name": "EU Emissions Trading System - Maritime Transport",
        "region": "European Union",
        "content": """
EU ETS Maritime - Directive (EU) 2023/959

Scope (from 1 January 2024):
- Ships ≥5000 GT
- Voyages within EU, departing from EU, arriving at EU
- CO2 emissions initially, CH4 and N2O added later
- From 2027: Ships 400-5000 GT, offshore vessels

Geographic Coverage:
- 100% of emissions: Voyages between EU ports
- 50% of emissions: Voyages to/from non-EU ports
- At berth in EU ports: 100%

Phase-In Schedule:
- 2024: 40% of verified emissions must be covered by allowances
- 2025: 70% of verified emissions
- 2026 onwards: 100% of verified emissions

Company Obligations:
1. Hold EU ETS account
2. Monitor emissions per EU MRV
3. Report verified emissions by 31 March each year
4. Surrender allowances by 30 September (for previous year's emissions)

Allowance Purchase:
- Through EU carbon market (auction or secondary market)
- Current prices: €60-100 per tonne CO2 (variable)
- Must surrender sufficient allowances or face penalties

Penalties for Non-Compliance:
- €100 per tonne CO2eq for missing allowances (plus surrender obligation)
- After 2 consecutive years non-compliance: potential denial of entry to EU ports

Exemptions:
- Voyages solely for search and rescue
- Outermost regions voyages
- Small islands (certain conditions)
- Ice-class ships (partial)
        """,
        "source": "EU Directive 2023/959",
        "last_updated": "2024-01-01",
        "applicability": "Ships ≥5000 GT on EU voyages",
        "required_documents": ["EU ETS Account Registration", "Verified Emissions Report"]
    },
    # FuelEU Maritime
    {
        "requirement_type": "Fuel Standard",
        "requirement_name": "FuelEU Maritime",
        "full_name": "Regulation on the use of renewable and low-carbon fuels in maritime transport",
        "region": "European Union",
        "content": """
FuelEU Maritime Regulation (EU) 2023/1805 - from 1 January 2025

Scope:
- Ships ≥5000 GT calling at EU ports
- Energy used on voyages to, from, between EU ports
- Energy used at berth in EU ports

GHG Intensity Limits (gCO2eq/MJ):
- 2025: Reference value (approx. 91.16 gCO2eq/MJ)
- 2030: -6% from reference
- 2035: -14.5%
- 2040: -31%
- 2045: -62%
- 2050: -80%

OPS (Onshore Power Supply) Requirements:
- From 2030: Container and passenger ships must use OPS at berth (where available)
- Exemptions for stays <2 hours, emergency situations, OPS incompatibility

Compliance Options:
1. Use compliant fuels (LNG, biofuels, e-fuels, hydrogen, ammonia)
2. Banking: Surplus from previous years
3. Borrowing: Advance compliance from future years (max 2%)
4. Pooling: Aggregate compliance across multiple ships

RFNBO Sub-Quota (Renewable Fuels of Non-Biological Origin):
- From 2034: Minimum 2% RFNBO in fuel mix

Penalties:
- €2,400 per tonne of VLSFO equivalent for non-compliance
- Multiplied by 1.04^(years since 2025)
- After 2 consecutive years: potential denial of entry

FuelEU Document of Compliance:
- Annual verification required
- Issued after compliance demonstrated
- Must be carried on board
        """,
        "source": "EU Regulation 2023/1805",
        "last_updated": "2024-01-01",
        "applicability": "Ships ≥5000 GT calling at EU ports (from 2025)",
        "required_documents": ["FuelEU Monitoring Plan", "FuelEU Document of Compliance"]
    },
    # Emission Control Areas
    {
        "requirement_type": "Emission Control",
        "requirement_name": "ECA/SECA",
        "full_name": "Emission Control Areas / Sulphur Emission Control Areas",
        "region": "Global",
        "content": """
Emission Control Areas (ECAs) - MARPOL Annex VI

SULPHUR EMISSION CONTROL AREAS (SECA):
Fuel sulphur limit: 0.10% m/m (1000 ppm)

1. Baltic Sea SECA:
   - Area: Baltic Sea and Gulf of Bothnia, Gulf of Finland, entrance to the Baltic bounded by Skagen
   - In force since: 2006
   - Applies to: SOx (sulphur oxides) and PM (particulate matter)

2. North Sea SECA:
   - Area: North Sea, English Channel south of 62°N
   - In force since: 2007
   - Applies to: SOx and PM

3. North American ECA:
   - Area: 200 nautical miles from US and Canadian coast (Atlantic, Pacific, Gulf of Mexico, Hawaiian)
   - In force since: 2012 (SOx), 2016 (NOx Tier III)
   - Applies to: SOx, PM, and NOx

4. US Caribbean Sea ECA:
   - Area: Waters around Puerto Rico and US Virgin Islands
   - In force since: 2014
   - Applies to: SOx, PM, and NOx

5. Mediterranean Sea ECA (NEW):
   - Area: Mediterranean Sea and connecting waters
   - SOx/PM effective: 1 May 2025
   - NOx (Tier III): Ships constructed on/after 1 January 2026
   - Applies to: SOx, PM, and NOx (future)

UPCOMING ECAs (from 1 March 2026):
6. Norwegian Sea ECA:
   - SOx and NOx controls

7. Canadian Arctic ECA:
   - SOx and NOx controls

COMPLIANCE OPTIONS:
1. Low Sulphur Fuel Oil (LSFO): 0.10% sulphur content
2. Marine Gas Oil (MGO): Typically <0.10% sulphur
3. LNG (Liquefied Natural Gas): Zero sulphur
4. Scrubbers (EGCS): Exhaust Gas Cleaning Systems
   - Open-loop: May be prohibited in some ports/waters
   - Closed-loop: Washwater treatment required
   - Hybrid: Can operate in both modes

Fuel Changeover Requirements:
- Written fuel changeover procedure required
- Record: date, time, position when changeover complete
- Sufficient time for flush before entering ECA
- Records in log book

NOx EMISSION CONTROL AREAS (NECA):
Tier III NOx limits apply to ships constructed on/after specified dates:
- North American ECA: 1 January 2016
- US Caribbean ECA: 1 January 2016
- Baltic Sea/North Sea: 1 January 2021
- Mediterranean: 1 January 2026 (expected)
        """,
        "source": "MARPOL Annex VI",
        "last_updated": "2024-01-01",
        "applicability": "All ships in designated ECAs",
        "required_documents": ["Bunker Delivery Notes", "Fuel Changeover Procedure", "EGCS Documentation (if fitted)"]
    },
    # China Domestic ECA
    {
        "requirement_type": "Emission Control",
        "requirement_name": "China DECA",
        "full_name": "China Domestic Emission Control Areas",
        "region": "China",
        "content": """
China Domestic Emission Control Areas (DECA)

Scope:
All ships entering designated Chinese waters must use compliant fuel.

DECA Boundaries:
1. Bohai Rim (Bohai Sea): Including waters around Liaoning, Hebei, Tianjin, Shandong
2. Yangtze River Delta: Shanghai and surrounding waters
3. Pearl River Delta: Guangdong coast
4. Hainan Waters: Waters around Hainan Island

Fuel Requirements:
- Within DECA waters: Max 0.50% sulphur (since 1 January 2019)
- Inland river control areas: Max 0.10% sulphur
- At berth (key ports): Max 0.50% sulphur, many require 0.10%

Key Ports with Stricter Requirements:
- Shanghai, Ningbo-Zhoushan, Shenzhen, Guangzhou, Hong Kong
- At berth: Generally 0.10% sulphur required

Compliance Options:
1. Low sulphur fuel oil
2. LNG
3. Shore power (at equipped berths)
4. Approved EGCS (subject to local approval)

Note: Some Chinese ports prohibit open-loop scrubber discharge. Ships should verify local requirements before arrival.

Documentation Required:
- Bunker Delivery Notes showing sulphur content
- Fuel changeover log
- Evidence of compliant fuel on board for entire port stay
        """,
        "source": "China Ministry of Transport",
        "last_updated": "2024-01-01",
        "applicability": "All ships in Chinese DECA waters",
        "required_documents": ["Bunker Delivery Notes", "Fuel Changeover Records"]
    },
]


# =============================================================================
# CUSTOMS AND DOCUMENTATION DATA
# =============================================================================

CUSTOMS_DOCUMENTATION_DATA: List[Dict[str, Any]] = [
    # US Pre-Arrival Requirements
    {
        "requirement_type": "Pre-Arrival Notification",
        "requirement_name": "US NOA",
        "full_name": "United States Notice of Arrival Requirements",
        "country": "United States",
        "content": """
US Notice of Arrival (NOA) Requirements - 33 CFR Part 160

USCG National Vessel Movement Center (NVMC) Requirements:

96-Hour Advance Notice:
Required for vessels:
- Operating in the navigable waters of the US
- Transferring cargo or passengers on the high seas to US vessels
- Entering US port or place

NOA Information Required:
1. Vessel Information:
   - Name, flag, IMO number
   - Call sign, MMSI number
   - Classification society
   - Owner and operator details
   - Gross tonnage, overall length

2. Voyage Information:
   - Last 5 ports of call
   - Port of arrival, estimated arrival date/time
   - Purpose of call
   - Charter party details

3. Cargo Information:
   - Certain dangerous cargo (CDC)
   - Amount and location on board
   - Route through US waters

4. Crew and Passenger Information:
   - Total number of crew and passengers
   - Crew list details (name, DOB, nationality, document numbers)
   - Passenger list for certain vessels

5. Security Information:
   - ISPS security level
   - Last 10 port facility calls with security levels

Submission Methods:
- Electronic submission via eNOAD (electronic Notice of Arrival/Departure)
- Submit at https://enoad.nvmc.uscg.gov

Updates Required:
- If information changes by 4+ hours, update NOA
- If remaining in port >24 hours and information changes

Exemptions:
- Vessels solely on innocent passage
- Vessels in distress (but must comply ASAP)
- Certain government vessels

Penalties:
- Civil penalties for non-compliance
- Denial of port entry
        """,
        "source": "33 CFR Part 160, USCG",
        "last_updated": "2024-01-01",
        "applicability": "All vessels entering US waters",
        "required_documents": ["Electronic NOA submission", "Crew List", "Passenger List", "Cargo Manifest"]
    },
    # EU FAL Requirements
    {
        "requirement_type": "Port Formalities",
        "requirement_name": "EU FAL Directive",
        "full_name": "EU Directive on Reporting Formalities for Ships",
        "country": "European Union",
        "content": """
EU Reporting Formalities Directive 2010/65/EU and European Maritime Single Window (EMSWe)

EMSWe - European Maritime Single Window Environment:
From 15 August 2025: Harmonized digital reporting interface for all EU ports

FAL Forms (IMO Facilitation Convention):
1. FAL Form 1 - General Declaration:
   - Voyage details, ports of call
   - Ship particulars
   - Master's details
   - Cargo summary

2. FAL Form 2 - Cargo Declaration:
   - Description of cargo
   - B/L numbers
   - Marks and numbers
   - Weight/quantity

3. FAL Form 3 - Ship's Stores Declaration:
   - Stores remaining on board
   - Tobacco, alcohol, etc.

4. FAL Form 4 - Crew's Effects Declaration:
   - Personal effects of crew requiring declaration

5. FAL Form 5 - Crew List:
   - Names, nationality, rank
   - Date and place of birth
   - Travel document details

6. FAL Form 6 - Passenger List:
   - Names, nationality
   - Date and place of birth
   - Port of embarkation/disembarkation

7. FAL Form 7 - Dangerous Goods Manifest:
   - UN number, proper shipping name
   - Class, packing group
   - Quantity, stowage location

Pre-Arrival Notification:
- Generally 24 hours before arrival (may vary by port)
- Security notification as per ISPS requirements
- Waste notification (EU Directive 2019/883)

National Single Windows:
Until EMSWe fully operational, submit via national systems:
- SafeSeaNet (maritime surveillance)
- National customs systems
- Port community systems
        """,
        "source": "EU Directive 2010/65/EU, EMSWe Regulation",
        "last_updated": "2024-01-01",
        "applicability": "All ships calling at EU ports",
        "required_documents": ["FAL Forms 1-7", "Pre-arrival notification", "Waste notification"]
    },
    # IMO FAL Convention
    {
        "requirement_type": "Facilitation",
        "requirement_name": "FAL Convention",
        "full_name": "IMO Convention on Facilitation of International Maritime Traffic",
        "country": "Global",
        "content": """
IMO FAL Convention - Facilitation of International Maritime Traffic

Purpose: Facilitate maritime traffic by simplifying and minimizing formalities, documentary requirements and procedures.

Standard Documents:
The following documents should be the MAXIMUM required by public authorities:

For Arrival:
1. General Declaration (FAL Form 1)
2. Cargo Declaration (FAL Form 2)
3. Ship's Stores Declaration (FAL Form 3)
4. Crew's Effects Declaration (FAL Form 4)
5. Crew List (FAL Form 5)
6. Passenger List (FAL Form 6)
7. Dangerous Goods Manifest (FAL Form 7)
8. Maritime Declaration of Health

For Departure:
- Only documents specifically required
- Generally subset of arrival documents

Electronic Data Interchange:
- Single Window concept: One submission point for all requirements
- Pre-arrival information: Allow electronic submission 24-48 hours before arrival
- IMO Compendium on Facilitation and Electronic Business

Key Principles:
1. Public authorities should not require more information than necessary
2. Documents should be accepted in electronic format
3. Biometric data for seafarers per FAL.1/Circ.2
4. Stowaways: Guidelines for allocation of responsibilities (FAL.7/12)

Shore Leave:
- Seafarers should be granted shore leave without visa if ship in port
- Requires valid seafarer identity document
- Port State may impose conditions for security reasons

Certificates and Documents to be Carried:
- FAL.2/Circ.133 (2022): Complete list of IMO-required certificates
- May include 50+ documents depending on ship type and trade
        """,
        "source": "IMO FAL Convention",
        "last_updated": "2024-01-01",
        "applicability": "All ships engaged in international voyages",
        "required_documents": ["FAL Forms 1-7", "Maritime Declaration of Health", "Various certificates per IMO circular"]
    },
    # Customs Documentation General
    {
        "requirement_type": "Customs",
        "requirement_name": "Customs Documentation",
        "full_name": "International Customs Documentation Requirements",
        "country": "Global",
        "content": """
International Customs Documentation Requirements for Ships

Pre-Arrival Cargo Information:

1. Advance Cargo Declaration:
   - US: 24-hour rule (cargo manifest 24 hours before loading at foreign port)
   - EU: Entry Summary Declaration (ENS) in ICS system
   - China: 24-hour advance manifest rule
   - Timing varies by country

2. Import Manifest:
   - Bill of Lading details
   - Consignee information
   - Cargo description, weight, value
   - Country of origin
   - HS codes (Harmonized System commodity codes)

3. Ship's Manifest:
   - Comprehensive list of all cargo on board
   - Including cargo not being discharged at that port

Clearance Documents:

Inward Clearance:
- Last port clearance (pratique)
- Health clearance
- Immigration clearance
- Customs entry
- Agriculture/quarantine clearance (where applicable)

Outward Clearance:
- Customs clearance for departure
- Port clearance document
- Cargo documentation (B/Ls issued)

Specific Requirements:

1. Bill of Lading (B/L):
   - Original or copy as required by customs
   - Must match cargo manifest
   - Electronic B/L increasingly accepted

2. Commercial Invoice:
   - For customs valuation
   - Description matching B/L

3. Packing List:
   - Details of cargo packaging
   - Weights and measurements

4. Certificate of Origin:
   - For preferential tariff rates
   - May require specific format

5. Phytosanitary/Health Certificates:
   - For agricultural products
   - Food safety requirements

6. Dangerous Goods Documentation:
   - IMDG Code compliance
   - Shipper's declaration
   - Container packing certificate

AEO (Authorized Economic Operator):
- Trusted trader programs
- Expedited clearance
- Mutual recognition between countries
        """,
        "source": "WCO, National Customs Authorities",
        "last_updated": "2024-01-01",
        "applicability": "All ships with cargo",
        "required_documents": ["Cargo Manifest", "Bills of Lading", "Commercial Invoice", "Customs Entry Forms"]
    },
    # Complete Ship Certificate List
    {
        "requirement_type": "Certificates",
        "requirement_name": "Complete Certificate List",
        "full_name": "Complete List of Certificates and Documents Required on Ships",
        "country": "Global",
        "content": """
Complete List of Certificates and Documents Required on Ships (per IMO FAL.2/Circ.133)

STATUTORY CERTIFICATES (ALL SHIPS):

1. Registration and Identification:
   □ Certificate of Registry
   □ International Tonnage Certificate (1969)
   □ Continuous Synopsis Record (CSR)

2. SOLAS Certificates:
   □ Passenger Ship Safety Certificate (passengers)
   □ Cargo Ship Safety Construction Certificate
   □ Cargo Ship Safety Equipment Certificate
   □ Cargo Ship Safety Radio Certificate
   □ Exemption Certificate (if applicable)
   □ Record of Equipment (Forms C, E, P, R)

3. Load Line:
   □ International Load Line Certificate
   □ International Load Line Exemption Certificate (if applicable)

4. ISM Code:
   □ Document of Compliance (DOC)
   □ Safety Management Certificate (SMC)

5. ISPS Code:
   □ International Ship Security Certificate (ISSC)

6. MARPOL Certificates:
   □ International Oil Pollution Prevention Certificate (IOPP)
   □ International Pollution Prevention Certificate for NLS (NLS Certificate)
   □ International Sewage Pollution Prevention Certificate (ISPP)
   □ International Air Pollution Prevention Certificate (IAPP)
   □ Engine International Air Pollution Prevention Certificate (EIAPP)
   □ International Energy Efficiency Certificate (IEE)

7. Ballast Water:
   □ International Ballast Water Management Certificate

8. Manning:
   □ Minimum Safe Manning Document

9. MLC 2006:
   □ Maritime Labour Certificate
   □ Declaration of Maritime Labour Compliance (DMLC) Parts I & II

10. Anti-Fouling:
   □ International Anti-Fouling System Certificate

11. Civil Liability:
   □ Certificate of Insurance (CLC 1992) - oil tankers
   □ Bunkers Convention Certificate (2001)
   □ Wreck Removal Convention Certificate (if applicable)

OPERATIONAL DOCUMENTS:

Plans and Manuals:
□ Fire Control Plan
□ Safety Plan (LSA locations)
□ Damage Control Plan
□ Garbage Management Plan
□ Ballast Water Management Plan
□ SOPEP (Shipboard Oil Pollution Emergency Plan)
□ SMPEP (for NLS)
□ Ship Security Plan
□ Stability Information / Booklet
□ Loading Manual
□ SEEMP (Ship Energy Efficiency Management Plan)

Record Books:
□ Official Log Book
□ Oil Record Book (Parts I and II)
□ Cargo Record Book (tankers)
□ Garbage Record Book
□ Ballast Water Record Book
□ Record of Hours of Rest
□ Radio Log / GMDSS Log

Crew Documentation:
□ Certificates of Competency
□ Certificates of Proficiency
□ Flag State Endorsements
□ GMDSS Operator Certificates
□ Medical Certificates
□ Seafarer Identity Documents

Validity Periods:
- Most statutory certificates: 5 years
- Annual/Intermediate surveys required
- Medical certificates: 2 years
- Some documents: No expiry (kept current)
        """,
        "source": "IMO FAL.2/Circ.133",
        "last_updated": "2024-01-01",
        "applicability": "All ships on international voyages",
        "required_documents": ["All certificates listed above based on ship type"]
    },
]


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def create_documents_for_collection(data_list: List[Dict[str, Any]], collection_name: str) -> List[Document]:
    """Convert data dictionaries to LangChain Documents with appropriate metadata."""
    documents = []

    for item in data_list:
        # Build content from the main content field
        content = item.get("content", "")

        # Build metadata
        metadata = {
            "collection": collection_name,
            "created_at": datetime.now().isoformat(),
        }

        # Add all other fields as metadata
        for key, value in item.items():
            if key != "content":
                if isinstance(value, list):
                    metadata[key] = json.dumps(value)
                else:
                    metadata[key] = str(value)

        documents.append(Document(
            page_content=content.strip(),
            metadata=metadata
        ))

    return documents


def main():
    """Main function to load all maritime regulations data into the knowledge base."""
    logger.info("=" * 70)
    logger.info("Maritime Regulations Knowledge Base Loader")
    logger.info("Loading comprehensive maritime compliance data")
    logger.info("=" * 70)

    # Initialize knowledge base
    logger.info("\nInitializing knowledge base...")
    kb = get_maritime_knowledge_base()

    if kb.embeddings is None:
        logger.error("Embeddings not initialized. Check your Google API key.")
        return

    # Show current stats
    logger.info("\nCurrent collection stats:")
    stats = kb.get_collection_stats()
    for name, count in stats.items():
        logger.info(f"  {name}: {count} documents")

    total_added = 0

    # Load IMO Conventions
    logger.info("\n" + "-" * 50)
    logger.info("Loading IMO Conventions data...")
    imo_docs = create_documents_for_collection(IMO_CONVENTIONS_DATA, "imo_conventions")
    logger.info(f"  Created {len(imo_docs)} documents")
    added = kb.add_documents("imo_conventions", imo_docs)
    logger.info(f"  Added {added} documents to imo_conventions")
    total_added += added

    # Load PSC Requirements
    logger.info("\n" + "-" * 50)
    logger.info("Loading Port State Control data...")
    psc_docs = create_documents_for_collection(PSC_REQUIREMENTS_DATA, "psc_requirements")
    logger.info(f"  Created {len(psc_docs)} documents")
    added = kb.add_documents("psc_requirements", psc_docs)
    logger.info(f"  Added {added} documents to psc_requirements")
    total_added += added

    # Load Regional Requirements
    logger.info("\n" + "-" * 50)
    logger.info("Loading Regional Requirements data...")
    regional_docs = create_documents_for_collection(REGIONAL_REQUIREMENTS_DATA, "regional_requirements")
    logger.info(f"  Created {len(regional_docs)} documents")
    added = kb.add_documents("regional_requirements", regional_docs)
    logger.info(f"  Added {added} documents to regional_requirements")
    total_added += added

    # Load Customs Documentation
    logger.info("\n" + "-" * 50)
    logger.info("Loading Customs and Documentation data...")
    customs_docs = create_documents_for_collection(CUSTOMS_DOCUMENTATION_DATA, "customs_documentation")
    logger.info(f"  Created {len(customs_docs)} documents")
    added = kb.add_documents("customs_documentation", customs_docs)
    logger.info(f"  Added {added} documents to customs_documentation")
    total_added += added

    # Final summary
    logger.info("\n" + "=" * 70)
    logger.info("Loading complete!")
    logger.info("=" * 70)

    final_stats = kb.get_collection_stats()
    logger.info("\nFinal collection stats:")
    for name, count in final_stats.items():
        logger.info(f"  {name}: {count} documents")

    logger.info(f"\nTotal documents added this session: {total_added}")

    # Summary of content loaded
    logger.info("\n" + "-" * 50)
    logger.info("Content Summary:")
    logger.info(f"  IMO Conventions: {len(IMO_CONVENTIONS_DATA)} entries")
    logger.info("    - SOLAS (Chapters I, II-1, II-2, III, IV, V, IX, XI-1, XI-2)")
    logger.info("    - MARPOL (Annexes I-VI)")
    logger.info("    - STCW, Load Line, Tonnage, BWM Conventions")
    logger.info(f"  PSC Requirements: {len(PSC_REQUIREMENTS_DATA)} entries")
    logger.info("    - Paris MOU, Tokyo MOU, USCG, Indian Ocean MOU")
    logger.info("    - Common inspection checklist")
    logger.info(f"  Regional Requirements: {len(REGIONAL_REQUIREMENTS_DATA)} entries")
    logger.info("    - EU MRV, EU ETS, FuelEU Maritime")
    logger.info("    - ECA/SECA zones, China DECA")
    logger.info(f"  Customs Documentation: {len(CUSTOMS_DOCUMENTATION_DATA)} entries")
    logger.info("    - US NOA, EU FAL, IMO FAL Convention")
    logger.info("    - Complete certificate list")


if __name__ == "__main__":
    main()
